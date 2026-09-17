// ============================================================================
// TAPEDELTA-STYLE INSTITUTIONAL ORDER-FLOW CHART TERMINAL (PHASE 1 - 4 COMPLETE)
// Multi-Pane Canvas Engine + Binance Live Order Flow + Trader Tools + Replay
// Orderbook Depth Heatmap • CVD • Footprint • VRVP • Liquidations • Open Interest
// Drawing Tools • Indicators (EMA, BB, RSI, MACD, VWAP) • Replay • DOM • Prop Guard
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

    // Kline Stream
    if (!this.klineWs) {
      this.openKlineStream();
    }

    // Depth Stream (Heatmap)
    if (this.layers.heatmap) {
      if (!this.depthWs) this.openDepthStream();
    } else {
      this.closeSocket('depth');
    }

    // AggTrade Stream (CVD & Footprint)
    if (this.layers.cvd || this.layers.footprint) {
      if (!this.aggTradeWs) this.openAggTradeStream();
    } else {
      this.closeSocket('aggTrade');
    }

    // Liquidation Stream
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
        } catch (e) {}
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
            const isBuyerMaker = msg.m; // true = taker sell; false = taker buy
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
                side: o.S,
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
      last.high = Math.max(last.high, liveCandle.high);
      last.low = Math.min(last.low, liveCandle.low);
      last.close = liveCandle.close;
      last.volume = liveCandle.volume;
      last.isClosed = liveCandle.isClosed;
    } else if (liveCandle.time > last.time) {
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
    this.slices = [];
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

    const drawLevels = (levels, isBid) => {
      for (const [price, qty] of levels) {
        if (price < bounds.min || price > bounds.max) continue;
        const y = toY(price);
        const intensity = Math.min(1, qty / peakQty);

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
        const h = Math.max(2, Math.round(candleH * 0.012));
        ctx.fillRect(0, Math.round(y - h / 2), chartW, h);
      }
    };

    drawLevels(this.currentBids, true);
    drawLevels(this.currentAsks, false);

    // Live Orderbook Ladder Bar Meter on Price Edge
    const ladderW = 44;
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
    this.candleDeltas = new Map();
    this.cumulativeDelta = 0;
  }

  seedHistory(candles) {
    this.candleDeltas.clear();
    this.cumulativeDelta = 0;

    for (const c of candles) {
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
      cd = { buyVol: 0, sellVol: 0, delta: 0, cvd: this.cumulativeDelta };
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

    // Pane Separator
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(chartW, topY);
    ctx.stroke();

    // Zero Baseline
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

    // CVD Area Fill
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

      // CVD Polyline
      ctx.beginPath();
      ctx.moveTo(points[0].x, cvdToY(points[0].cvd));
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, cvdToY(points[i].cvd));
      }
      ctx.strokeStyle = lastPoint.cvd >= 0 ? colors.up : colors.down;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // Header Tag
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

// ─── 4C. FOOTPRINT CHART ENGINE ─────────────────────────────────────────────

class FootprintEngine {
  constructor() {
    this.candles = new Map();
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
    const halfW = bodyW / 2;

    ctx.save();

    for (const [price, b] of data.buckets.entries()) {
      if (price < bounds.min || price > bounds.max) continue;
      const y = toY(price);
      const rowH = Math.max(3, Math.min(24, Math.abs(toY(price) - toY(price + (bounds.range / 50)))));
      const topY = Math.round(y - rowH / 2);

      // Bid volume left half
      const bidAlpha = Math.min(0.8, 0.1 + (b.bid / (data.maxVol || 1)) * 0.7);
      ctx.fillStyle = `rgba(246, 70, 93, ${bidAlpha})`;
      ctx.fillRect(leftX, topY, halfW - 1, rowH);

      // Ask volume right half
      const askAlpha = Math.min(0.8, 0.1 + (b.ask / (data.maxVol || 1)) * 0.7);
      ctx.fillStyle = `rgba(14, 203, 129, ${askAlpha})`;
      ctx.fillRect(midX, topY, halfW, rowH);

      // POC highlight box
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
    this.profile = null;
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

    // 70% Value Area
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

    // Shaded Value Area Background
    const vahY = toY(vah);
    const valY = toY(val);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.fillRect(0, Math.min(vahY, valY), chartW, Math.abs(valY - vahY));

    // Profile Histogram
    const binH = Math.max(1.5, (candleH / this.binsCount) * 0.92);
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i];
      const y = toY(b.p);
      const isVA = i >= downIdx && i <= upIdx;

      const totalBarW = (b.total / maxTotal) * profileW;
      const buyBarW = (b.buy / (b.total || 1)) * totalBarW;
      const sellBarW = totalBarW - buyBarW;

      ctx.fillStyle = isVA ? 'rgba(14, 203, 129, 0.55)' : 'rgba(14, 203, 129, 0.22)';
      ctx.fillRect(startX - totalBarW, y - binH / 2, buyBarW, binH);

      ctx.fillStyle = isVA ? 'rgba(246, 70, 93, 0.55)' : 'rgba(246, 70, 93, 0.22)';
      ctx.fillRect(startX - totalBarW + buyBarW, y - binH / 2, sellBarW, binH);
    }

    // Horizontal Lines: POC, VAH, VAL
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

    ctx.beginPath();
    ctx.moveTo(0, valY);
    ctx.lineTo(chartW, valY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillText(`VAL ${tdFmtPrice(val, symbolInfo.decimals)}`, chartW - profileW - 8, valY + 11);

    ctx.restore();
  }
}

// ─── 4E. LIQUIDATION TRACKER ────────────────────────────────────────────────

class LiquidationTracker {
  constructor() {
    this.events = [];
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
      let cIdx = 0;
      for (let i = 0; i < visible.length; i++) {
        if (visible[i].time <= e.time) cIdx = i;
        else break;
      }

      const x = cIdx * candleW + candleW / 2;
      const y = toY(e.price);

      const r = Math.max(4, Math.min(20, Math.log10(Math.max(1000, e.usd) / 500) * 5.2));
      const isLongLiq = e.side === 'SELL';

      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = isLongLiq ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isLongLiq ? 'rgba(244, 63, 94, 0.88)' : 'rgba(16, 185, 129, 0.88)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

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
    this.history = [];
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

    // Pane Divider
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(chartW, topY);
    ctx.stroke();

    // Area
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

    // Polyline
    ctx.beginPath();
    ctx.moveTo(points[0].x, oiToY(points[0].oi));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, oiToY(points[i].oi));
    }
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Badge
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

// ─── 5A. DRAWING TOOLS ENGINE (PHASE 3) ──────────────────────────────────────

class DrawingEngine {
  constructor(symbol) {
    this.symbol = symbol;
    this.activeTool = 'cursor'; // 'cursor', 'trendline', 'horiz', 'ray', 'rect', 'fib', 'text'
    this.drawings = [];
    this.currentDrawing = null;
    this.isLocked = false;
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(`td_drawings_${this.symbol}`);
      if (data) this.drawings = JSON.parse(data);
    } catch (e) {
      this.drawings = [];
    }
  }

  save() {
    try {
      localStorage.setItem(`td_drawings_${this.symbol}`, JSON.stringify(this.drawings));
    } catch (e) {}
  }

  undo() {
    if (this.drawings.length > 0 && !this.isLocked) {
      this.drawings.pop();
      this.save();
    }
  }

  clear() {
    if (!this.isLocked) {
      this.drawings = [];
      this.save();
    }
  }

  handleMouseDown(point) {
    if (this.isLocked || this.activeTool === 'cursor') return;

    if (!this.currentDrawing) {
      // Start new drawing
      this.currentDrawing = {
        id: Date.now(),
        type: this.activeTool,
        p1: point,
        p2: point,
        color: '#38bdf8'
      };
      if (this.activeTool === 'text') {
        const text = prompt('Enter annotation label:', 'Key Level / Reversal');
        if (text) {
          this.currentDrawing.text = text;
          this.drawings.push(this.currentDrawing);
          this.save();
        }
        this.currentDrawing = null;
      }
    } else {
      // Complete drawing
      this.currentDrawing.p2 = point;
      this.drawings.push(this.currentDrawing);
      this.currentDrawing = null;
      this.save();
    }
  }

  handleMouseMove(point) {
    if (this.currentDrawing) {
      this.currentDrawing.p2 = point;
    }
  }

  render(ctx, toX, toY, chartW, candleH) {
    const list = [...this.drawings];
    if (this.currentDrawing) list.push(this.currentDrawing);

    ctx.save();
    for (const d of list) {
      const x1 = toX(d.p1.time);
      const y1 = toY(d.p1.price);
      const x2 = d.p2 ? toX(d.p2.time) : x1;
      const y2 = d.p2 ? toY(d.p2.price) : y1;

      ctx.strokeStyle = d.color || '#38bdf8';
      ctx.lineWidth = 1.5;

      switch (d.type) {
        case 'trendline': {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          // Draw end points
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x1 - 3, y1 - 3, 6, 6);
          ctx.fillRect(x2 - 3, y2 - 3, 6, 6);
          break;
        }
        case 'horiz': {
          ctx.beginPath();
          ctx.moveTo(0, y1);
          ctx.lineTo(chartW, y1);
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`$${d.p1.price.toFixed(2)}`, chartW - 55, y1 - 4);
          break;
        }
        case 'ray': {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const angle = Math.atan2(dy, dx);
          const extX = x1 + Math.cos(angle) * chartW;
          const extY = y1 + Math.sin(angle) * chartW;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(extX, extY);
          ctx.stroke();
          break;
        }
        case 'rect': {
          const rx = Math.min(x1, x2);
          const ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1);
          const rh = Math.abs(y2 - y1);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
          break;
        }
        case 'fib': {
          const topPrice = Math.max(d.p1.price, d.p2.price);
          const botPrice = Math.min(d.p1.price, d.p2.price);
          const range = topPrice - botPrice || 1;
          const levels = [
            { f: 0.0, color: '#f59e0b' },
            { f: 0.236, color: '#818cf8' },
            { f: 0.382, color: '#38bdf8' },
            { f: 0.5, color: '#10b981' },
            { f: 0.618, color: '#f59e0b' },
            { f: 0.786, color: '#ef4444' },
            { f: 1.0, color: '#64748b' }
          ];

          const startX = Math.min(x1, x2);
          const endX = Math.max(x1, x2, startX + 160);

          for (const lvl of levels) {
            const lp = topPrice - lvl.f * range;
            const ly = toY(lp);
            ctx.strokeStyle = lvl.color;
            ctx.beginPath();
            ctx.moveTo(startX, ly);
            ctx.lineTo(endX, ly);
            ctx.stroke();

            ctx.fillStyle = lvl.color;
            ctx.font = '8.5px monospace';
            ctx.fillText(`Fib ${lvl.f} ($${lp.toFixed(2)})`, endX + 4, ly + 3);
          }
          break;
        }
        case 'text': {
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`🏷️ ${d.text || ''}`, x1 + 5, y1 - 5);
          break;
        }
      }
    }
    ctx.restore();
  }
}

// ─── 5B. INDICATOR ENGINE (EMA, BB, RSI, MACD, VWAP) ────────────────────────

class IndicatorEngine {
  constructor() {
    this.config = {
      ema20: true,
      ema50: true,
      ema200: false,
      bb: false,
      rsi: false,
      macd: false,
      vwap: true
    };
    this.load();
  }

  load() {
    try {
      const c = localStorage.getItem('td_indicators_config');
      if (c) this.config = { ...this.config, ...JSON.parse(c) };
    } catch (e) {}
  }

  save() {
    try {
      localStorage.setItem('td_indicators_config', JSON.stringify(this.config));
    } catch (e) {}
  }

  computeEMA(candles, period) {
    const k = 2 / (period + 1);
    const res = [];
    let ema = candles[0] ? candles[0].close : 0;
    for (let i = 0; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
      res.push(ema);
    }
    return res;
  }

  computeBB(candles, period = 20, mult = 2) {
    const upper = [];
    const middle = [];
    const lower = [];

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        middle.push(candles[i].close);
        upper.push(candles[i].close);
        lower.push(candles[i].close);
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) sum += candles[i - j].close;
      const mean = sum / period;
      let sumSq = 0;
      for (let j = 0; j < period; j++) sumSq += Math.pow(candles[i - j].close - mean, 2);
      const dev = Math.sqrt(sumSq / period);

      middle.push(mean);
      upper.push(mean + mult * dev);
      lower.push(mean - mult * dev);
    }
    return { upper, middle, lower };
  }

  computeRSI(candles, period = 14) {
    const rsi = [];
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < candles.length; i++) {
      if (i === 0) { rsi.push(50); continue; }
      const diff = candles[i].close - candles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      if (i <= period) {
        avgGain += gain / period;
        avgLoss += loss / period;
        rsi.push(50);
      } else {
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgGain / (avgLoss || 1e-9);
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    return rsi;
  }

  computeVWAP(candles) {
    const vwap = [];
    let cumVol = 0;
    let cumVolPrice = 0;

    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      cumVol += c.volume;
      cumVolPrice += tp * c.volume;
      vwap.push(cumVolPrice / (cumVol || 1));
    }
    return vwap;
  }

  renderOverlays(ctx, visible, startIdx, allCandles, candleW, toY, colors) {
    if (visible.length === 0 || allCandles.length === 0) return;

    ctx.save();

    // 1. VWAP
    if (this.config.vwap) {
      const vwapAll = this.computeVWAP(allCandles);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const idx = startIdx + i;
        const y = toY(vwapAll[idx] || visible[i].close);
        const x = i * candleW + candleW / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. EMA 20
    if (this.config.ema20) {
      const ema = this.computeEMA(allCandles, 20);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const idx = startIdx + i;
        const y = toY(ema[idx] || visible[i].close);
        const x = i * candleW + candleW / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. EMA 50
    if (this.config.ema50) {
      const ema = this.computeEMA(allCandles, 50);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const idx = startIdx + i;
        const y = toY(ema[idx] || visible[i].close);
        const x = i * candleW + candleW / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 4. Bollinger Bands
    if (this.config.bb) {
      const bb = this.computeBB(allCandles, 20, 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Upper
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const idx = startIdx + i;
        const y = toY(bb.upper[idx] || visible[i].close);
        const x = i * candleW + candleW / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const idx = startIdx + i;
        const y = toY(bb.lower[idx] || visible[i].close);
        const x = i * candleW + candleW / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}

// ─── 5C. REPLAY ENGINE (BAR-BY-BAR PLAYBACK) ────────────────────────────────

class ReplayEngine {
  constructor(chart) {
    this.chart = chart;
    this.isActive = false;
    this.isPlaying = false;
    this.replayCursor = 0;
    this.timer = null;
    this.speedMs = 800; // 1x = 800ms per bar
  }

  enter(startIndex) {
    this.isActive = true;
    this.isPlaying = false;
    this.replayCursor = startIndex || Math.max(20, this.chart.store.length - 120);
    this.chart.requestRender();
  }

  play() {
    if (!this.isActive) return;
    this.isPlaying = true;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.replayCursor < this.chart.store.length - 1) {
        this.replayCursor++;
        this.chart.requestRender();
      } else {
        this.pause();
      }
    }, this.speedMs);
  }

  pause() {
    this.isPlaying = false;
    clearInterval(this.timer);
  }

  stepForward() {
    if (this.replayCursor < this.chart.store.length - 1) {
      this.replayCursor++;
      this.chart.requestRender();
    }
  }

  stepBackward() {
    if (this.replayCursor > 10) {
      this.replayCursor--;
      this.chart.requestRender();
    }
  }

  exit() {
    this.pause();
    this.isActive = false;
    this.chart.requestRender();
  }
}

// ─── 5D. ALERTS ENGINE (WEB AUDIO SYNTH CHIME) ──────────────────────────────

class AlertsEngine {
  constructor() {
    this.alerts = []; // { id, symbol, targetPrice, side: 'above'|'below', triggered: false }
    this.audioCtx = null;
    this.load();
  }

  load() {
    try {
      const a = localStorage.getItem('td_alerts');
      if (a) this.alerts = JSON.parse(a);
    } catch (e) {
      this.alerts = [];
    }
  }

  save() {
    try {
      localStorage.setItem('td_alerts', JSON.stringify(this.alerts));
    } catch (e) {}
  }

  addAlert(symbol, targetPrice, curPrice) {
    const side = targetPrice >= curPrice ? 'above' : 'below';
    this.alerts.push({
      id: Date.now(),
      symbol,
      targetPrice,
      side,
      triggered: false,
      time: Date.now()
    });
    this.save();
  }

  checkPrice(symbol, price, onTriggered) {
    for (const a of this.alerts) {
      if (a.symbol === symbol && !a.triggered) {
        if ((a.side === 'above' && price >= a.targetPrice) || (a.side === 'below' && price <= a.targetPrice)) {
          a.triggered = true;
          this.save();
          this.playChime();
          onTriggered?.(a);
        }
      }
    }
  }

  playChime() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }
}

// ─── 5E. SIMULATED PROP GUARD & TRADE BAR ────────────────────────────────────

class QuickTradeEngine {
  constructor() {
    this.account = {
      balance: 100000,
      initialBalance: 100000,
      dailyLossLimit: 5000, // 5%
      maxLossLimit: 10000,  // 10%
      positions: []
    };
    this.load();
  }

  load() {
    try {
      const a = localStorage.getItem('td_prop_account');
      if (a) this.account = JSON.parse(a);
    } catch (e) {}
  }

  save() {
    try {
      localStorage.setItem('td_prop_account', JSON.stringify(this.account));
    } catch (e) {}
  }

  placeOrder(symbol, side, qty, price, sl, tp) {
    const pos = {
      id: Date.now(),
      symbol,
      side,
      qty,
      entryPrice: price,
      sl: sl || 0,
      tp: tp || 0,
      time: Date.now(),
      pnl: 0
    };
    this.account.positions.push(pos);
    this.save();
    return pos;
  }

  updatePnL(currentPrice) {
    let totalPnl = 0;
    for (const p of this.account.positions) {
      const diff = p.side === 'BUY' ? (currentPrice - p.entryPrice) : (p.entryPrice - currentPrice);
      p.pnl = diff * p.qty;
      totalPnl += p.pnl;
    }
    return totalPnl;
  }
}

// ─── 6. DUAL-CANVAS RENDERING ENGINE ────────────────────────────────────────

class DualCanvasChart {
  constructor(container, store, symbolInfo, interval) {
    this.container = container;
    this.store = store;
    this.symbolInfo = symbolInfo;
    this.interval = interval;

    // View state
    this.visibleCandles = 75;
    this.scrollOffset = 0;
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

    // Trader Tools (Phase 3 & 4)
    this.drawings = new DrawingEngine(this.symbolInfo.symbol);
    this.indicators = new IndicatorEngine();
    this.replay = new ReplayEngine(this);

    // Interaction state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartOffset = 0;
    this.crosshair = null;

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

    // Partitioning
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
      this.checkLiquidationHover(x, y);

      // Drawing tool preview
      if (this.drawings.activeTool !== 'cursor') {
        const p = this.coordinateToPriceTime(x, y);
        if (p) this.drawings.handleMouseMove(p);
        this.requestRender();
      }
    });

    el.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.crosshair = null;
      this.renderOverlay();
      this.onHoverCandle?.(null);
      if (this.liqTooltip) this.liqTooltip.style.display = 'none';
    });

    el.addEventListener('mousedown', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.drawings.activeTool !== 'cursor') {
        const p = this.coordinateToPriceTime(x, y);
        if (p) this.drawings.handleMouseDown(p);
        this.requestRender();
      } else {
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartOffset = this.scrollOffset;
      }
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

  coordinateToPriceTime(x, y) {
    const { visible } = this.getVisibleRange();
    if (visible.length === 0) return null;
    const bounds = this.getPriceBounds(visible);
    const candleW = this.chartW / this.visibleCandles;

    const cIdx = Math.max(0, Math.min(visible.length - 1, Math.floor(x / candleW)));
    const time = visible[cIdx].time;
    const price = bounds.min + (1 - y / this.candleH) * bounds.range;
    return { time, price };
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

  getEffectiveCandles() {
    let all = this.store.candles;
    if (this.replay.isActive) {
      all = all.slice(0, Math.max(10, this.replay.replayCursor + 1));
    }
    return all;
  }

  getVisibleRange() {
    const all = this.getEffectiveCandles();
    const total = all.length;
    if (total === 0) return { visible: [], startIdx: 0, endIdx: 0, all };

    const endIdx = Math.max(0, total - this.scrollOffset);
    const startIdx = Math.max(0, endIdx - this.visibleCandles);
    const visible = all.slice(startIdx, endIdx);

    return { visible, startIdx, endIdx, all };
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

  renderBase() {
    const { baseCtx: ctx, w, h } = this;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    const { visible, startIdx, all } = this.getVisibleRange();
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
    const toX = (time) => {
      for (let i = 0; i < visible.length; i++) {
        if (visible[i].time >= time) return i * candleW + candleW / 2;
      }
      return this.chartW;
    };
    const volToH = (vol) => (vol / bounds.maxVol) * (this.volH - 6);

    // 1. Gridlines
    this.drawGrid(ctx, bounds.min, bounds.max, toY);

    // 2. Orderbook Depth Heatmap
    if (this.layers.heatmap) {
      this.store.heatmap.render(ctx, bounds, this.candleH, this.chartW, toY);
    }

    // 3. VRVP
    if (this.layers.vrvp) {
      this.store.vrvp.compute(visible, bounds);
      this.store.vrvp.render(ctx, bounds, this.candleH, this.chartW, toY, this.symbolInfo);
    }

    // 4. Candlesticks / Footprint
    const isFootprintZoomed = this.layers.footprint && this.visibleCandles <= 45;

    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = i * candleW;
      const isUp = c.close >= c.open;
      const color = isUp ? this.colors.up : this.colors.down;

      if (isFootprintZoomed) {
        this.store.footprint.renderCandle(ctx, c, x, candleW, toY, bounds, this.colors);
      } else {
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

      // Volume Bar
      const vH = volToH(c.volume);
      const vY = this.volTop + this.volH - vH;
      ctx.fillStyle = isUp ? this.colors.upDim : this.colors.downDim;
      ctx.fillRect(Math.round(x + gap), vY, Math.round(bodyW), vH);
    }

    // 5. Technical Indicators (Phase 3: EMA, BB, VWAP)
    this.indicators.renderOverlays(ctx, visible, startIdx, all, candleW, toY, this.colors);

    // 6. Drawing Tools (Phase 3)
    this.drawings.render(ctx, toX, toY, this.chartW, this.candleH);

    // 7. Liquidation Markers
    if (this.layers.liq) {
      this.store.liq.render(ctx, visible, candleW, toY, this.colors);
    }

    // 8. Sub-Panes
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

    // 9. Axes
    this.drawAxes(ctx, bounds.min, bounds.max, toY, visible, candleW);

    // 10. Current Price Tag
    const latest = visible[visible.length - 1];
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
    ctx.fillStyle = this.colors.axisBg;
    ctx.fillRect(this.chartW, 0, this.priceAxisW, this.h);
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.chartW, 0);
    ctx.lineTo(this.chartW, this.h);
    ctx.stroke();

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

    ctx.fillStyle = this.colors.axisBg;
    ctx.fillRect(0, this.chartH, this.w, this.timeAxisH);
    ctx.beginPath();
    ctx.moveTo(0, this.chartH);
    ctx.lineTo(this.chartW, this.chartH);
    ctx.stroke();

    const step = Math.max(1, Math.floor(visible.length / 6));
    for (let i = 0; i < visible.length; i += step) {
      const cx = i * candleW + candleW / 2;
      ctx.fillText(tdFmtDate(visible[i].time, this.interval), cx, this.chartH + 16);
    }
  }

  renderOverlay() {
    const { overlayCtx: ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    if (!this.crosshair) return;
    const { x, y } = this.crosshair;

    if (x < 0 || x > this.chartW || y < 0 || y > this.chartH) return;

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

  checkLiquidationHover(x, y) {
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
        <div class="td-liq-val-row"><span>Notional:</span><span>${tdFmtUSD(hovered.usd)}</span></div>
        <div class="td-liq-val-row"><span>Size:</span><span>${tdFmtVol(hovered.qty)} ${hovered.symbol.replace('USDT', '')}</span></div>
        <div class="td-liq-val-row"><span>Price:</span><span>$${tdFmtPrice(hovered.price, this.symbolInfo.decimals)}</span></div>
        <div class="td-liq-val-row"><span>Time:</span><span>${new Date(hovered.time).toLocaleTimeString()}</span></div>
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

// ─── 7. TERMINAL UI CONTROLLER (PHASES 1 - 4) ───────────────────────────────

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

    // Phase 2 Layers
    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false
    };

    // Phase 3 & 4 Tools
    this.layout = '1x1'; // '1x1', '2v', '2h', '4g'
    this.activeDockTab = 'watchlist'; // 'watchlist', 'dom', 'trade', 'alerts', null
    this.tradeEngine = new QuickTradeEngine();
    this.alertsEngine = new AlertsEngine();
    this.fundingTimer = null;
  }

  init() {
    if (!this.root) return;

    this.renderShell();
    this.bindToolbar();
    this.bindDrawRail();
    this.bindRightDock();
    this.startFPSMonitor();
    this.startFundingClock();

    // Primary Chart Stage
    const stage = this.root.querySelector('#td-pane-0');
    this.chart = new DualCanvasChart(stage, this.store, this.symbolInfo, this.interval);
    this.chart.layers = this.layers;
    this.chart.onHoverCandle = (c) => this.renderOHLCV(c);

    this.connectFeed();
    this.renderDOMTable();
  }

  renderShell() {
    this.root.innerHTML = `
      <!-- TOP TOOLBAR -->
      <div class="td-toolbar">
        <div class="td-toolbar-section">
          <button class="td-symbol-btn" id="td-sym-select">
            <span id="td-sym-name">${this.symbol}</span>
            <span class="td-price-badge" id="td-sym-price">—</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5L5 6.5L8 3.5"/></svg>
          </button>
        </div>

        <div class="td-divider"></div>

        <!-- Timeframe Selector -->
        <div class="td-toolbar-section td-tf-group" id="td-tf-selector">
          ${TD_INTERVALS.map(i => `
            <button class="td-tf-btn ${i.value === this.interval ? 'active' : ''}" data-interval="${i.value}">${i.label}</button>
          `).join('')}
        </div>

        <div class="td-divider"></div>

        <!-- Order Flow Toggles (Phase 2) -->
        <div class="td-toolbar-section td-layers-group" id="td-layers-selector">
          <button class="td-layer-btn ${this.layers.heatmap ? 'active' : ''}" data-layer="heatmap" title="Orderbook Depth Heatmap Matrix">
            <span class="td-layer-dot"></span><span>🔥 Heatmap</span>
          </button>
          <button class="td-layer-btn ${this.layers.footprint ? 'active' : ''}" data-layer="footprint" title="Bid/Ask Volume Clusters & POC">
            <span class="td-layer-dot"></span><span>👣 Footprint</span>
          </button>
          <button class="td-layer-btn ${this.layers.vrvp ? 'active' : ''}" data-layer="vrvp" title="Visible Range Volume Profile">
            <span class="td-layer-dot"></span><span>📊 VRVP</span>
          </button>
          <button class="td-layer-btn ${this.layers.liq ? 'active' : ''}" data-layer="liq" title="Real-Time Liquidation Bursts">
            <span class="td-layer-dot"></span><span>💥 Liq</span>
          </button>
          <button class="td-layer-btn ${this.layers.cvd ? 'active' : ''}" data-layer="cvd" title="Cumulative Volume Delta Sub-Pane">
            <span class="td-layer-dot"></span><span>📈 CVD</span>
          </button>
          <button class="td-layer-btn ${this.layers.oi ? 'active' : ''}" data-layer="oi" title="Open Interest Sub-Pane">
            <span class="td-layer-dot"></span><span>⚡ OI</span>
          </button>
        </div>

        <div class="td-divider"></div>

        <!-- Trader Tools & Layout Controls (Phase 3 & 4) -->
        <div class="td-toolbar-section">
          <button class="td-action-btn" id="td-indicators-btn" title="Technical Indicators (EMA, BB, RSI, MACD, VWAP)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 18 18"/><path d="m19 9 2 2-6 6-4-4-6 6"/></svg>
            Indicators
          </button>
          <button class="td-action-btn" id="td-replay-btn" title="Bar-by-Bar Replay Mode">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>
            Replay
          </button>
          <button class="td-action-btn" id="td-layout-btn" title="Multi-Pane Grid Layout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>
            Layout
          </button>
          <button class="td-action-btn" id="td-reset-view" title="Reset View">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
          <button class="td-action-btn" id="td-fullscreen-btn" title="Toggle Fullscreen Mode">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>

        <div class="td-status-badge connecting" id="td-feed-badge">
          <span class="dot"></span>
          <span id="td-feed-status">CONNECTING</span>
        </div>
      </div>

      <!-- Live OHLCV Header Bar -->
      <div class="td-ohlcv-bar" id="td-ohlcv-header">
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">Time:</span> <span class="td-ohlcv-val" id="td-o-time">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">O:</span> <span class="td-ohlcv-val" id="td-o-open">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">H:</span> <span class="td-ohlcv-val" id="td-o-high">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">L:</span> <span class="td-ohlcv-val" id="td-o-low">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">C:</span> <span class="td-ohlcv-val" id="td-o-close">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">Chg:</span> <span class="td-ohlcv-val" id="td-o-chg">—</span></div>
        <div class="td-ohlcv-item"><span class="td-ohlcv-label">Vol:</span> <span class="td-ohlcv-val" id="td-o-vol">—</span></div>
      </div>

      <!-- MAIN TERMINAL BODY (Draw Rail + Panes Grid + Right Dock) -->
      <div class="td-terminal-body">
        <!-- LEFT DRAWING TOOL RAIL (Phase 3) -->
        <div class="td-draw-rail" id="td-draw-rail">
          <button class="td-draw-btn active" data-tool="cursor" title="Cursor / Pan (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="trendline" title="Trendline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L20 4"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="4" r="2"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="horiz" title="Horizontal Price Line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="ray" title="Ray Line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 18L18 6"/><path d="M12 6h6v6"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="rect" title="Rectangle Zone (Support/Resistance)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="12" x="3" y="6" rx="2"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="fib" title="Fibonacci Retracement">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 10h18M3 14h18M3 18h18"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="text" title="Text Annotation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 7 8 10 8-10"/><path d="M12 17V3"/></svg>
          </button>

          <div class="td-draw-divider"></div>

          <button class="td-draw-btn" id="td-draw-undo" title="Undo Last Drawing (Ctrl+Z)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
          </button>
          <button class="td-draw-btn" id="td-draw-clear" title="Clear All Drawings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
          </button>
        </div>

        <!-- MULTI-PANE GRID STAGE -->
        <div class="td-panes-grid layout-1x1" id="td-panes-grid">
          <div class="td-pane-cell active-pane" id="td-pane-0"></div>
        </div>

        <!-- RIGHT DOCKABLE WIDGET DRAWER (Phase 3 & 4) -->
        <div class="td-right-dock" id="td-right-dock">
          <!-- Dock Tabs Rail -->
          <div class="td-dock-rail">
            <button class="td-dock-btn active" data-tab="watchlist" title="Watchlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <button class="td-dock-btn" data-tab="dom" title="Order Book DOM Ladder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"/><path d="M3 8h18"/><path d="M3 16h18"/></svg>
            </button>
            <button class="td-dock-btn" data-tab="trade" title="Quick Trade & Prop Firm Guard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </button>
            <button class="td-dock-btn" data-tab="alerts" title="Price & Indicator Alerts">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
          </div>

          <!-- Dock Content Panel -->
          <div class="td-dock-panel" id="td-dock-panel">
            <div class="td-dock-header">
              <span id="td-dock-title">WATCHLIST</span>
              <button class="td-modal-close" id="td-dock-close" title="Collapse Panel">✕</button>
            </div>
            <div class="td-dock-content" id="td-dock-content">
              <!-- Dynamically rendered -->
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM TERMINAL STATUS BAR -->
      <div class="td-statusbar">
        <div class="td-stat"><span style="color:var(--td-text-dim)">Feed:</span> <span class="td-stat-val">Binance Spot / Futures WS</span></div>
        <div class="td-stat"><span style="color:var(--td-text-dim)">Pair:</span> <span class="td-stat-val">${this.symbol}</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">Funding Rate:</span> <span class="td-stat-val good" id="td-stat-funding">+0.0100% (3h 48m)</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">Candles:</span> <span class="td-stat-val" id="td-stat-candles">0</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">FPS:</span> <span class="td-stat-val good" id="td-stat-fps">60</span></div>
        <div class="td-stat" style="margin-left:auto"><span style="color:var(--td-text-dim)">Engine:</span> <span class="td-stat-val">TapeDelta Pro v4.0</span></div>
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

      <!-- Indicators Modal (Phase 3) -->
      <div class="td-modal-backdrop" id="td-ind-modal" style="display:none;">
        <div class="td-modal-dialog">
          <div class="td-modal-header">
            <span>TECHNICAL INDICATORS & OVERLAYS</span>
            <button class="td-modal-close" id="td-ind-modal-close">✕</button>
          </div>
          <div class="td-modal-body">
            <div class="td-ind-item">
              <div class="td-ind-info"><h4>EMA 20</h4><p>Fast 20-period Exponential Moving Average (Cyan)</p></div>
              <label class="td-toggle-switch"><input type="checkbox" id="td-ind-ema20" checked><span class="td-toggle-slider"></span></label>
            </div>
            <div class="td-ind-item">
              <div class="td-ind-info"><h4>EMA 50</h4><p>Medium 50-period Exponential Moving Average (Purple)</p></div>
              <label class="td-toggle-switch"><input type="checkbox" id="td-ind-ema50" checked><span class="td-toggle-slider"></span></label>
            </div>
            <div class="td-ind-item">
              <div class="td-ind-info"><h4>EMA 200</h4><p>Long-term 200-period Trendline (Gold)</p></div>
              <label class="td-toggle-switch"><input type="checkbox" id="td-ind-ema200"><span class="td-toggle-slider"></span></label>
            </div>
            <div class="td-ind-item">
              <div class="td-ind-info"><h4>Session VWAP</h4><p>Volume Weighted Average Price (Orange)</p></div>
              <label class="td-toggle-switch"><input type="checkbox" id="td-ind-vwap" checked><span class="td-toggle-slider"></span></label>
            </div>
            <div class="td-ind-item">
              <div class="td-ind-info"><h4>Bollinger Bands (20, 2)</h4><p>Volatility Envelope with ±2 Standard Deviations</p></div>
              <label class="td-toggle-switch"><input type="checkbox" id="td-ind-bb"><span class="td-toggle-slider"></span></label>
            </div>
          </div>
        </div>
      </div>

      <!-- Replay Mode Floating Bar (Phase 3) -->
      <div class="td-replay-bar" id="td-replay-bar" style="display:none;">
        <span class="td-replay-badge">⏪ REPLAY MODE</span>
        <button class="td-replay-btn" id="td-replay-step-back" title="Step Back (-1 Bar)">⏮</button>
        <button class="td-replay-btn" id="td-replay-play" title="Play / Pause">▶</button>
        <button class="td-replay-btn" id="td-replay-step-forward" title="Step Forward (+1 Bar)">⏭</button>
        <select class="td-replay-speed" id="td-replay-speed">
          <option value="1200">0.5x</option>
          <option value="800" selected>1x</option>
          <option value="400">2x</option>
          <option value="150">5x</option>
        </select>
        <button class="td-replay-exit" id="td-replay-exit">EXIT</button>
      </div>

      <!-- Alert Notification Toast -->
      <div class="td-alert-toast" id="td-alert-toast" style="display:none;">
        <span>🔔</span>
        <span id="td-alert-toast-msg">Alert triggered!</span>
      </div>
    `;
  }

  bindToolbar() {
    // Timeframes
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

    // Layer Toggles
    const layerGroup = this.root.querySelector('#td-layers-selector');
    layerGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-layer-btn');
      if (!btn) return;
      const layer = btn.dataset.layer;
      if (layer && this.layers.hasOwnProperty(layer)) {
        this.layers[layer] = !this.layers[layer];
        btn.classList.toggle('active', this.layers[layer]);
        this.provider.setLayers(this.layers);
        if (this.chart) {
          this.chart.layers = this.layers;
          this.chart.resize();
          this.chart.requestRender();
          this.chart.updateFootprintHint();
        }
      }
    });

    // Symbol Search
    const symBtn = this.root.querySelector('#td-sym-select');
    const dropdown = this.root.querySelector('#td-sym-dropdown');
    const searchInput = this.root.querySelector('#td-sym-search-input');

    symBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'flex';
      dropdown.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) searchInput?.focus();
    });

    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toUpperCase();
      dropdown.querySelectorAll('.td-symbol-item').forEach(it => {
        it.style.display = it.dataset.symbol.includes(q) ? 'flex' : 'none';
      });
    });

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

    // Indicator Modal Toggle
    const indBtn = this.root.querySelector('#td-indicators-btn');
    const indModal = this.root.querySelector('#td-ind-modal');
    const indClose = this.root.querySelector('#td-ind-modal-close');

    indBtn?.addEventListener('click', () => { indModal.style.display = 'flex'; });
    indClose?.addEventListener('click', () => { indModal.style.display = 'none'; });
    indModal?.addEventListener('click', (e) => { if (e.target === indModal) indModal.style.display = 'none'; });

    ['ema20', 'ema50', 'ema200', 'vwap', 'bb'].forEach(k => {
      const el = this.root.querySelector(`#td-ind-${k}`);
      if (el) {
        el.checked = this.chart?.indicators?.config[k] ?? false;
        el.addEventListener('change', () => {
          if (this.chart?.indicators) {
            this.chart.indicators.config[k] = el.checked;
            this.chart.indicators.save();
            this.chart.requestRender();
          }
        });
      }
    });

    // Replay Mode Toggle (Phase 3)
    const replayBtn = this.root.querySelector('#td-replay-btn');
    const replayBar = this.root.querySelector('#td-replay-bar');
    const replayPlay = this.root.querySelector('#td-replay-play');
    const replayStepBack = this.root.querySelector('#td-replay-step-back');
    const replayStepFwd = this.root.querySelector('#td-replay-step-forward');
    const replaySpeed = this.root.querySelector('#td-replay-speed');
    const replayExit = this.root.querySelector('#td-replay-exit');

    replayBtn?.addEventListener('click', () => {
      if (!this.chart.replay.isActive) {
        this.chart.replay.enter();
        replayBar.style.display = 'flex';
        replayPlay.textContent = '▶';
      } else {
        this.chart.replay.exit();
        replayBar.style.display = 'none';
      }
    });

    replayPlay?.addEventListener('click', () => {
      if (this.chart.replay.isPlaying) {
        this.chart.replay.pause();
        replayPlay.textContent = '▶';
      } else {
        this.chart.replay.play();
        replayPlay.textContent = '⏸';
      }
    });

    replayStepBack?.addEventListener('click', () => { this.chart.replay.stepBackward(); });
    replayStepFwd?.addEventListener('click', () => { this.chart.replay.stepForward(); });
    replaySpeed?.addEventListener('change', (e) => {
      this.chart.replay.speedMs = parseInt(e.target.value, 10);
      if (this.chart.replay.isPlaying) {
        this.chart.replay.pause();
        this.chart.replay.play();
      }
    });

    replayExit?.addEventListener('click', () => {
      this.chart.replay.exit();
      replayBar.style.display = 'none';
    });

    // Layout Switcher (Phase 3)
    this.root.querySelector('#td-layout-btn')?.addEventListener('click', () => {
      const layouts = ['1x1', '2v', '2h', '4g'];
      const nextIdx = (layouts.indexOf(this.layout) + 1) % layouts.length;
      this.switchLayout(layouts[nextIdx]);
    });
  }

  bindDrawRail() {
    const rail = this.root.querySelector('#td-draw-rail');
    rail?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-draw-btn');
      if (!btn) return;

      const tool = btn.dataset.tool;
      if (tool) {
        rail.querySelectorAll('.td-draw-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.chart) this.chart.drawings.activeTool = tool;
      }
    });

    this.root.querySelector('#td-draw-undo')?.addEventListener('click', () => {
      this.chart?.drawings.undo();
      this.chart?.requestRender();
    });

    this.root.querySelector('#td-draw-clear')?.addEventListener('click', () => {
      if (confirm('Clear all drawings on this chart?')) {
        this.chart?.drawings.clear();
        this.chart?.requestRender();
      }
    });
  }

  bindRightDock() {
    const dock = this.root.querySelector('#td-right-dock');
    const panel = this.root.querySelector('#td-dock-panel');
    const rail = dock?.querySelector('.td-dock-rail');
    const closeBtn = this.root.querySelector('#td-dock-close');

    rail?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-dock-btn');
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (this.activeDockTab === tab && panel.style.display !== 'none') {
        panel.style.display = 'none';
        btn.classList.remove('active');
      } else {
        rail.querySelectorAll('.td-dock-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        panel.style.display = 'flex';
        this.activeDockTab = tab;
        this.renderDockContent(tab);
      }
    });

    closeBtn?.addEventListener('click', () => {
      panel.style.display = 'none';
      rail.querySelectorAll('.td-dock-btn').forEach(b => b.classList.remove('active'));
    });

    this.renderDockContent('watchlist');
  }

  renderDockContent(tab) {
    const titleEl = this.root.querySelector('#td-dock-title');
    const contentEl = this.root.querySelector('#td-dock-content');
    if (!titleEl || !contentEl) return;

    if (tab === 'watchlist') {
      titleEl.textContent = 'TOP PAIRS WATCHLIST';
      contentEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${TD_SYMBOLS.map(s => `
            <div class="td-wl-item ${s.symbol === this.symbol ? 'active' : ''}" data-symbol="${s.symbol}">
              <div><strong>${s.symbol}</strong> <span style="font-size:10px;color:var(--td-text-muted)">${s.name}</span></div>
              <div style="color:var(--td-up);font-weight:600;">LIVE</div>
            </div>
          `).join('')}
        </div>
      `;
      contentEl.querySelectorAll('.td-wl-item').forEach(item => {
        item.addEventListener('click', () => {
          const sym = item.dataset.symbol;
          if (sym && sym !== this.symbol) this.switchSymbol(sym);
        });
      });
    } else if (tab === 'dom') {
      titleEl.textContent = 'ORDER BOOK DOM';
      contentEl.innerHTML = `
        <table class="td-dom-table" id="td-dom-table-body">
          <thead><tr><th>Price</th><th>Size</th><th>Total</th></tr></thead>
          <tbody></tbody>
        </table>
      `;
      this.renderDOMTable();
    } else if (tab === 'trade') {
      titleEl.textContent = 'QUICK TRADE & PROP GUARD';
      const curPrice = this.store.getLatest()?.close || 95000;
      contentEl.innerHTML = `
        <div class="td-trade-box">
          <div class="td-prop-guard-card">
            <div class="td-prop-guard-title"><span>🛡️ PROP FIRM SHIELD</span><span>ACTIVE</span></div>
            <div class="td-prop-guard-row"><span>Account Size:</span><span>$100,000</span></div>
            <div class="td-prop-guard-row"><span>Daily Loss Limit (5%):</span><span>$5,000</span></div>
            <div class="td-prop-guard-row"><span>Max Drawdown (10%):</span><span>$10,000</span></div>
            <div class="td-prop-guard-row"><span>Live PnL:</span><span id="td-prop-pnl" style="color:var(--td-up)">+$0.00</span></div>
          </div>

          <div class="td-trade-btn-row">
            <button class="td-btn-buy" id="td-trade-buy">BUY / LONG</button>
            <button class="td-btn-sell" id="td-trade-sell">SELL / SHORT</button>
          </div>

          <div class="td-trade-field">
            <label>Order Size (${this.symbol.replace('USDT', '')}):</label>
            <input type="number" id="td-trade-size" value="0.5" step="0.1">
          </div>

          <div class="td-trade-field">
            <label>Bracket Stop Loss (Price):</label>
            <input type="number" id="td-trade-sl" value="${(curPrice * 0.985).toFixed(1)}">
          </div>

          <div class="td-trade-field">
            <label>Bracket Take Profit (Price):</label>
            <input type="number" id="td-trade-tp" value="${(curPrice * 1.03).toFixed(1)}">
          </div>
        </div>
      `;

      this.root.querySelector('#td-trade-buy')?.addEventListener('click', () => {
        const qty = parseFloat(this.root.querySelector('#td-trade-size').value) || 0.1;
        const sl = parseFloat(this.root.querySelector('#td-trade-sl').value);
        const tp = parseFloat(this.root.querySelector('#td-trade-tp').value);
        this.tradeEngine.placeOrder(this.symbol, 'BUY', qty, curPrice, sl, tp);
        alert(`Order Executed: LONG ${qty} ${this.symbol} @ $${curPrice}`);
      });

      this.root.querySelector('#td-trade-sell')?.addEventListener('click', () => {
        const qty = parseFloat(this.root.querySelector('#td-trade-size').value) || 0.1;
        const sl = parseFloat(this.root.querySelector('#td-trade-sl').value);
        const tp = parseFloat(this.root.querySelector('#td-trade-tp').value);
        this.tradeEngine.placeOrder(this.symbol, 'SELL', qty, curPrice, sl, tp);
        alert(`Order Executed: SHORT ${qty} ${this.symbol} @ $${curPrice}`);
      });
    } else if (tab === 'alerts') {
      titleEl.textContent = 'PRICE ALERTS';
      const curPrice = this.store.getLatest()?.close || 95000;
      contentEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:6px;">
            <input type="number" id="td-new-alert-price" value="${(curPrice * 1.01).toFixed(1)}" style="flex:1;height:28px;padding:0 8px;background:var(--td-bg);border:1px solid var(--td-border);color:var(--td-text);border-radius:4px;font-family:var(--td-font-mono);">
            <button class="td-action-btn" id="td-add-alert-btn" style="height:28px;">+ Add Alert</button>
          </div>
          <div id="td-alerts-list" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;">
            ${this.alertsEngine.alerts.map(a => `
              <div class="td-alert-item">
                <span>${a.symbol} @ $${a.targetPrice}</span>
                <span class="td-alert-badge ${a.triggered ? 'triggered' : 'active'}">${a.triggered ? 'TRIGGERED' : 'ACTIVE'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      this.root.querySelector('#td-add-alert-btn')?.addEventListener('click', () => {
        const target = parseFloat(this.root.querySelector('#td-new-alert-price').value);
        if (target) {
          this.alertsEngine.addAlert(this.symbol, target, curPrice);
          this.renderDockContent('alerts');
        }
      });
    }
  }

  renderDOMTable() {
    const tbody = this.root.querySelector('#td-dom-table-body tbody');
    if (!tbody || this.store.heatmap.currentAsks.length === 0) return;

    const asks = this.store.heatmap.currentAsks.slice(0, 7).reverse();
    const bids = this.store.heatmap.currentBids.slice(0, 7);

    let html = '';
    asks.forEach(([p, q]) => {
      html += `<tr class="ask"><td>${tdFmtPrice(p, this.symbolInfo.decimals)}</td><td>${tdFmtVol(q)}</td><td>${tdFmtUSD(p * q)}</td></tr>`;
    });

    const spread = asks.length > 0 && bids.length > 0 ? (asks[asks.length - 1][0] - bids[0][0]) : 0;
    html += `<tr><td colspan="3" class="td-dom-spread-row">SPREAD: $${spread.toFixed(2)}</td></tr>`;

    bids.forEach(([p, q]) => {
      html += `<tr class="bid"><td>${tdFmtPrice(p, this.symbolInfo.decimals)}</td><td>${tdFmtVol(q)}</td><td>${tdFmtUSD(p * q)}</td></tr>`;
    });

    tbody.innerHTML = html;
  }

  switchLayout(layout) {
    this.layout = layout;
    const grid = this.root.querySelector('#td-panes-grid');
    if (!grid) return;

    grid.className = `td-panes-grid layout-${layout}`;

    // Update cells
    let cellCount = 1;
    if (layout === '2v' || layout === '2h') cellCount = 2;
    else if (layout === '4g') cellCount = 4;

    grid.innerHTML = '';
    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement('div');
      cell.className = `td-pane-cell ${i === 0 ? 'active-pane' : ''}`;
      cell.id = `td-pane-${i}`;
      grid.appendChild(cell);
    }

    // Mount primary chart into pane-0
    const p0 = grid.querySelector('#td-pane-0');
    if (p0) {
      p0.appendChild(this.chart.baseCanvas);
      p0.appendChild(this.chart.overlayCanvas);
      p0.appendChild(this.chart.liqTooltip);
      p0.appendChild(this.chart.footprintHint);
      this.chart.container = p0;
      this.chart.resize();
      this.chart.requestRender();
    }
  }

  startFundingClock() {
    const updateFunding = () => {
      const now = new Date();
      const nextHour = (Math.floor(now.getUTCHours() / 8) + 1) * 8;
      const nextFunding = new Date(now);
      nextFunding.setUTCHours(nextHour, 0, 0, 0);

      const diffMs = nextFunding - now;
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);

      const el = this.root.querySelector('#td-stat-funding');
      if (el) el.textContent = `+0.0100% (${hrs}h ${mins}m)`;
    };
    updateFunding();
    this.fundingTimer = setInterval(updateFunding, 30000);
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
        this.alertsEngine.checkPrice(this.symbol, liveCandle.close, (a) => this.showToastAlert(a));
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
        if (this.layers.heatmap) this.chart.requestRender();
        if (this.activeDockTab === 'dom') this.renderDOMTable();
      },
      onAggTrade: (trade) => {
        this.store.onAggTrade(trade, this.symbolInfo);
        if (this.layers.cvd || this.layers.footprint) this.chart.requestRender();
      },
      onLiquidation: (liq) => {
        this.store.onLiquidation(liq);
        if (this.layers.liq) this.chart.requestRender();
      },
      onOpenInterest: (data, isHist) => {
        this.store.onOpenInterest(data, isHist);
        if (this.layers.oi) this.chart.requestRender();
      },
      onStatusChange: (status) => {
        this.updateStatusBadge(status);
      }
    });
  }

  showToastAlert(alert) {
    const toast = this.root.querySelector('#td-alert-toast');
    const msg = this.root.querySelector('#td-alert-toast-msg');
    if (toast && msg) {
      msg.textContent = `ALERT: ${alert.symbol} crossed $${alert.targetPrice}!`;
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 6000);
    }
  }

  switchSymbol(newSym) {
    this.symbol = newSym;
    this.symbolInfo = TD_SYMBOLS.find(s => s.symbol === newSym) || { symbol: newSym, decimals: 2, tickSize: 0.01 };
    this.root.querySelector('#td-sym-name').textContent = this.symbol;
    this.chart.symbolInfo = this.symbolInfo;
    this.chart.drawings.symbol = newSym;
    this.chart.drawings.load();
    this.chart.resetView();

    this.provider.disconnect();
    this.connectFeed();
    this.renderDockContent(this.activeDockTab);
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
    clearInterval(this.fundingTimer);
    this.provider.disconnect();
    this.chart.destroy();
  }
}

// ─── 8. AUTO-BOOTLOADER ─────────────────────────────────────────────────────

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
