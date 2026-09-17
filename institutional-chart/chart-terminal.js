// ============================================================================
// TAPEDELTA-STYLE INSTITUTIONAL ORDER-FLOW CHART TERMINAL (PHASE 2)
// High-Performance 60fps Multi-Pane Canvas Engine + Binance Live Order Flow
// Orderbook Depth Heatmap • CVD • Footprint • VRVP • Liquidations • Open Interest
// ============================================================================

'use strict';

// ─── 1. TOP CRYPTO SYMBOL REGISTRY (Binance Top Volume Pairs) ───────────────

const TD_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', decimals: 1, tickSize: 0.1 },
  { symbol: 'ETHUSDT', name: 'Ethereum', decimals: 2, tickSize: 0.01 },
  { symbol: 'SOLUSDT', name: 'Solana', decimals: 3, tickSize: 0.001 },
  { symbol: 'BNBUSDT', name: 'BNB', decimals: 2, tickSize: 0.01 },
  { symbol: 'XRPUSDT', name: 'XRP', decimals: 4, tickSize: 0.0001 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', decimals: 5, tickSize: 0.00001 },
  { symbol: 'ADAUSDT', name: 'Cardano', decimals: 4, tickSize: 0.0001 },
  { symbol: 'AVAXUSDT', name: 'Avalanche', decimals: 3, tickSize: 0.001 },
  { symbol: 'LINKUSDT', name: 'Chainlink', decimals: 3, tickSize: 0.001 },
  { symbol: 'SUIUSDT', name: 'Sui', decimals: 4, tickSize: 0.0001 },
  { symbol: 'NEARUSDT', name: 'NEAR Protocol', decimals: 3, tickSize: 0.001 },
  { symbol: 'OPUSDT', name: 'Optimism', decimals: 3, tickSize: 0.001 },
  { symbol: 'ARBUSDT', name: 'Arbitrum', decimals: 4, tickSize: 0.0001 },
  { symbol: 'APTUSDT', name: 'Aptos', decimals: 3, tickSize: 0.001 },
  { symbol: 'LTCUSDT', name: 'Litecoin', decimals: 2, tickSize: 0.01 },
  { symbol: 'PEPEUSDT', name: 'Pepe', decimals: 7, tickSize: 0.0000001 },
  { symbol: 'SHIBUSDT', name: 'Shiba Inu', decimals: 6, tickSize: 0.000001 },
  { symbol: 'TIAUSDT', name: 'Celestia', decimals: 3, tickSize: 0.001 },
  { symbol: 'INJUSDT', name: 'Injective', decimals: 3, tickSize: 0.001 },
  { symbol: 'RENDERUSDT', name: 'Render', decimals: 3, tickSize: 0.001 }
];

const TD_INTERVALS = [
  { label: '1m', value: '1m', ms: 60000 },
  { label: '5m', value: '5m', ms: 300000 },
  { label: '15m', value: '15m', ms: 900000 },
  { label: '1H', value: '1h', ms: 3600000 },
  { label: '4H', value: '4h', ms: 14400000 },
  { label: '1D', value: '1d', ms: 86400000 }
];

// Helper formatters
function tdFmtPrice(price, dec) {
  if (typeof price !== 'number' || isNaN(price)) return '—';
  return price.toFixed(dec !== undefined ? dec : 2);
}

function tdFmtVol(vol) {
  if (typeof vol !== 'number' || isNaN(vol)) return '—';
  if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
  if (vol >= 10) return vol.toFixed(1);
  return vol.toFixed(2);
}

function tdFmtUSD(usd) {
  if (typeof usd !== 'number' || isNaN(usd)) return '—';
  if (usd >= 1e9) return '$' + (usd / 1e9).toFixed(2) + 'B';
  if (usd >= 1e6) return '$' + (usd / 1e6).toFixed(2) + 'M';
  if (usd >= 1e3) return '$' + (usd / 1e3).toFixed(1) + 'K';
  return '$' + usd.toFixed(0);
}

function tdFmtDate(ts, interval) {
  const d = new Date(ts);
  if (interval === '1d') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

function tdFmtFullDateTime(ts) {
  const d = new Date(ts);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

// ─── 2. MULTI-STREAM MARKET DATA PROVIDER ───────────────────────────────────

class BinanceMarketDataProvider {
  constructor() {
    this.activeSymbol = 'BTCUSDT';
    this.activeInterval = '5m';
    this.destroyed = false;

    // WebSockets
    this.klineWs = null;
    this.depthWs = null;
    this.aggTradeWs = null;
    this.liqWs = null;
    this.oiInterval = null;

    // Reconnection timers
    this.reconnectTimers = {};
    this.reconnectDelays = { kline: 1000, depth: 1000, aggTrade: 1000, liq: 1000 };

    // Active layer states to govern subscriptions
    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false
    };

    // Callbacks
    this.onCandleUpdate = null;
    this.onHistoryLoaded = null;
    this.onDepthUpdate = null;
    this.onAggTrade = null;
    this.onLiquidation = null;
    this.onOpenInterest = null;
    this.onStatusChange = null;
  }

  async connect(symbol, interval, callbacks = {}) {
    this.activeSymbol = symbol.toUpperCase();
    this.activeInterval = interval;
    this.destroyed = false;

    this.onCandleUpdate = callbacks.onCandleUpdate;
    this.onHistoryLoaded = callbacks.onHistoryLoaded;
    this.onDepthUpdate = callbacks.onDepthUpdate;
    this.onAggTrade = callbacks.onAggTrade;
    this.onLiquidation = callbacks.onLiquidation;
    this.onOpenInterest = callbacks.onOpenInterest;
    this.onStatusChange = callbacks.onStatusChange;

    this.setStatus('connecting');

    // 1. Fetch historical candles via REST
    await this.fetchKlines(this.activeSymbol, this.activeInterval);

    // 2. Open live WebSocket streams based on active layers
    this.syncStreams();

    // 3. Initial Open Interest fetch if active
    if (this.layers.oi) {
      this.fetchOpenInterestHistory();
    }
  }

  setLayers(layers) {
    this.layers = { ...this.layers, ...layers };
    this.syncStreams();
  }

  syncStreams() {
    if (this.destroyed) return;

    // Kline Stream (Always active for base chart)
    if (!this.klineWs) {
      this.openKlineStream();
    }

    // Depth Stream (Needed for Heatmap)
    if (this.layers.heatmap) {
      if (!this.depthWs) this.openDepthStream();
    } else {
      this.closeSocket('depth');
    }

    // AggTrade Stream (Needed for CVD & Footprint)
    if (this.layers.cvd || this.layers.footprint) {
      if (!this.aggTradeWs) this.openAggTradeStream();
    } else {
      this.closeSocket('aggTrade');
    }

    // Liquidation Stream (Needed for Liq bubbles)
    if (this.layers.liq) {
      if (!this.liqWs) this.openLiquidationStream();
    } else {
      this.closeSocket('liq');
    }

    // Open Interest Polling
    if (this.layers.oi) {
      if (!this.oiInterval) {
        this.fetchOpenInterestHistory();
        this.fetchCurrentOpenInterest();
        this.oiInterval = setInterval(() => this.fetchCurrentOpenInterest(), 10000);
      }
    } else {
      if (this.oiInterval) {
        clearInterval(this.oiInterval);
        this.oiInterval = null;
      }
    }
  }

  async fetchKlines(symbol, interval) {
    try {
      const endpoints = [
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`,
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=500`
      ];

      let res = null;
      for (const url of endpoints) {
        try {
          res = await fetch(url);
          if (res.ok) break;
        } catch (e) {
          // try next endpoint
        }
      }

      if (!res || !res.ok) throw new Error('Failed to fetch klines from Binance');

      const raw = await res.json();
      if (this.destroyed || this.activeSymbol !== symbol || this.activeInterval !== interval) return;

      const candles = raw.map(k => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        isClosed: true
      }));

      this.onHistoryLoaded?.(candles);
    } catch (err) {
      console.warn('Binance klines fetch warning:', err.message);
    }
  }

  openKlineStream() {
    this.closeSocket('kline');
    const streamName = `${this.activeSymbol.toLowerCase()}@kline_${this.activeInterval}`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      const ws = new WebSocket(url);
      this.klineWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.kline = 1000;
        this.setStatus('live');
      };

      ws.onmessage = (event) => {
        if (this.destroyed) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'kline') {
            const k = msg.k;
            if (k.s.toUpperCase() !== this.activeSymbol) return;
            const candle = {
              time: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isClosed: k.x
            };
            this.onCandleUpdate?.(candle, msg.E);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.klineWs = null;
        if (!this.destroyed) {
          this.setStatus('reconnecting');
          this.scheduleReconnect('kline', () => this.openKlineStream());
        }
      };
      ws.onerror = () => {};
    } catch (err) {
      this.scheduleReconnect('kline', () => this.openKlineStream());
    }
  }

  openDepthStream() {
    this.closeSocket('depth');
    const streamName = `${this.activeSymbol.toLowerCase()}@depth20@100ms`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      const ws = new WebSocket(url);
      this.depthWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.depth = 1000;
      };

      ws.onmessage = (event) => {
        if (this.destroyed || !this.layers.heatmap) return;
        try {
          const msg = JSON.parse(event.data);
          const bids = msg.bids || (msg.b ? msg.b : []);
          const asks = msg.asks || (msg.a ? msg.a : []);
          if (bids.length > 0 || asks.length > 0) {
            this.onDepthUpdate?.(bids, asks);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.depthWs = null;
        if (!this.destroyed && this.layers.heatmap) {
          this.scheduleReconnect('depth', () => this.openDepthStream());
        }
      };
      ws.onerror = () => {};
    } catch (err) {}
  }

  openAggTradeStream() {
    this.closeSocket('aggTrade');
    const streamName = `${this.activeSymbol.toLowerCase()}@aggTrade`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      const ws = new WebSocket(url);
      this.aggTradeWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.aggTrade = 1000;
      };

      ws.onmessage = (event) => {
        if (this.destroyed || (!this.layers.cvd && !this.layers.footprint)) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'aggTrade') {
            const price = parseFloat(msg.p);
            const qty = parseFloat(msg.q);
            const isBuyerMaker = msg.m; // true = taker sell (hit bid); false = taker buy (lift ask)
            const trade = {
              price,
              qty,
              time: msg.T,
              isBuyerMaker,
              delta: isBuyerMaker ? -qty : qty
            };
            this.onAggTrade?.(trade);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.aggTradeWs = null;
        if (!this.destroyed && (this.layers.cvd || this.layers.footprint)) {
          this.scheduleReconnect('aggTrade', () => this.openAggTradeStream());
        }
      };
      ws.onerror = () => {};
    } catch (err) {}
  }

  openLiquidationStream() {
    this.closeSocket('liq');
    // Listen to global forceOrder stream and filter by active symbol
    const url = `wss://fstream.binance.com/ws/!forceOrder@arr`;

    try {
      const ws = new WebSocket(url);
      this.liqWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.liq = 1000;
      };

      ws.onmessage = (event) => {
        if (this.destroyed || !this.layers.liq) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'forceOrder' && msg.o) {
            const o = msg.o;
            if (o.s.toUpperCase() === this.activeSymbol) {
              const price = parseFloat(o.p || o.ap);
              const qty = parseFloat(o.q || o.l);
              const usd = price * qty;
              const liq = {
                id: (msg.E || Date.now()) + '_' + Math.random().toString(36).slice(2, 6),
                time: msg.E || Date.now(),
                price,
                qty,
                usd,
                side: o.S, // 'SELL' = Long position liquidated; 'BUY' = Short position liquidated
                symbol: o.s
              };
              this.onLiquidation?.(liq);
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.liqWs = null;
        if (!this.destroyed && this.layers.liq) {
          this.scheduleReconnect('liq', () => this.openLiquidationStream());
        }
      };
      ws.onerror = () => {};
    } catch (err) {}
  }

  async fetchOpenInterestHistory() {
    try {
      const url = `https://fapi.binance.com/futures/data/openInterestHist?symbol=${this.activeSymbol}&period=5m&limit=60`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const hist = data.map(d => ({
            time: d.timestamp,
            oi: parseFloat(d.sumOpenInterest),
            usdVal: parseFloat(d.sumOpenInterestValue)
          }));
          this.onOpenInterest?.(hist, true);
        }
      }
    } catch (e) {}
  }

  async fetchCurrentOpenInterest() {
    try {
      const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${this.activeSymbol}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        if (d.openInterest) {
          this.onOpenInterest?.([{
            time: d.time || Date.now(),
            oi: parseFloat(d.openInterest),
            usdVal: null
          }], false);
        }
      }
    } catch (e) {}
  }

  scheduleReconnect(key, fn) {
    if (this.destroyed) return;
    clearTimeout(this.reconnectTimers[key]);
    const delay = this.reconnectDelays[key] || 1000;
    this.reconnectTimers[key] = setTimeout(() => {
      fn();
    }, delay);
    this.reconnectDelays[key] = Math.min(delay * 1.8, 20000);
  }

  closeSocket(key) {
    clearTimeout(this.reconnectTimers[key]);
    const prop = key + 'Ws';
    if (this[prop]) {
      this[prop].onopen = null;
      this[prop].onmessage = null;
      this[prop].onerror = null;
      this[prop].onclose = null;
      try { this[prop].close(); } catch (e) {}
      this[prop] = null;
    }
  }

  setStatus(status) {
    this.onStatusChange?.(status);
  }

  disconnect() {
    this.destroyed = true;
    ['kline', 'depth', 'aggTrade', 'liq'].forEach(k => this.closeSocket(k));
    if (this.oiInterval) {
      clearInterval(this.oiInterval);
      this.oiInterval = null;
    }
    this.setStatus('disconnected');
  }
}

// ─── 3. CANDLE STORE & ORDER FLOW AGGREGATOR ────────────────────────────────

class CandleStore {
  constructor() {
    this.candles = [];
    this.maxCandles = 600;

    // Order flow engines state
    this.heatmap = new OrderbookHeatmap();
    this.cvd = new CVDCalculator();
    this.footprint = new FootprintEngine();
    this.vrvp = new VolumeProfileEngine();
    this.liq = new LiquidationTracker();
    this.oi = new OpenInterestTracker();
  }

  setHistory(history, symbolInfo) {
    this.candles = history.slice(-this.maxCandles);
    // Seed CVD and Footprint historical baselines
    this.cvd.seedHistory(this.candles);
    this.footprint.seedHistory(this.candles, symbolInfo);
  }

  updateLive(liveCandle) {
    if (this.candles.length === 0) {
      this.candles.push(liveCandle);
      return;
    }

    const last = this.candles[this.candles.length - 1];
    if (last.time === liveCandle.time) {
      // In-place update of current bar
      last.high = Math.max(last.high, liveCandle.high);
      last.low = Math.min(last.low, liveCandle.low);
      last.close = liveCandle.close;
      last.volume = liveCandle.volume;
      last.isClosed = liveCandle.isClosed;
    } else if (liveCandle.time > last.time) {
      // New candle arrived
      last.isClosed = true;
      this.candles.push(liveCandle);
      if (this.candles.length > this.maxCandles) {
        this.candles.shift();
      }
      this.cvd.onNewCandle(liveCandle);
    }
  }

  onAggTrade(trade, symbolInfo) {
    const latest = this.getLatest();
    if (!latest) return;
    this.cvd.addTrade(trade, latest);
    this.footprint.addTrade(trade, latest, symbolInfo);
  }

  onDepthUpdate(bids, asks) {
    this.heatmap.addDepth(bids, asks);
  }

  onLiquidation(liq) {
    this.liq.add(liq);
  }

  onOpenInterest(data, isHistory) {
    this.oi.update(data, isHistory);
  }

  get(idx) {
    return this.candles[idx] || null;
  }

  get length() {
    return this.candles.length;
  }

  getLatest() {
    return this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
  }
}

// ─── 4A. ORDERBOOK DEPTH HEATMAP MATRIX ─────────────────────────────────────

class OrderbookHeatmap {
  constructor(maxSlices = 80) {
    this.maxSlices = maxSlices;
    this.currentBids = [];
    this.currentAsks = [];
    this.slices = []; // { time, bids: [[p, q]], asks: [[p, q]], maxQty }
  }

  addDepth(bids, asks) {
    const parsedBids = bids.slice(0, 20).map(b => [parseFloat(b[0]), parseFloat(b[1])]);
    const parsedAsks = asks.slice(0, 20).map(a => [parseFloat(a[0]), parseFloat(a[1])]);
    this.currentBids = parsedBids;
    this.currentAsks = parsedAsks;

    let maxQty = 0.0001;
    parsedBids.forEach(b => { if (b[1] > maxQty) maxQty = b[1]; });
    parsedAsks.forEach(a => { if (a[1] > maxQty) maxQty = a[1]; });

    this.slices.push({
      time: Date.now(),
      bids: parsedBids,
      asks: parsedAsks,
      maxQty
    });

    if (this.slices.length > this.maxSlices) {
      this.slices.shift();
    }
  }

  render(ctx, bounds, candleH, chartW, toY) {
    if (this.currentBids.length === 0 && this.currentAsks.length === 0) return;

    let peakQty = 0.0001;
    this.currentBids.forEach(b => { if (b[1] > peakQty) peakQty = b[1]; });
    this.currentAsks.forEach(a => { if (a[1] > peakQty) peakQty = a[1]; });

    ctx.save();

    // 1. Draw Resting Depth Liquidity Heatbands behind candles
    const drawLevels = (levels, isBid) => {
      for (const [price, qty] of levels) {
        if (price < bounds.min || price > bounds.max) continue;
        const y = toY(price);
        const intensity = Math.min(1, qty / peakQty);

        // Heatmap color gradient: navy -> purple -> cyan -> gold -> white
        let grad;
        if (intensity < 0.25) {
          grad = `rgba(30, 41, 59, ${0.12 + intensity * 0.4})`;
        } else if (intensity < 0.55) {
          grad = `rgba(99, 102, 241, ${0.20 + intensity * 0.5})`;
        } else if (intensity < 0.85) {
          grad = `rgba(6, 182, 212, ${0.35 + intensity * 0.4})`;
        } else {
          grad = `rgba(245, 158, 11, ${0.45 + intensity * 0.4})`;
        }

        ctx.fillStyle = grad;
        // Horizontal band across chart fading towards left
        const h = Math.max(2, Math.round(candleH * 0.012));
        ctx.fillRect(0, Math.round(y - h / 2), chartW, h);
      }
    };

    drawLevels(this.currentBids, true);
    drawLevels(this.currentAsks, false);

    // 2. Draw Live Orderbook Ladder Bar Meter on Price Edge
    const ladderW = 44;
    const ladderX = chartW - ladderW;

    this.currentBids.forEach(([price, qty]) => {
      if (price >= bounds.min && price <= bounds.max) {
        const y = toY(price);
        const w = (qty / peakQty) * ladderW;
        ctx.fillStyle = 'rgba(14, 203, 129, 0.4)';
        ctx.fillRect(chartW - w, y - 2, w, 4);
      }
    });

    this.currentAsks.forEach(([price, qty]) => {
      if (price >= bounds.min && price <= bounds.max) {
        const y = toY(price);
        const w = (qty / peakQty) * ladderW;
        ctx.fillStyle = 'rgba(246, 70, 93, 0.4)';
        ctx.fillRect(chartW - w, y - 2, w, 4);
      }
    });

    ctx.restore();
  }
}

// ─── 4B. CVD (CUMULATIVE VOLUME DELTA) CALCULATOR ────────────────────────────

class CVDCalculator {
  constructor() {
    this.candleDeltas = new Map(); // time -> { buyVol, sellVol, delta, cvd }
    this.cumulativeDelta = 0;
  }

  seedHistory(candles) {
    this.candleDeltas.clear();
    this.cumulativeDelta = 0;

    for (const c of candles) {
      const isUp = c.close >= c.open;
      const range = c.high - c.low || 1;
      const ratio = (c.close - c.open) / range;
      const buyVol = Math.max(0, (c.volume * (1 + ratio * 0.8)) / 2);
      const sellVol = Math.max(0, c.volume - buyVol);
      const delta = buyVol - sellVol;

      this.cumulativeDelta += delta;
      this.candleDeltas.set(c.time, {
        buyVol,
        sellVol,
        delta,
        cvd: this.cumulativeDelta
      });
    }
  }

  addTrade(trade, currentCandle) {
    if (!currentCandle) return;
    let cd = this.candleDeltas.get(currentCandle.time);
    if (!cd) {
      cd = {
        buyVol: 0,
        sellVol: 0,
        delta: 0,
        cvd: this.cumulativeDelta
      };
      this.candleDeltas.set(currentCandle.time, cd);
    }

    if (trade.isBuyerMaker) {
      cd.sellVol += trade.qty;
      cd.delta -= trade.qty;
      this.cumulativeDelta -= trade.qty;
    } else {
      cd.buyVol += trade.qty;
      cd.delta += trade.qty;
      this.cumulativeDelta += trade.qty;
    }
    cd.cvd = this.cumulativeDelta;
  }

  onNewCandle(newCandle) {
    this.candleDeltas.set(newCandle.time, {
      buyVol: 0,
      sellVol: 0,
      delta: 0,
      cvd: this.cumulativeDelta
    });
  }

  renderPane(ctx, visible, candleW, topY, paneH, chartW, colors) {
    if (visible.length === 0 || paneH <= 10) return;

    let minCvd = Infinity;
    let maxCvd = -Infinity;

    const points = [];
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const d = this.candleDeltas.get(c.time) || { cvd: 0, delta: 0 };
      if (d.cvd < minCvd) minCvd = d.cvd;
      if (d.cvd > maxCvd) maxCvd = d.cvd;
      const cx = i * candleW + candleW / 2;
      points.push({ x: cx, cvd: d.cvd, delta: d.delta });
    }

    const pad = (maxCvd - minCvd) * 0.1 || 10;
    minCvd -= pad;
    maxCvd += pad;
    const cvdRange = maxCvd - minCvd || 1;

    const cvdToY = (val) => topY + (1 - (val - minCvd) / cvdRange) * (paneH - 6);

    ctx.save();

    // 1. Pane Separator
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(chartW, topY);
    ctx.stroke();

    // 2. Zero Baseline (if within visible range)
    if (minCvd <= 0 && maxCvd >= 0) {
      const zY = cvdToY(0);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, zY);
      ctx.lineTo(chartW, zY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. CVD Gradient Area Fill
    if (points.length > 1) {
      const zeroY = Math.min(topY + paneH, Math.max(topY, cvdToY(0)));
      ctx.beginPath();
      ctx.moveTo(points[0].x, zeroY);
      for (const p of points) {
        ctx.lineTo(p.x, cvdToY(p.cvd));
      }
      ctx.lineTo(points[points.length - 1].x, zeroY);
      ctx.closePath();

      const lastPoint = points[points.length - 1];
      const grad = ctx.createLinearGradient(0, topY, 0, topY + paneH);
      if (lastPoint.cvd >= 0) {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
      } else {
        grad.addColorStop(0, 'rgba(246, 70, 93, 0.01)');
        grad.addColorStop(1, 'rgba(246, 70, 93, 0.28)');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // 4. CVD Main Polyline
      ctx.beginPath();
      ctx.moveTo(points[0].x, cvdToY(points[0].cvd));
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, cvdToY(points[i].cvd));
      }
      ctx.strokeStyle = lastPoint.cvd >= 0 ? colors.up : colors.down;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 5. Header Tag
    const latestCvd = points.length > 0 ? points[points.length - 1].cvd : 0;
    const latestDelta = points.length > 0 ? points[points.length - 1].delta : 0;
    const isUp = latestCvd >= 0;

    ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CVD', 12, topY + 14);

    ctx.fillStyle = isUp ? colors.up : colors.down;
    ctx.font = 'bold 10px monospace';
    const tag = `${latestCvd >= 0 ? '+' : ''}${tdFmtVol(latestCvd)} (Bar: ${latestDelta >= 0 ? '+' : ''}${tdFmtVol(latestDelta)})`;
    ctx.fillText(tag, 40, topY + 14);

    ctx.restore();
  }
}

// ─── 4C. FOOTPRINT CHART ENGINE (BID/ASK CLUSTERS & POC) ─────────────────────

class FootprintEngine {
  constructor() {
    this.candles = new Map(); // time -> { buckets: Map(priceKey -> { bid, ask, total }), pocPrice }
  }

  seedHistory(candles, symbolInfo) {
    this.candles.clear();
    const tick = symbolInfo.tickSize || 0.1;

    for (const c of candles) {
      const range = c.high - c.low || tick * 5;
      const bucketStep = Math.max(tick, range / 14);
      const buckets = new Map();
      let maxVol = 0;
      let pocPrice = c.close;

      const steps = Math.min(22, Math.max(4, Math.round(range / bucketStep)));
      const volPerStep = c.volume / steps;
      const isUp = c.close >= c.open;

      for (let s = 0; s < steps; s++) {
        const p = c.low + s * bucketStep;
        const pKey = Math.round(p / tick) * tick;
        const ratio = s / steps;
        const buyWeight = isUp ? (0.4 + ratio * 0.5) : (0.7 - ratio * 0.4);
        const ask = volPerStep * buyWeight;
        const bid = volPerStep * (1 - buyWeight);
        const total = bid + ask;

        if (total > maxVol) {
          maxVol = total;
          pocPrice = pKey;
        }

        buckets.set(pKey, { bid, ask, total });
      }

      this.candles.set(c.time, { buckets, pocPrice, maxVol });
    }
  }

  addTrade(trade, currentCandle, symbolInfo) {
    if (!currentCandle) return;
    const tick = symbolInfo.tickSize || 0.1;
    let data = this.candles.get(currentCandle.time);
    if (!data) {
      data = { buckets: new Map(), pocPrice: trade.price, maxVol: 0 };
      this.candles.set(currentCandle.time, data);
    }

    const range = Math.max(tick * 5, currentCandle.high - currentCandle.low);
    const bucketStep = Math.max(tick, range / 16);
    const pKey = Math.floor(trade.price / bucketStep) * bucketStep;

    let b = data.buckets.get(pKey);
    if (!b) {
      b = { bid: 0, ask: 0, total: 0 };
      data.buckets.set(pKey, b);
    }

    if (trade.isBuyerMaker) {
      b.bid += trade.qty;
    } else {
      b.ask += trade.qty;
    }
    b.total = b.bid + b.ask;

    if (b.total > data.maxVol) {
      data.maxVol = b.total;
      data.pocPrice = pKey;
    }
  }

  renderCandle(ctx, candle, x, candleW, toY, bounds, colors) {
    const data = this.candles.get(candle.time);
    if (!data || data.buckets.size === 0) return;

    const bodyW = candleW * 0.88;
    const leftX = x + (candleW - bodyW) / 2;
    const midX = leftX + bodyW / 2;
    const rightX = leftX + bodyW;
    const halfW = bodyW / 2;

    ctx.save();

    for (const [price, b] of data.buckets.entries()) {
      if (price < bounds.min || price > bounds.max) continue;
      const y = toY(price);
      const rowH = Math.max(3, Math.min(24, Math.abs(toY(price) - toY(price + (bounds.range / 50)))));
      const topY = Math.round(y - rowH / 2);

      // Bid volume left half (Red intensity)
      const bidAlpha = Math.min(0.8, 0.1 + (b.bid / (data.maxVol || 1)) * 0.7);
      ctx.fillStyle = `rgba(246, 70, 93, ${bidAlpha})`;
      ctx.fillRect(leftX, topY, halfW - 1, rowH);

      // Ask volume right half (Green intensity)
      const askAlpha = Math.min(0.8, 0.1 + (b.ask / (data.maxVol || 1)) * 0.7);
      ctx.fillStyle = `rgba(14, 203, 129, ${askAlpha})`;
      ctx.fillRect(midX, topY, halfW, rowH);

      // POC highlight box (Golden outline)
      if (Math.abs(price - data.pocPrice) < bounds.range / 150) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(leftX, topY, bodyW, rowH);
      }

      // Render Text if zoomed in enough
      if (candleW >= 55 && rowH >= 9) {
        ctx.font = '8px monospace';

        // Bid volume text
        ctx.textAlign = 'right';
        const isBidImbalance = b.bid >= b.ask * 3 && b.bid > 0.1;
        ctx.fillStyle = isBidImbalance ? '#fb7185' : '#e2e8f0';
        ctx.fillText(tdFmtVol(b.bid), midX - 3, y + 2.5);

        // Ask volume text
        ctx.textAlign = 'left';
        const isAskImbalance = b.ask >= b.bid * 3 && b.ask > 0.1;
        ctx.fillStyle = isAskImbalance ? '#38bdf8' : '#e2e8f0';
        ctx.fillText(tdFmtVol(b.ask), midX + 3, y + 2.5);
      }
    }

    ctx.restore();
  }
}

// ─── 4D. VISIBLE RANGE VOLUME PROFILE (VRVP) ENGINE ─────────────────────────

class VolumeProfileEngine {
  constructor() {
    this.binsCount = 70;
    this.profile = null; // { bins: [{ p, buy, sell, total }], pocPrice, vah, val }
  }

  compute(visible, bounds) {
    if (visible.length === 0 || bounds.range <= 0) return null;

    const binStep = bounds.range / this.binsCount;
    const bins = [];
    for (let i = 0; i < this.binsCount; i++) {
      bins.push({
        p: bounds.min + i * binStep,
        buy: 0,
        sell: 0,
        total: 0
      });
    }

    let totalProfileVol = 0;
    for (const c of visible) {
      const isUp = c.close >= c.open;
      const cRange = c.high - c.low || binStep;
      const cBins = Math.max(1, Math.round(cRange / binStep));
      const volPerBin = c.volume / cBins;

      for (let i = 0; i < this.binsCount; i++) {
        const bp = bins[i].p;
        if (bp >= c.low && bp <= c.high) {
          const buy = isUp ? volPerBin * 0.6 : volPerBin * 0.4;
          const sell = volPerBin - buy;
          bins[i].buy += buy;
          bins[i].sell += sell;
          bins[i].total += volPerBin;
          totalProfileVol += volPerBin;
        }
      }
    }

    // Find POC
    let maxTotal = 0;
    let pocIdx = 0;
    for (let i = 0; i < bins.length; i++) {
      if (bins[i].total > maxTotal) {
        maxTotal = bins[i].total;
        pocIdx = i;
      }
    }

    // Calculate 70% Value Area (VAH & VAL)
    const targetVA = totalProfileVol * 0.70;
    let curVA = bins[pocIdx].total;
    let upIdx = pocIdx;
    let downIdx = pocIdx;

    while (curVA < targetVA && (upIdx < bins.length - 1 || downIdx > 0)) {
      const nextUp = upIdx < bins.length - 1 ? bins[upIdx + 1].total : 0;
      const nextDown = downIdx > 0 ? bins[downIdx - 1].total : 0;

      if (nextUp >= nextDown && upIdx < bins.length - 1) {
        upIdx++;
        curVA += bins[upIdx].total;
      } else if (downIdx > 0) {
        downIdx--;
        curVA += bins[downIdx].total;
      } else if (upIdx < bins.length - 1) {
        upIdx++;
        curVA += bins[upIdx].total;
      } else {
        break;
      }
    }

    this.profile = {
      bins,
      maxTotal: maxTotal || 1,
      pocPrice: bins[pocIdx].p,
      vah: bins[upIdx].p,
      val: bins[downIdx].p,
      upIdx,
      downIdx
    };

    return this.profile;
  }

  render(ctx, bounds, candleH, chartW, toY, symbolInfo) {
    if (!this.profile) return;
    const { bins, maxTotal, pocPrice, vah, val, upIdx, downIdx } = this.profile;

    ctx.save();
    const profileW = 120;
    const startX = chartW;

    // 1. Shaded Value Area Background
    const vahY = toY(vah);
    const valY = toY(val);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.fillRect(0, Math.min(vahY, valY), chartW, Math.abs(valY - vahY));

    // 2. Volume Profile Histogram Bars along Right Edge
    const binH = Math.max(1.5, (candleH / this.binsCount) * 0.92);
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i];
      const y = toY(b.p);
      const isVA = i >= downIdx && i <= upIdx;

      const totalBarW = (b.total / maxTotal) * profileW;
      const buyBarW = (b.buy / (b.total || 1)) * totalBarW;
      const sellBarW = totalBarW - buyBarW;

      // Buy side (emerald)
      ctx.fillStyle = isVA ? 'rgba(14, 203, 129, 0.55)' : 'rgba(14, 203, 129, 0.22)';
      ctx.fillRect(startX - totalBarW, y - binH / 2, buyBarW, binH);

      // Sell side (crimson)
      ctx.fillStyle = isVA ? 'rgba(246, 70, 93, 0.55)' : 'rgba(246, 70, 93, 0.22)';
      ctx.fillRect(startX - totalBarW + buyBarW, y - binH / 2, sellBarW, binH);
    }

    // 3. Horizontal Reference Lines (POC, VAH, VAL)
    // POC (Golden/Orange)
    const pocY = toY(pocPrice);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, pocY);
    ctx.lineTo(chartW, pocY);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9.5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`POC ${tdFmtPrice(pocPrice, symbolInfo.decimals)}`, chartW - profileW - 8, pocY - 3);

    // VAH (Cyan dashed)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, vahY);
    ctx.lineTo(chartW, vahY);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px monospace';
    ctx.fillText(`VAH ${tdFmtPrice(vah, symbolInfo.decimals)}`, chartW - profileW - 8, vahY - 3);

    // VAL (Cyan dashed)
    ctx.beginPath();
    ctx.moveTo(0, valY);
    ctx.lineTo(chartW, valY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillText(`VAL ${tdFmtPrice(val, symbolInfo.decimals)}`, chartW - profileW - 8, valY + 11);

    ctx.restore();
  }
}

// ─── 4E. LIQUIDATION TRACKER & MARKERS ──────────────────────────────────────

class LiquidationTracker {
  constructor() {
    this.events = []; // { id, time, price, qty, usd, side, symbol }
    this.maxEvents = 200;
  }

  add(liq) {
    this.events.push(liq);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  getVisibleEvents(visible) {
    if (visible.length === 0 || this.events.length === 0) return [];
    const minTime = visible[0].time;
    const maxTime = visible[visible.length - 1].time + 60000;
    return this.events.filter(e => e.time >= minTime && e.time <= maxTime);
  }

  render(ctx, visible, candleW, toY, colors) {
    const evs = this.getVisibleEvents(visible);
    if (evs.length === 0) return;

    ctx.save();
    for (const e of evs) {
      // Find X corresponding to event timestamp
      let cIdx = 0;
      for (let i = 0; i < visible.length; i++) {
        if (visible[i].time <= e.time) cIdx = i;
        else break;
      }

      const x = cIdx * candleW + candleW / 2;
      const y = toY(e.price);

      // Bubble radius scales with USD value (min 4px, max 20px)
      const r = Math.max(4, Math.min(20, Math.log10(Math.max(1000, e.usd) / 500) * 5.2));
      const isLongLiq = e.side === 'SELL'; // Long liquidated = Forced Sell

      // Pulsing outer aura ring
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = isLongLiq ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      // Main core circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isLongLiq ? 'rgba(244, 63, 94, 0.88)' : 'rgba(16, 185, 129, 0.88)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // Whale label
      if (e.usd >= 75000) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tdFmtUSD(e.usd), x, y - r - 3);
      }
    }
    ctx.restore();
  }
}

// ─── 4F. OPEN INTEREST (OI) TRACKER ─────────────────────────────────────────

class OpenInterestTracker {
  constructor() {
    this.history = []; // { time, oi, usdVal }
    this.latest = null;
  }

  update(data, isHistory) {
    if (isHistory) {
      this.history = data.sort((a, b) => a.time - b.time);
      if (this.history.length > 0) {
        this.latest = this.history[this.history.length - 1];
      }
    } else {
      for (const d of data) {
        this.history.push(d);
        this.latest = d;
      }
      if (this.history.length > 150) {
        this.history.shift();
      }
    }
  }

  renderPane(ctx, visible, candleW, topY, paneH, chartW, colors) {
    if (visible.length === 0 || paneH <= 10 || this.history.length === 0) return;

    let minOi = Infinity;
    let maxOi = -Infinity;

    // Map OI points to visible candles
    const points = [];
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      let match = null;
      for (const h of this.history) {
        if (h.time <= c.time) match = h;
        else break;
      }
      if (!match && this.history.length > 0) match = this.history[0];

      if (match) {
        if (match.oi < minOi) minOi = match.oi;
        if (match.oi > maxOi) maxOi = match.oi;
        points.push({ x: i * candleW + candleW / 2, oi: match.oi, usd: match.usdVal });
      }
    }

    if (points.length === 0) return;

    const pad = (maxOi - minOi) * 0.1 || 100;
    minOi -= pad;
    maxOi += pad;
    const oiRange = maxOi - minOi || 1;

    const oiToY = (val) => topY + (1 - (val - minOi) / oiRange) * (paneH - 6);

    ctx.save();

    // 1. Pane Divider
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(chartW, topY);
    ctx.stroke();

    // 2. OI Gradient Area
    ctx.beginPath();
    ctx.moveTo(points[0].x, topY + paneH);
    for (const p of points) {
      ctx.lineTo(p.x, oiToY(p.oi));
    }
    ctx.lineTo(points[points.length - 1].x, topY + paneH);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, topY, 0, topY + paneH);
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
    grad.addColorStop(1, 'rgba(168, 85, 247, 0.01)');
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Polyline
    ctx.beginPath();
    ctx.moveTo(points[0].x, oiToY(points[0].oi));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, oiToY(points[i].oi));
    }
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 4. Header Badge
    const cur = this.latest ? this.latest.oi : points[points.length - 1].oi;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('OI', 12, topY + 14);

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 10px monospace';
    const tag = `${tdFmtVol(cur)} contracts (${this.latest?.usdVal ? tdFmtUSD(this.latest.usdVal) : 'Live'})`;
    ctx.fillText(tag, 32, topY + 14);

    ctx.restore();
  }
}

// ─── 5. DUAL-CANVAS RENDERING ENGINE ────────────────────────────────────────

class DualCanvasChart {
  constructor(container, store, symbolInfo, interval) {
    this.container = container;
    this.store = store;
    this.symbolInfo = symbolInfo;
    this.interval = interval;

    // View state
    this.visibleCandles = 75;
    this.scrollOffset = 0; // 0 = rightmost
    this.priceAxisW = 76;
    this.timeAxisH = 24;

    // Active order-flow layers
    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false
    };

    // Interaction state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartOffset = 0;
    this.crosshair = null; // { x, y }

    // Theme Colors
    this.colors = {};
    this.updateTheme();

    this.setupCanvases();
    this.bindEvents();

    this.themeObserver = new MutationObserver(() => {
      this.updateTheme();
      this.requestRender();
      this.renderOverlay();
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  updateTheme() {
    const isLight = document.documentElement.classList.contains('light');
    if (isLight) {
      this.colors = {
        bg: '#ffffff',
        grid: 'rgba(226, 232, 240, 0.8)',
        textAxis: '#64748b',
        textAxisHighlight: '#0f172a',
        axisBg: '#f8fafc',
        up: '#10b981',
        upDim: 'rgba(16, 185, 129, 0.35)',
        down: '#ef4444',
        downDim: 'rgba(239, 68, 68, 0.35)',
        crosshair: 'rgba(100, 116, 139, 0.5)',
        curPriceLine: 'rgba(2, 132, 199, 0.85)'
      };
    } else {
      this.colors = {
        bg: '#07090e',
        grid: 'rgba(26, 32, 44, 0.65)',
        textAxis: '#64748b',
        textAxisHighlight: '#f8fafc',
        axisBg: '#0c0f17',
        up: '#0ecb81',
        upDim: 'rgba(14, 203, 129, 0.45)',
        down: '#f6465d',
        downDim: 'rgba(246, 70, 93, 0.45)',
        crosshair: 'rgba(148, 163, 184, 0.5)',
        curPriceLine: 'rgba(56, 189, 248, 0.75)'
      };
    }
  }

  setupCanvases() {
    this.container.innerHTML = `
      <canvas class="td-canvas-base"></canvas>
      <canvas class="td-canvas-overlay"></canvas>
      <div class="td-liq-tooltip" id="td-liq-tooltip"></div>
      <div class="td-footprint-hint" id="td-footprint-hint" style="display:none;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        Zoom in (≤45 candles) to inspect bid/ask footprint clusters
      </div>
    `;

    this.baseCanvas = this.container.querySelector('.td-canvas-base');
    this.overlayCanvas = this.container.querySelector('.td-canvas-overlay');
    this.liqTooltip = this.container.querySelector('#td-liq-tooltip');
    this.footprintHint = this.container.querySelector('#td-footprint-hint');

    this.baseCtx = this.baseCanvas.getContext('2d');
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    this.resize();
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.requestRender();
    });
    this.resizeObserver.observe(this.container);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;

    this.dpr = window.devicePixelRatio || 1;
    this.w = w;
    this.h = h;

    [this.baseCanvas, this.overlayCanvas].forEach(c => {
      c.width = w * this.dpr;
      c.height = h * this.dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    });

    this.baseCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.overlayCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.chartW = Math.max(10, w - this.priceAxisW);
    this.chartH = Math.max(10, h - this.timeAxisH);

    // Multi-Pane Vertical Partitioning
    const hasCvd = this.layers.cvd;
    const hasOi = this.layers.oi;
    const activeSubPanes = (hasCvd ? 1 : 0) + (hasOi ? 1 : 0);

    if (activeSubPanes === 0) {
      this.candleH = Math.floor(this.chartH * 0.82);
      this.volH = this.chartH - this.candleH;
      this.volTop = this.candleH;
      this.cvdH = 0;
      this.cvdTop = 0;
      this.oiH = 0;
      this.oiTop = 0;
    } else if (activeSubPanes === 1) {
      this.candleH = Math.floor(this.chartH * 0.64);
      this.volH = Math.floor(this.chartH * 0.14);
      this.volTop = this.candleH;
      const subH = this.chartH - this.candleH - this.volH;
      if (hasCvd) {
        this.cvdH = subH;
        this.cvdTop = this.candleH + this.volH;
        this.oiH = 0;
        this.oiTop = 0;
      } else {
        this.oiH = subH;
        this.oiTop = this.candleH + this.volH;
        this.cvdH = 0;
        this.cvdTop = 0;
      }
    } else {
      // Both CVD and OI active
      this.candleH = Math.floor(this.chartH * 0.52);
      this.volH = Math.floor(this.chartH * 0.12);
      this.volTop = this.candleH;
      const rem = this.chartH - this.candleH - this.volH;
      this.cvdH = Math.floor(rem * 0.52);
      this.cvdTop = this.candleH + this.volH;
      this.oiH = rem - this.cvdH;
      this.oiTop = this.cvdTop + this.cvdH;
    }
  }

  bindEvents() {
    const el = this.overlayCanvas;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const candleW = this.chartW / this.visibleCandles;
        const deltaCandles = Math.round(dx / candleW);
        this.scrollOffset = Math.max(0, Math.min(this.store.length - 10, this.dragStartOffset + deltaCandles));
        this.requestRender();
      }

      this.crosshair = { x, y };
      this.renderOverlay();
      this.updateTooltip(x);
      this.checkLiquidationHover(x, y, e.clientX, e.clientY);
    });

    el.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.crosshair = null;
      this.renderOverlay();
      this.onHoverCandle?.(null);
      if (this.liqTooltip) this.liqTooltip.style.display = 'none';
    });

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartOffset = this.scrollOffset;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch Support
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
        this.dragStartOffset = this.scrollOffset;
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.dragStartX;
        const candleW = this.chartW / this.visibleCandles;
        const deltaCandles = Math.round(dx / candleW);
        this.scrollOffset = Math.max(0, Math.min(this.store.length - 10, this.dragStartOffset + deltaCandles));
        this.requestRender();
      }
    }, { passive: true });

    el.addEventListener('touchend', () => {
      this.isDragging = false;
    }, { passive: true });

    // Wheel -> Zoom
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? 3 : -3;
      this.visibleCandles = Math.max(10, Math.min(400, this.visibleCandles + step));
      this.requestRender();
      this.renderOverlay();
      this.updateFootprintHint();
    }, { passive: false });

    el.addEventListener('dblclick', () => {
      this.resetView();
    });
  }

  updateFootprintHint() {
    if (this.layers.footprint && this.visibleCandles > 45) {
      if (this.footprintHint) this.footprintHint.style.display = 'flex';
    } else {
      if (this.footprintHint) this.footprintHint.style.display = 'none';
    }
  }

  resetView() {
    this.visibleCandles = 75;
    this.scrollOffset = 0;
    this.requestRender();
    this.renderOverlay();
    this.updateFootprintHint();
  }

  getVisibleRange() {
    const total = this.store.length;
    if (total === 0) return { visible: [], startIdx: 0, endIdx: 0 };

    const endIdx = Math.max(0, total - this.scrollOffset);
    const startIdx = Math.max(0, endIdx - this.visibleCandles);
    const visible = this.store.candles.slice(startIdx, endIdx);

    return { visible, startIdx, endIdx };
  }

  getPriceBounds(visible) {
    if (visible.length === 0) return { min: 0, max: 1, range: 1, maxVol: 1 };

    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    for (const c of visible) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    const padding = (max - min) * 0.08 || 1;
    min -= padding;
    max += padding;

    return { min, max, range: max - min, maxVol: maxVol || 1 };
  }

  requestRender() {
    if (!this._renderQueued) {
      this._renderQueued = true;
      requestAnimationFrame(() => {
        this._renderQueued = false;
        this.renderBase();
      });
    }
  }

  // ─── Base Canvas Render ───────────────────────────────────────────────────

  renderBase() {
    const { baseCtx: ctx, w, h } = this;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    const { visible } = this.getVisibleRange();
    if (visible.length === 0) {
      ctx.fillStyle = this.colors.textAxis;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Connecting to Binance live feed...', this.chartW / 2, this.chartH / 2);
      return;
    }

    const bounds = this.getPriceBounds(visible);
    const candleW = this.chartW / this.visibleCandles;
    const bodyW = Math.max(1, candleW * 0.72);
    const gap = (candleW - bodyW) / 2;

    const toY = (price) => (1 - (price - bounds.min) / bounds.range) * this.candleH;
    const volToH = (vol) => (vol / bounds.maxVol) * (this.volH - 6);

    // 1. Gridlines
    this.drawGrid(ctx, bounds.min, bounds.max, toY);

    // 2. Orderbook Depth Heatmap Layer (Behind candles)
    if (this.layers.heatmap) {
      this.store.heatmap.render(ctx, bounds, this.candleH, this.chartW, toY);
    }

    // 3. VRVP (Visible Range Volume Profile)
    if (this.layers.vrvp) {
      this.store.vrvp.compute(visible, bounds);
      this.store.vrvp.render(ctx, bounds, this.candleH, this.chartW, toY, this.symbolInfo);
    }

    // 4. Candlesticks / Footprint Clusters
    const isFootprintZoomed = this.layers.footprint && this.visibleCandles <= 45;

    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = i * candleW;
      const isUp = c.close >= c.open;
      const color = isUp ? this.colors.up : this.colors.down;

      if (isFootprintZoomed) {
        // Footprint Mode
        this.store.footprint.renderCandle(ctx, c, x, candleW, toY, bounds, this.colors);
      } else {
        // Standard Candlestick Mode
        // Wick
        const wickX = Math.round(x + candleW / 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wickX, Math.round(toY(c.high)));
        ctx.lineTo(wickX, Math.round(toY(c.low)));
        ctx.stroke();

        // Body
        const topY = Math.round(toY(Math.max(c.open, c.close)));
        const botY = Math.round(toY(Math.min(c.open, c.close)));
        const bH = Math.max(1, botY - topY);

        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x + gap), topY, Math.round(bodyW), bH);
      }

      // Volume Bar in Volume Sub-Pane
      const vH = volToH(c.volume);
      const vY = this.volTop + this.volH - vH;
      ctx.fillStyle = isUp ? this.colors.upDim : this.colors.downDim;
      ctx.fillRect(Math.round(x + gap), vY, Math.round(bodyW), vH);
    }

    // 5. Liquidation Markers
    if (this.layers.liq) {
      this.store.liq.render(ctx, visible, candleW, toY, this.colors);
    }

    // 6. Sub-Panes
    // Volume Pane Separator
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.volTop);
    ctx.lineTo(this.chartW, this.volTop);
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('VOL', 12, this.volTop + 13);

    // CVD Sub-Pane
    if (this.layers.cvd && this.cvdH > 10) {
      this.store.cvd.renderPane(ctx, visible, candleW, this.cvdTop, this.cvdH, this.chartW, this.colors);
    }

    // Open Interest Sub-Pane
    if (this.layers.oi && this.oiH > 10) {
      this.store.oi.renderPane(ctx, visible, candleW, this.oiTop, this.oiH, this.chartW, this.colors);
    }

    // 7. Axes
    this.drawAxes(ctx, bounds.min, bounds.max, toY, visible, candleW);

    // 8. Current Price Tag on Axis
    const latest = this.store.getLatest();
    if (latest) {
      const lpY = toY(latest.close);
      const isUp = latest.close >= latest.open;
      ctx.fillStyle = isUp ? this.colors.up : this.colors.down;
      ctx.fillRect(this.chartW, lpY - 10, this.priceAxisW, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tdFmtPrice(latest.close, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, lpY + 4);
    }
  }

  drawGrid(ctx, pMin, pMax, toY) {
    const range = pMax - pMin;
    const rawStep = range / 7;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const steps = [1, 2, 5, 10];
    let gridStep = mag;
    for (const s of steps) {
      if (s * mag >= rawStep) { gridStep = s * mag; break; }
    }

    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 0.5;

    let p = Math.ceil(pMin / gridStep) * gridStep;
    while (p < pMax) {
      const y = Math.round(toY(p));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.chartW, y);
      ctx.stroke();
      p += gridStep;
    }
  }

  drawAxes(ctx, pMin, pMax, toY, visible, candleW) {
    // Price Axis Background
    ctx.fillStyle = this.colors.axisBg;
    ctx.fillRect(this.chartW, 0, this.priceAxisW, this.h);
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.chartW, 0);
    ctx.lineTo(this.chartW, this.h);
    ctx.stroke();

    // Price Labels
    const range = pMax - pMin;
    const rawStep = range / 7;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const steps = [1, 2, 5, 10];
    let gridStep = mag;
    for (const s of steps) { if (s * mag >= rawStep) { gridStep = s * mag; break; } }

    ctx.fillStyle = this.colors.textAxis;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    let p = Math.ceil(pMin / gridStep) * gridStep;
    while (p < pMax) {
      const y = toY(p);
      if (y >= 0 && y <= this.candleH) {
        ctx.fillText(tdFmtPrice(p, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, y + 3.5);
      }
      p += gridStep;
    }

    // Time Axis Background
    ctx.fillStyle = this.colors.axisBg;
    ctx.fillRect(0, this.chartH, this.w, this.timeAxisH);
    ctx.beginPath();
    ctx.moveTo(0, this.chartH);
    ctx.lineTo(this.chartW, this.chartH);
    ctx.stroke();

    // Time Labels
    const step = Math.max(1, Math.floor(visible.length / 6));
    for (let i = 0; i < visible.length; i += step) {
      const cx = i * candleW + candleW / 2;
      ctx.fillText(tdFmtDate(visible[i].time, this.interval), cx, this.chartH + 16);
    }
  }

  // ─── Secondary Overlay Canvas Render ──────────────────────────────────────

  renderOverlay() {
    const { overlayCtx: ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    if (!this.crosshair) return;
    const { x, y } = this.crosshair;

    if (x < 0 || x > this.chartW || y < 0 || y > this.chartH) return;

    // Crosshair Lines
    ctx.strokeStyle = this.colors.crosshair;
    ctx.lineWidth = 0.6;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.chartW, y);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price Tag on Main Axis (if inside candle area)
    const { visible } = this.getVisibleRange();
    if (visible.length === 0) return;
    const bounds = this.getPriceBounds(visible);

    if (y <= this.candleH) {
      const price = bounds.min + (1 - y / this.candleH) * bounds.range;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(this.chartW, y - 9, this.priceAxisW, 18);
      ctx.fillStyle = this.colors.textAxisHighlight;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tdFmtPrice(price, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, y + 4);
    }

    // Time Tag on Bottom Axis
    const candleW = this.chartW / this.visibleCandles;
    const cIdx = Math.floor(x / candleW);
    if (cIdx >= 0 && cIdx < visible.length) {
      const c = visible[cIdx];
      const timeStr = tdFmtFullDateTime(c.time);
      const tw = ctx.measureText(timeStr).width + 12;
      const tx = Math.max(0, Math.min(this.chartW - tw, x - tw / 2));
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tx, this.chartH, tw, this.timeAxisH);
      ctx.fillStyle = this.colors.textAxisHighlight;
      ctx.fillText(timeStr, tx + tw / 2, this.chartH + 16);
    }
  }

  checkLiquidationHover(x, y, clientX, clientY) {
    if (!this.layers.liq || !this.liqTooltip) return;

    const { visible } = this.getVisibleRange();
    if (visible.length === 0) return;

    const bounds = this.getPriceBounds(visible);
    const candleW = this.chartW / this.visibleCandles;
    const toY = (price) => (1 - (price - bounds.min) / bounds.range) * this.candleH;

    const evs = this.store.liq.getVisibleEvents(visible);
    let hovered = null;

    for (const e of evs) {
      let cIdx = 0;
      for (let i = 0; i < visible.length; i++) {
        if (visible[i].time <= e.time) cIdx = i;
        else break;
      }
      const mx = cIdx * candleW + candleW / 2;
      const my = toY(e.price);
      const r = Math.max(4, Math.min(20, Math.log10(Math.max(1000, e.usd) / 500) * 5.2));

      const dist = Math.hypot(x - mx, y - my);
      if (dist <= r + 8) {
        hovered = e;
        break;
      }
    }

    if (hovered) {
      const isLong = hovered.side === 'SELL';
      this.liqTooltip.innerHTML = `
        <div class="td-liq-tooltip-title ${isLong ? 'long' : 'short'}">
          ${isLong ? '🔻 LONG LIQUIDATION' : '🔺 SHORT LIQUIDATION'}
        </div>
        <div class="td-liq-val-row">
          <span>Notional:</span>
          <span>${tdFmtUSD(hovered.usd)}</span>
        </div>
        <div class="td-liq-val-row">
          <span>Size:</span>
          <span>${tdFmtVol(hovered.qty)} ${hovered.symbol.replace('USDT', '')}</span>
        </div>
        <div class="td-liq-val-row">
          <span>Price:</span>
          <span>$${tdFmtPrice(hovered.price, this.symbolInfo.decimals)}</span>
        </div>
        <div class="td-liq-val-row">
          <span>Time:</span>
          <span>${new Date(hovered.time).toLocaleTimeString()}</span>
        </div>
      `;
      this.liqTooltip.style.display = 'block';
      this.liqTooltip.style.left = (x + 14) + 'px';
      this.liqTooltip.style.top = Math.max(10, (y - 30)) + 'px';
    } else {
      this.liqTooltip.style.display = 'none';
    }
  }

  updateTooltip(mouseX) {
    const { visible } = this.getVisibleRange();
    if (visible.length === 0) return;

    const candleW = this.chartW / this.visibleCandles;
    const cIdx = Math.floor(mouseX / candleW);

    if (cIdx >= 0 && cIdx < visible.length) {
      this.onHoverCandle?.(visible[cIdx]);
    } else {
      this.onHoverCandle?.(null);
    }
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
  }
}

// ─── 6. TERMINAL UI CONTROLLER ──────────────────────────────────────────────

class TapeDeltaTerminal {
  constructor(rootId) {
    this.root = document.getElementById(rootId);
    this.symbol = 'BTCUSDT';
    this.interval = '5m';
    this.symbolInfo = TD_SYMBOLS[0];
    this.provider = new BinanceMarketDataProvider();
    this.store = new CandleStore();
    this.chart = null;
    this.fps = 0;
    this.fpsCount = 0;
    this.fpsTime = performance.now();
    this.isFullscreen = false;

    // Order flow layer states
    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false
    };
  }

  init() {
    if (!this.root) {
      console.error('Terminal root not found');
      return;
    }

    this.renderShell();
    this.bindToolbar();
    this.startFPSMonitor();

    // Instantiate Chart
    const stage = this.root.querySelector('.td-chart-stage');
    this.chart = new DualCanvasChart(stage, this.store, this.symbolInfo, this.interval);
    this.chart.layers = this.layers;
    this.chart.onHoverCandle = (c) => this.renderOHLCV(c);

    // Connect Market Data Provider
    this.connectFeed();
  }

  renderShell() {
    this.root.innerHTML = `
      <div class="td-toolbar">
        <div class="td-toolbar-section">
          <button class="td-symbol-btn" id="td-sym-select">
            <span id="td-sym-name">${this.symbol}</span>
            <span class="td-price-badge" id="td-sym-price">—</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5L5 6.5L8 3.5"/></svg>
          </button>
        </div>

        <div class="td-divider"></div>

        <div class="td-toolbar-section td-tf-group" id="td-tf-selector">
          ${TD_INTERVALS.map(i => `
            <button class="td-tf-btn ${i.value === this.interval ? 'active' : ''}" data-interval="${i.value}">${i.label}</button>
          `).join('')}
        </div>

        <div class="td-divider"></div>

        <!-- Phase 2 Order Flow Toggles -->
        <div class="td-toolbar-section td-layers-group" id="td-layers-selector">
          <button class="td-layer-btn ${this.layers.heatmap ? 'active' : ''}" data-layer="heatmap" title="Orderbook Depth Heatmap Matrix">
            <span class="td-layer-dot"></span>
            <span>🔥 Heatmap</span>
          </button>
          <button class="td-layer-btn ${this.layers.footprint ? 'active' : ''}" data-layer="footprint" title="Bid/Ask Volume Clusters & POC">
            <span class="td-layer-dot"></span>
            <span>👣 Footprint</span>
          </button>
          <button class="td-layer-btn ${this.layers.vrvp ? 'active' : ''}" data-layer="vrvp" title="Visible Range Volume Profile">
            <span class="td-layer-dot"></span>
            <span>📊 VRVP</span>
          </button>
          <button class="td-layer-btn ${this.layers.liq ? 'active' : ''}" data-layer="liq" title="Real-Time Liquidation Bursts">
            <span class="td-layer-dot"></span>
            <span>💥 Liq</span>
          </button>
          <button class="td-layer-btn ${this.layers.cvd ? 'active' : ''}" data-layer="cvd" title="Cumulative Volume Delta Sub-Pane">
            <span class="td-layer-dot"></span>
            <span>📈 CVD</span>
          </button>
          <button class="td-layer-btn ${this.layers.oi ? 'active' : ''}" data-layer="oi" title="Open Interest Sub-Pane">
            <span class="td-layer-dot"></span>
            <span>⚡ OI</span>
          </button>
        </div>

        <div class="td-divider"></div>

        <div class="td-toolbar-section">
          <button class="td-action-btn" id="td-reset-view" title="Reset View (Double-click chart)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
          <button class="td-action-btn" id="td-fullscreen-btn" title="Toggle Fullscreen Terminal Mode">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            Fullscreen
          </button>
        </div>

        <div class="td-status-badge connecting" id="td-feed-badge">
          <span class="dot"></span>
          <span id="td-feed-status">CONNECTING</span>
        </div>
      </div>

      <!-- Live OHLCV Bar -->
      <div class="td-ohlcv-bar" id="td-ohlcv-header">
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">Time:</span> <span class="td-ohlcv-val" id="td-o-time">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">O:</span> <span class="td-ohlcv-val" id="td-o-open">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">H:</span> <span class="td-ohlcv-val" id="td-o-high">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">L:</span> <span class="td-ohlcv-val" id="td-o-low">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">C:</span> <span class="td-ohlcv-val" id="td-o-close">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">Chg:</span> <span class="td-ohlcv-val" id="td-o-chg">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">Vol:</span> <span class="td-ohlcv-val" id="td-o-vol">—</span></div>
      </div>

      <!-- Main Dual-Canvas Stage -->
      <div class="td-chart-stage"></div>

      <!-- Bottom Status Bar -->
      <div class="td-statusbar">
        <div class="td-stat"><span style="color:var(--td-text-dim)">Feed:</span> <span class="td-stat-val">Binance Spot / Futures Order Flow</span></div>
        <div class="td-stat"><span style="color:var(--td-text-dim)">Pair:</span> <span class="td-stat-val">${this.symbol}</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">Candles:</span> <span class="td-stat-val" id="td-stat-candles">0</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">FPS:</span> <span class="td-stat-val good" id="td-stat-fps">60</span></div>
        <div class="td-stat" style="margin-left:auto"><span style="color:var(--td-text-dim)">Engine:</span> <span class="td-stat-val">TapeDelta Order Flow v2.0</span></div>
      </div>

      <!-- Symbol Search Modal Dropdown -->
      <div class="td-symbol-dropdown" id="td-sym-dropdown" style="display:none;">
        <div class="td-search-box">
          <input type="text" id="td-sym-search-input" placeholder="Search pairs (e.g. BTC, ETH)...">
        </div>
        <div class="td-symbol-list" id="td-sym-list">
          ${TD_SYMBOLS.map(s => `
            <div class="td-symbol-item ${s.symbol === this.symbol ? 'active' : ''}" data-symbol="${s.symbol}">
              <span>${s.symbol}</span>
              <span style="font-size:10.5px;color:var(--td-text-muted)">${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindToolbar() {
    // Timeframe selector
    const tfGroup = this.root.querySelector('#td-tf-selector');
    tfGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-tf-btn');
      if (!btn) return;
      const inv = btn.dataset.interval;
      if (inv && inv !== this.interval) {
        tfGroup.querySelectorAll('.td-tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchInterval(inv);
      }
    });

    // Layer toggles
    const layerGroup = this.root.querySelector('#td-layers-selector');
    layerGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-layer-btn');
      if (!btn) return;
      const layer = btn.dataset.layer;
      if (layer && this.layers.hasOwnProperty(layer)) {
        this.layers[layer] = !this.layers[layer];
        btn.classList.toggle('active', this.layers[layer]);

        // Sync with provider & chart
        this.provider.setLayers(this.layers);
        if (this.chart) {
          this.chart.layers = this.layers;
          this.chart.resize();
          this.chart.requestRender();
          this.chart.updateFootprintHint();
        }
      }
    });

    // Symbol dropdown toggle
    const symBtn = this.root.querySelector('#td-sym-select');
    const dropdown = this.root.querySelector('#td-sym-dropdown');
    const searchInput = this.root.querySelector('#td-sym-search-input');

    symBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'flex';
      dropdown.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) searchInput?.focus();
    });

    // Search filter
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toUpperCase();
      const items = dropdown.querySelectorAll('.td-symbol-item');
      items.forEach(it => {
        const sym = it.dataset.symbol;
        it.style.display = sym.includes(q) ? 'flex' : 'none';
      });
    });

    // Select symbol
    dropdown?.addEventListener('click', (e) => {
      const item = e.target.closest('.td-symbol-item');
      if (!item) return;
      const newSym = item.dataset.symbol;
      if (newSym && newSym !== this.symbol) {
        dropdown.querySelectorAll('.td-symbol-item').forEach(it => it.classList.remove('active'));
        item.classList.add('active');
        dropdown.style.display = 'none';
        this.switchSymbol(newSym);
      }
    });

    document.addEventListener('click', (e) => {
      if (!dropdown?.contains(e.target) && e.target !== symBtn) {
        dropdown.style.display = 'none';
      }
    });

    // Reset View
    this.root.querySelector('#td-reset-view')?.addEventListener('click', () => {
      this.chart.resetView();
    });

    // Fullscreen Toggle
    this.root.querySelector('#td-fullscreen-btn')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    document.body.classList.toggle('tapedelta-fullscreen-active', this.isFullscreen);
    setTimeout(() => {
      this.chart.resize();
      this.chart.requestRender();
    }, 100);
  }

  connectFeed() {
    this.provider.layers = this.layers;
    this.provider.connect(this.symbol, this.interval, {
      onCandleUpdate: (liveCandle) => {
        this.store.updateLive(liveCandle);
        this.chart.requestRender();
        this.updatePriceBadge(liveCandle);
        this.updateCandleCount();
      },
      onHistoryLoaded: (history) => {
        this.store.setHistory(history, this.symbolInfo);
        this.chart.requestRender();
        const latest = this.store.getLatest();
        if (latest) {
          this.updatePriceBadge(latest);
          this.renderOHLCV(latest);
        }
        this.updateCandleCount();
      },
      onDepthUpdate: (bids, asks) => {
        this.store.onDepthUpdate(bids, asks);
        if (this.layers.heatmap) {
          this.chart.requestRender();
        }
      },
      onAggTrade: (trade) => {
        this.store.onAggTrade(trade, this.symbolInfo);
        if (this.layers.cvd || this.layers.footprint) {
          this.chart.requestRender();
        }
      },
      onLiquidation: (liq) => {
        this.store.onLiquidation(liq);
        if (this.layers.liq) {
          this.chart.requestRender();
        }
      },
      onOpenInterest: (data, isHist) => {
        this.store.onOpenInterest(data, isHist);
        if (this.layers.oi) {
          this.chart.requestRender();
        }
      },
      onStatusChange: (status) => {
        this.updateStatusBadge(status);
      }
    });
  }

  switchSymbol(newSym) {
    this.symbol = newSym;
    this.symbolInfo = TD_SYMBOLS.find(s => s.symbol === newSym) || { symbol: newSym, decimals: 2, tickSize: 0.01 };
    this.root.querySelector('#td-sym-name').textContent = this.symbol;
    this.chart.symbolInfo = this.symbolInfo;
    this.chart.resetView();

    this.provider.disconnect();
    this.connectFeed();
  }

  switchInterval(newInterval) {
    this.interval = newInterval;
    this.chart.interval = newInterval;
    this.chart.resetView();

    this.provider.disconnect();
    this.connectFeed();
  }

  updatePriceBadge(c) {
    const badge = this.root.querySelector('#td-sym-price');
    if (!badge) return;
    const isUp = c.close >= c.open;
    badge.textContent = tdFmtPrice(c.close, this.symbolInfo.decimals);
    badge.className = 'td-price-badge ' + (isUp ? 'up' : 'down');
  }

  renderOHLCV(c) {
    if (!c) c = this.store.getLatest();
    if (!c) return;

    const isUp = c.close >= c.open;
    const chg = c.open > 0 ? ((c.close - c.open) / c.open) * 100 : 0;

    const set = (id, val, cls) => {
      const el = this.root.querySelector(id);
      if (el) {
        el.textContent = val;
        el.className = 'td-ohlcv-val ' + (cls || '');
      }
    };

    set('#td-o-time', tdFmtFullDateTime(c.time));
    set('#td-o-open', tdFmtPrice(c.open, this.symbolInfo.decimals));
    set('#td-o-high', tdFmtPrice(c.high, this.symbolInfo.decimals));
    set('#td-o-low', tdFmtPrice(c.low, this.symbolInfo.decimals));
    set('#td-o-close', tdFmtPrice(c.close, this.symbolInfo.decimals), isUp ? 'up' : 'down');
    set('#td-o-chg', `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`, isUp ? 'up' : 'down');
    set('#td-o-vol', tdFmtVol(c.volume));
  }

  updateStatusBadge(status) {
    const badge = this.root.querySelector('#td-feed-badge');
    const label = this.root.querySelector('#td-feed-status');
    if (!badge || !label) return;

    badge.className = 'td-status-badge ' + status;
    label.textContent = status.toUpperCase();
  }

  updateCandleCount() {
    const el = this.root.querySelector('#td-stat-candles');
    if (el) el.textContent = this.store.length;
  }

  startFPSMonitor() {
    const fpsLoop = () => {
      this.fpsCount++;
      const now = performance.now();
      if (now - this.fpsTime >= 1000) {
        this.fps = this.fpsCount;
        this.fpsCount = 0;
        this.fpsTime = now;
        const fpsEl = this.root.querySelector('#td-stat-fps');
        if (fpsEl) {
          fpsEl.textContent = this.fps;
          fpsEl.className = 'td-stat-val ' + (this.fps >= 50 ? 'good' : 'warn');
        }
      }
      requestAnimationFrame(fpsLoop);
    };
    requestAnimationFrame(fpsLoop);
  }

  destroy() {
    this.provider.disconnect();
    this.chart.destroy();
  }
}

// ─── 7. AUTO-BOOTLOADER ─────────────────────────────────────────────────────

function bootTapeDelta() {
  const root = document.getElementById('tapedelta-terminal-root');
  if (!root) {
    setTimeout(bootTapeDelta, 100);
    return;
  }
  if (!window._tapeDelta) {
    window._tapeDelta = new TapeDeltaTerminal('tapedelta-terminal-root');
    window._tapeDelta.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootTapeDelta);
} else {
  setTimeout(bootTapeDelta, 50);
}
