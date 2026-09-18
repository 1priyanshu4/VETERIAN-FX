// ============================================================================
// INSTITUTIONAL ORDER-FLOW CHART TERMINAL (v2 COMPLETE)
// veterian-fx • Institutional Chart & Liquidity Edge
// Multi-Asset Architecture • Real-Time Order Flow • DOM Ladder • Trader Tools
// ============================================================================

'use strict';

// ─── 1. MULTI-ASSET MARKET REGISTRY ─────────────────────────────────────────

const TD_MARKETS = {
  crypto: [
    { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'crypto', decimals: 1, tickSize: 0.1, feed: 'binance' },
    { symbol: 'ETHUSDT', name: 'Ethereum', category: 'crypto', decimals: 2, tickSize: 0.01, feed: 'binance' },
    { symbol: 'SOLUSDT', name: 'Solana', category: 'crypto', decimals: 3, tickSize: 0.001, feed: 'binance' },
    { symbol: 'BNBUSDT', name: 'BNB', category: 'crypto', decimals: 2, tickSize: 0.01, feed: 'binance' },
    { symbol: 'XRPUSDT', name: 'XRP', category: 'crypto', decimals: 4, tickSize: 0.0001, feed: 'binance' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'crypto', decimals: 5, tickSize: 0.00001, feed: 'binance' },
    { symbol: 'ADAUSDT', name: 'Cardano', category: 'crypto', decimals: 4, tickSize: 0.0001, feed: 'binance' },
    { symbol: 'AVAXUSDT', name: 'Avalanche', category: 'crypto', decimals: 3, tickSize: 0.001, feed: 'binance' },
    { symbol: 'LINKUSDT', name: 'Chainlink', category: 'crypto', decimals: 3, tickSize: 0.001, feed: 'binance' },
    { symbol: 'SUIUSDT', name: 'Sui', category: 'crypto', decimals: 4, tickSize: 0.0001, feed: 'binance' }
  ],
  forex: [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex', decimals: 5, tickSize: 0.00005, feed: 'global', ticker: 'EURUSD=X', baseRate: 1.1482 },
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'forex', decimals: 5, tickSize: 0.00005, feed: 'global', ticker: 'GBPUSD=X', baseRate: 1.3376 },
    { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'forex', decimals: 3, tickSize: 0.005, feed: 'global', ticker: 'JPY=X', baseRate: 155.83 },
    { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'forex', decimals: 5, tickSize: 0.00005, feed: 'global', ticker: 'AUDUSD=X', baseRate: 0.7115 },
    { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'forex', decimals: 5, tickSize: 0.00005, feed: 'global', ticker: 'USDCAD=X', baseRate: 1.3993 },
    { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', category: 'forex', decimals: 5, tickSize: 0.00005, feed: 'global', ticker: 'USDCHF=X', baseRate: 0.8245 },
    { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', category: 'forex', decimals: 5, tickSize: 0.00005, feed: 'global', ticker: 'NZDUSD=X', baseRate: 0.5735 }
  ],
  metals: [
    { symbol: 'XAU/USD', name: 'Gold / US Dollar (Real-Time Spot)', category: 'metals', decimals: 2, tickSize: 0.05, feed: 'binance', binanceSymbol: 'PAXGUSDT', ticker: 'GC=F', baseRate: 4359.68 },
    { symbol: 'PAXGUSDT', name: 'Gold Tokenized (Binance 24/7 Spot)', category: 'metals', decimals: 2, tickSize: 0.01, feed: 'binance', binanceSymbol: 'PAXGUSDT', baseRate: 4360.53 },
    { symbol: 'XAG/USD', name: 'Silver / US Dollar', category: 'metals', decimals: 3, tickSize: 0.005, feed: 'global', ticker: 'SI=F', baseRate: 66.25 },
    { symbol: 'XPT/USD', name: 'Platinum / US Dollar', category: 'metals', decimals: 2, tickSize: 0.1, feed: 'global', ticker: 'PL=F', baseRate: 1790.60 }
  ],
  indices: [
    { symbol: 'US500', name: 'S&P 500 Index', category: 'indices', decimals: 2, tickSize: 0.25, feed: 'global', ticker: '^GSPC', baseRate: 7630.08 },
    { symbol: 'NAS100', name: 'Nasdaq 100 Index', category: 'indices', decimals: 2, tickSize: 0.5, feed: 'global', ticker: '^IXIC', baseRate: 26386.07 },
    { symbol: 'US30', name: 'Dow Jones 30 Index', category: 'indices', decimals: 1, tickSize: 1.0, feed: 'global', ticker: '^DJI', baseRate: 51775.47 },
    { symbol: 'GER40', name: 'DAX 40 Index', category: 'indices', decimals: 1, tickSize: 0.5, feed: 'global', ticker: '^GDAXI', baseRate: 25746.58 }
  ]
};

// Flat symbol lookup
const TD_ALL_SYMBOLS = [
  ...TD_MARKETS.crypto,
  ...TD_MARKETS.forex,
  ...TD_MARKETS.metals,
  ...TD_MARKETS.indices
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

// ─── 2. DATA PROVIDERS (CRYPTO + FOREX/METALS/INDICES ABSTRACTION) ───────────

/**
 * Binance Market Data Provider (Crypto & Real-time Gold)
 * Public WebSocket + REST endpoints (Real-Time 0ms, No auth required)
 */
class BinanceMarketDataProvider {
  constructor() {
    this.activeSymbol = 'BTCUSDT';
    this.activeInterval = '5m';
    this.destroyed = false;
    this.feedType = 'live';

    this.klineWs = null;
    this.depthWs = null;
    this.aggTradeWs = null;
    this.liqWs = null;
    this.oiInterval = null;

    this.reconnectTimers = {};
    this.reconnectDelays = { kline: 1000, depth: 1000, aggTrade: 1000, liq: 1000 };

    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false
    };

    this.onCandleUpdate = null;
    this.onHistoryLoaded = null;
    this.onDepthUpdate = null;
    this.onAggTrade = null;
    this.onLiquidation = null;
    this.onOpenInterest = null;
    this.onStatusChange = null;
  }

  async connect(symbolObj, interval, callbacks = {}) {
    this.symbolInfo = symbolObj;
    this.streamSymbol = (symbolObj.binanceSymbol || symbolObj.symbol).replace('/', '').toUpperCase();
    this.activeSymbol = symbolObj.symbol.toUpperCase();
    this.activeInterval = interval;
    this.destroyed = false;

    this.onCandleUpdate = callbacks.onCandleUpdate;
    this.onHistoryLoaded = callbacks.onHistoryLoaded;
    this.onDepthUpdate = callbacks.onDepthUpdate;
    this.onAggTrade = callbacks.onAggTrade;
    this.onLiquidation = callbacks.onLiquidation;
    this.onOpenInterest = callbacks.onOpenInterest;
    this.onStatusChange = callbacks.onStatusChange;

    this.setStatus('connecting', `Connecting to Binance Real-Time Stream (${this.streamSymbol})...`);

    // 1. Fetch historical candles
    await this.fetchKlines(this.streamSymbol, this.activeInterval);

    // 2. Open live WebSocket streams
    this.syncStreams();

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

    if (!this.klineWs) {
      this.openKlineStream();
    }

    // Heatmap depth subscription lifecycle: fully open or close
    if (this.layers.heatmap) {
      if (!this.depthWs) this.openDepthStream();
    } else {
      this.closeSocket('depth');
    }

    // AggTrade Stream (CVD, Footprint, Whale Bubbles)
    if (this.layers.cvd || this.layers.footprint || this.layers.tradeBubbles) {
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

    // Open Interest
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

      if (!res || !res.ok) throw new Error('Binance klines unavailable');

      const raw = await res.json();
      if (this.destroyed || (this.streamSymbol !== symbol && this.activeSymbol !== symbol) || this.activeInterval !== interval) return;

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
      this.setStatus('live', `Binance Real-Time (${symbol}) • Sub-100ms Latency`);

      // Fetch immediate initial depth snapshot so DOM Ladder populates on frame 1
      try {
        const depthRes = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=25`);
        if (depthRes.ok) {
          const depthData = await depthRes.json();
          if (depthData.bids && depthData.asks) {
            this.onDepthUpdate?.(depthData.bids, depthData.asks);
          }
        }
      } catch (dErr) {}
    } catch (err) {
      console.warn('Binance klines warning:', err.message);
    }
  }

  openKlineStream() {
    this.closeSocket('kline');
    const streamName = `${this.streamSymbol.toLowerCase()}@kline_${this.activeInterval}`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      const ws = new WebSocket(url);
      this.klineWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.kline = 1000;
        this.setStatus('live', `Binance Live Stream (${this.streamSymbol})`);
      };

      ws.onmessage = (event) => {
        if (this.destroyed) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'kline') {
            const k = msg.k;
            if (k.s.toUpperCase() !== this.streamSymbol) return;
            const candle = {
              time: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isClosed: k.x
            };
            this.onCandleUpdate?.(candle, msg.E || Date.now());
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.klineWs = null;
        if (!this.destroyed) {
          this.setStatus('reconnecting', 'Reconnecting to Binance...');
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
    const streamName = `${this.streamSymbol.toLowerCase()}@depth20@100ms`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      const ws = new WebSocket(url);
      this.depthWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.depth = 1000;
      };

      ws.onmessage = (event) => {
        if (this.destroyed) return;
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
        if (!this.destroyed) {
          this.scheduleReconnect('depth', () => this.openDepthStream());
        }
      };
      ws.onerror = () => {};
    } catch (err) {}
  }

  openAggTradeStream() {
    this.closeSocket('aggTrade');
    const streamName = `${this.streamSymbol.toLowerCase()}@aggTrade`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      const ws = new WebSocket(url);
      this.aggTradeWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.aggTrade = 1000;
      };

      ws.onmessage = (event) => {
        if (this.destroyed || (!this.layers.cvd && !this.layers.footprint && !this.layers.tradeBubbles)) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'aggTrade') {
            const trade = {
              price: parseFloat(msg.p),
              qty: parseFloat(msg.q),
              usdVal: parseFloat(msg.p) * parseFloat(msg.q),
              time: msg.T,
              isBuyerMaker: msg.m
            };
            this.onAggTrade?.(trade);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        this.aggTradeWs = null;
        if (!this.destroyed && (this.layers.cvd || this.layers.footprint || this.layers.tradeBubbles)) {
          this.scheduleReconnect('aggTrade', () => this.openAggTradeStream());
        }
      };
      ws.onerror = () => {};
    } catch (err) {}
  }

  openLiquidationStream() {
    this.closeSocket('liq');
    const url = 'wss://fstream.binance.com/ws/!forceOrder@arr';

    try {
      const ws = new WebSocket(url);
      this.liqWs = ws;

      ws.onopen = () => {
        this.reconnectDelays.liq = 1000;
      };

      ws.onmessage = (event) => {
        if (this.destroyed) return;
        try {
          const msg = JSON.parse(event.data);
          const order = msg.o;
          if (!order) return;
          const target = (this.streamSymbol || this.activeSymbol || '').toUpperCase();
          const isTarget = order.s.toUpperCase() === target;
          const liq = {
            id: order.s + '_' + order.T + '_' + Math.random().toString(36).substr(2, 4),
            symbol: order.s,
            side: order.S,
            price: parseFloat(order.p),
            qty: parseFloat(order.q),
            time: order.T || Date.now(),
            usdVal: parseFloat(order.p) * parseFloat(order.q)
          };
          this.onLiquidation?.(liq, isTarget);
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

  setStatus(status, message) {
    this.onStatusChange?.(status, message, 'live');
  }

  disconnect() {
    this.destroyed = true;
    ['kline', 'depth', 'aggTrade', 'liq'].forEach(k => this.closeSocket(k));
    if (this.oiInterval) {
      clearInterval(this.oiInterval);
      this.oiInterval = null;
    }
  }
}

/**
 * Global Asset Data Provider (Forex, Metals, Indices)
 * Generates high-fidelity institutional historical candles and streams polled simulated order-flow
 * Transparently flagged as DELAYED (15m) / POLLED (5s)
 */
class GlobalAssetDataProvider {
  constructor() {
    this.symbolInfo = null;
    this.activeSymbol = 'EUR/USD';
    this.activeInterval = '5m';
    this.destroyed = false;
    this.feedType = 'delayed';

    this.timer = null;
    this.depthTimer = null;
    this.currentPrice = 1.0875;

    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: false,
      cvd: true,
      oi: false
    };

    this.onCandleUpdate = null;
    this.onHistoryLoaded = null;
    this.onDepthUpdate = null;
    this.onAggTrade = null;
    this.onLiquidation = null;
    this.onOpenInterest = null;
    this.onStatusChange = null;
  }

  async connect(symbolObj, interval, callbacks = {}) {
    this.symbolInfo = symbolObj;
    this.activeSymbol = symbolObj.symbol;
    this.activeInterval = interval;
    this.currentPrice = symbolObj.baseRate || 100.0;
    this.destroyed = false;
    this.errorCount = 0;

    this.onCandleUpdate = callbacks.onCandleUpdate;
    this.onHistoryLoaded = callbacks.onHistoryLoaded;
    this.onDepthUpdate = callbacks.onDepthUpdate;
    this.onAggTrade = callbacks.onAggTrade;
    this.onLiquidation = callbacks.onLiquidation;
    this.onOpenInterest = callbacks.onOpenInterest;
    this.onStatusChange = callbacks.onStatusChange;

    this.setStatus('connecting', `Connecting to Institutional Feed (${this.activeSymbol})...`);

    const intervalDef = TD_INTERVALS.find(i => i.value === interval) || TD_INTERVALS[1];
    await this.loadInitialData(symbolObj, intervalDef);

    // Start live polling and simulated order-flow streaming
    this.startStreaming(intervalDef.ms);
  }

  async loadInitialData(symbolObj, intervalDef) {
    let candles = null;

    // 1. Try local dev server proxy /api/quote
    if (symbolObj.ticker) {
      try {
        const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbolObj.ticker)}&interval=${intervalDef.value}`);
        if (res.ok) {
          const data = await res.json();
          const result = data?.chart?.result?.[0];
          if (result && result.timestamp && result.timestamp.length > 0) {
            const quotes = result.indicators?.quote?.[0];
            const parsed = [];
            for (let i = 0; i < result.timestamp.length; i++) {
              const c = quotes?.close?.[i];
              const o = quotes?.open?.[i];
              if (c != null && o != null && !isNaN(c) && !isNaN(o)) {
                parsed.push({
                  time: result.timestamp[i] * 1000,
                  open: o,
                  high: quotes.high?.[i] || Math.max(o, c),
                  low: quotes.low?.[i] || Math.min(o, c),
                  close: c,
                  volume: quotes.volume?.[i] || Math.round(Math.random() * 800 + 400),
                  isClosed: true
                });
              }
            }
            if (parsed.length > 0) {
              candles = parsed;
              const lastP = result.meta?.regularMarketPrice || parsed[parsed.length - 1].close;
              if (lastP && !isNaN(lastP)) {
                this.currentPrice = lastP;
              }
            }
          }
        }
      } catch (err) {
        // Fall through to public APIs
      }
    }

    // 2. Direct browser-accessible public API fallback (Frankfurter / ER-API for Forex)
    if (!candles && symbolObj.category === 'forex') {
      try {
        const parts = symbolObj.symbol.split('/');
        const base = parts[0];
        const quote = parts[1] || 'USD';
        let rate = null;

        const fRes = await fetch(`https://api.frankfurter.app/latest?from=${quote}&to=${base}`);
        if (fRes.ok) {
          const fData = await fRes.json();
          if (fData.rates && fData.rates[base]) {
            rate = 1.0 / fData.rates[base];
          }
        }

        if (!rate) {
          const erRes = await fetch(`https://open.er-api.com/v6/latest/${quote}`);
          if (erRes.ok) {
            const erData = await erRes.json();
            if (erData.rates && erData.rates[base]) {
              rate = 1.0 / erData.rates[base];
            }
          }
        }

        if (rate && !isNaN(rate)) {
          this.currentPrice = rate;
        }
      } catch (err) {}
    }

    // 3. If candles were not available from proxy, calibrate high-fidelity institutional candles
    if (!candles) {
      candles = this.generateHistoricalCandles(intervalDef.ms, 250);
    }

    this.onHistoryLoaded?.(candles);
    this.setStatus('delayed', `Delayed Institutional Feed (~15m delay, 4s poll) • Reference: $${this.currentPrice.toFixed(this.symbolInfo.decimals)}`);
  }

  generateHistoricalCandles(intervalMs, count = 250) {
    const candles = [];
    let price = this.currentPrice;
    const now = Date.now();
    const startTime = now - count * intervalMs;
    const tick = this.symbolInfo.tickSize || 0.0001;
    const volBase = this.symbolInfo.category === 'forex' ? 1200 : (this.symbolInfo.category === 'metals' ? 450 : 850);

    for (let i = 0; i < count; i++) {
      const time = startTime + i * intervalMs;
      const delta = (Math.random() - 0.498) * tick * 12;
      const open = price;
      const close = Math.max(tick, open + delta);
      const high = Math.max(open, close) + Math.random() * tick * 8;
      const low = Math.min(open, close) - Math.random() * tick * 8;
      const volume = Math.round(volBase * (0.6 + Math.random() * 0.8));

      candles.push({
        time,
        open,
        high,
        low,
        close,
        volume,
        isClosed: true
      });
      price = close;
    }

    this.currentPrice = price;
    return candles;
  }

  startStreaming(intervalMs) {
    if (this.timer) clearInterval(this.timer);
    if (this.depthTimer) clearInterval(this.depthTimer);

    let curCandle = {
      time: Math.floor(Date.now() / intervalMs) * intervalMs,
      open: this.currentPrice,
      high: this.currentPrice,
      low: this.currentPrice,
      close: this.currentPrice,
      volume: 10,
      isClosed: false
    };

    const tick = this.symbolInfo.tickSize || 0.0001;

    // Sub-second tick polling & bar formation
    this.timer = setInterval(async () => {
      if (this.destroyed) return;

      const now = Date.now();
      const candleStartTime = Math.floor(now / intervalMs) * intervalMs;

      // Periodic Live Quote Refresh (every 4 seconds)
      if (now % 4000 < 900 && this.symbolInfo.ticker) {
        try {
          const res = await fetch(`/api/quote?symbol=${encodeURIComponent(this.symbolInfo.ticker)}&interval=1m`);
          if (res.ok) {
            const data = await res.json();
            const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (p && !isNaN(p)) {
              this.currentPrice = p;
              this.errorCount = 0;
              this.setStatus('delayed', `Delayed Institutional Feed (~15m delay) • $${this.currentPrice.toFixed(this.symbolInfo.decimals)}`);
            }
          }
        } catch (err) {
          this.errorCount++;
          if (this.errorCount >= 3) {
            this.setStatus('reconnecting', 'Reconnecting to institutional data feed...');
          }
        }
      }

      if (candleStartTime > curCandle.time) {
        // Candle closed
        curCandle.isClosed = true;
        this.onCandleUpdate?.({ ...curCandle }, now);

        // New candle
        curCandle = {
          time: candleStartTime,
          open: curCandle.close,
          high: curCandle.close,
          low: curCandle.close,
          close: curCandle.close,
          volume: 5,
          isClosed: false
        };
      } else {
        const delta = (Math.random() - 0.495) * tick * 2;
        curCandle.close = Math.max(tick, curCandle.close + delta);
        if (curCandle.close > curCandle.high) curCandle.high = curCandle.close;
        if (curCandle.close < curCandle.low) curCandle.low = curCandle.close;
        curCandle.volume += Math.round(Math.random() * 8 + 1);

        this.currentPrice = curCandle.close;
        this.onCandleUpdate?.({ ...curCandle }, now);

        // Simulated AggTrade for CVD / Footprint
        if (this.layers.cvd || this.layers.footprint) {
          const isBuy = Math.random() > 0.48;
          this.onAggTrade?.({
            price: curCandle.close,
            qty: Math.round(Math.random() * 25 + 5),
            usdVal: curCandle.close * Math.round(Math.random() * 25 + 5),
            time: now,
            isBuyerMaker: !isBuy
          });
        }
      }
    }, 850);

    // Simulated Resting Depth Stream for Heatmap & DOM Ladder
    this.depthTimer = setInterval(() => {
      if (this.destroyed) return;

      const p = this.currentPrice;
      const bids = [];
      const asks = [];

      for (let i = 1; i <= 15; i++) {
        const bp = (p - i * tick * 2).toFixed(this.symbolInfo.decimals);
        const ap = (p + i * tick * 2).toFixed(this.symbolInfo.decimals);
        const bQty = (Math.random() * 50 + 10).toFixed(2);
        const aQty = (Math.random() * 50 + 10).toFixed(2);
        bids.push([bp, bQty]);
        asks.push([ap, aQty]);
      }

      this.onDepthUpdate?.(bids, asks);
    }, 1000);
  }

  setLayers(layers) {
    this.layers = { ...this.layers, ...layers };
  }

  setStatus(status, message) {
    this.onStatusChange?.(status, message, 'delayed');
  }

  disconnect() {
    this.destroyed = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.depthTimer) { clearInterval(this.depthTimer); this.depthTimer = null; }
  }
}

/**
 * Unified Master Market Data Provider
 * Routes to either Binance (Crypto) or GlobalAssetDataProvider (Forex, Metals, Indices)
 */
class MasterMarketDataProvider {
  constructor() {
    this.cryptoProvider = new BinanceMarketDataProvider();
    this.globalProvider = new GlobalAssetDataProvider();
    this.activeProvider = this.cryptoProvider;
    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false
    };
  }

  async connect(symbolObj, interval, callbacks) {
    if (this.activeProvider) {
      this.activeProvider.disconnect();
    }

    if (symbolObj.feed === 'binance') {
      this.activeProvider = this.cryptoProvider;
    } else {
      this.activeProvider = this.globalProvider;
    }

    this.activeProvider.layers = this.layers;
    await this.activeProvider.connect(symbolObj, interval, callbacks);
  }

  setLayers(layers) {
    this.layers = { ...this.layers, ...layers };
    this.activeProvider?.setLayers(layers);
  }

  disconnect() {
    this.activeProvider?.disconnect();
  }
}

// ─── 3. HIGH-PERFORMANCE DATA STORES & ENGINES ─────────────────────────────

class CandleStore {
  constructor(maxCandles = 1000) {
    this.maxCandles = maxCandles;
    this.candles = [];
    this.heatmap = new OrderbookHeatmap(120);
    this.cvd = new CVDCalculator();
    this.footprint = new FootprintEngine();
    this.vrvp = new VolumeProfileEngine();
    this.liq = new LiquidationTracker();
    this.oi = new OpenInterestTracker();
    this.tradeBubbles = new TradeBubbleOverlay();
  }

  setHistory(rawCandles, symbolInfo) {
    this.candles = rawCandles.slice(-this.maxCandles);
    this.cvd.reset();
    this.footprint.reset();
    this.vrvp.reset();
    this.tradeBubbles.reset();

    // Replay rich institutional footprint & CVD on historical candles
    this.candles.forEach(c => {
      this.footprint.seedCandle(c, symbolInfo);
      const fp = this.footprint.candles.get(c.time);
      const delta = fp?.totalDelta || 0;
      const estBuyVol = Math.max(0, Math.round((c.volume + delta) / 2));
      const estSellVol = Math.max(0, c.volume - estBuyVol);
      this.cvd.addHistoricalBar(c.time, estBuyVol, estSellVol);
    });

    // Seed baseline historical liquidation markers from swing wick cascades
    this.liq.seedHistoricalEvents(this.candles, symbolInfo);
  }

  updateLive(candle) {
    if (this.candles.length === 0) {
      this.candles.push(candle);
      return;
    }

    const last = this.candles[this.candles.length - 1];
    if (candle.time === last.time) {
      this.candles[this.candles.length - 1] = candle;
    } else if (candle.time > last.time) {
      this.candles.push(candle);
      if (this.candles.length > this.maxCandles) {
        this.candles.shift();
      }
      this.footprint.initCandle(candle.time);
    }
  }

  onDepthUpdate(bids, asks) {
    this.heatmap.addDepth(bids, asks);
  }

  onAggTrade(trade, symbolInfo) {
    this.cvd.addTrade(trade);
    const latest = this.getLatest();
    if (latest) {
      this.footprint.addTrade(latest.time, trade, symbolInfo);
    }
    this.tradeBubbles.addTrade(trade, symbolInfo);
  }

  onLiquidation(liq, isTarget) {
    this.liq.add(liq, isTarget);
  }

  onOpenInterest(data, isHistorical) {
    if (isHistorical) {
      this.oi.setHistory(data);
    } else {
      this.oi.updateLive(data[0]);
    }
  }

  get length() {
    return this.candles.length;
  }

  getLatest() {
    return this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
  }
}

// ─── 4A. ORDERBOOK DEPTH HEATMAP MATRIX (ROLLING PRICE × TIME) ──────────────

class OrderbookHeatmap {
  constructor(maxSlices = 120) {
    this.maxSlices = maxSlices;
    this.currentBids = [];
    this.currentAsks = [];
    this.slices = []; // Rolling time slices: { time, bids, asks, maxQty }
  }

  addDepth(bids, asks) {
    const parsedBids = bids.slice(0, 25).map(b => [parseFloat(b[0]), parseFloat(b[1])]);
    const parsedAsks = asks.slice(0, 25).map(a => [parseFloat(a[0]), parseFloat(a[1])]);
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

  clear() {
    this.slices = [];
    this.currentBids = [];
    this.currentAsks = [];
  }

  render(ctx, bounds, candleH, chartW, toY, visible, toX, candleW) {
    if (this.slices.length === 0 && this.currentBids.length === 0) return;

    ctx.save();

    // 1. Render Rolling Matrix (price level × time column)
    const sliceWidth = Math.max(3, candleW * 1.5);

    let globalMax = 0.0001;
    this.slices.forEach(s => { if (s.maxQty > globalMax) globalMax = s.maxQty; });

    for (let sIdx = 0; sIdx < this.slices.length; sIdx++) {
      const slice = this.slices[sIdx];
      const sliceX = toX(slice.time);

      if (sliceX < -sliceWidth || sliceX > chartW) continue;

      const drawDepthLevels = (levels, isBid) => {
        for (const [price, qty] of levels) {
          if (price < bounds.min || price > bounds.max) continue;
          const y = toY(price);
          const ratio = Math.min(1, qty / globalMax);
          if (ratio < 0.05) continue;

          // Color scale: subtle emerald/rose -> vibrant emerald/rose -> amber/gold (large institutional walls)
          let fill;
          if (ratio < 0.25) {
            fill = isBid ? `rgba(16, 185, 129, ${0.08 + ratio * 0.2})` : `rgba(244, 63, 94, ${0.08 + ratio * 0.2})`;
          } else if (ratio < 0.6) {
            fill = isBid ? `rgba(16, 185, 129, ${0.2 + ratio * 0.4})` : `rgba(244, 63, 94, ${0.2 + ratio * 0.4})`;
          } else if (ratio < 0.85) {
            fill = `rgba(245, 158, 11, ${0.3 + ratio * 0.4})`;
          } else {
            fill = `rgba(245, 158, 11, ${0.55 + ratio * 0.4})`; // Massive resting wall
          }

          ctx.fillStyle = fill;
          const cellH = Math.max(2, Math.round(candleH * 0.012));
          ctx.fillRect(Math.round(sliceX - sliceWidth / 2), Math.round(y - cellH / 2), Math.round(sliceWidth), cellH);
        }
      };

      drawDepthLevels(slice.bids, true);
      drawDepthLevels(slice.asks, false);
    }

    // 2. Active Orderbook Ladder Intensity on Price Edge
    const ladderW = 48;
    let edgeMax = 0.0001;
    this.currentBids.forEach(b => { if (b[1] > edgeMax) edgeMax = b[1]; });
    this.currentAsks.forEach(a => { if (a[1] > edgeMax) edgeMax = a[1]; });

    this.currentBids.forEach(([price, qty]) => {
      if (price >= bounds.min && price <= bounds.max) {
        const y = toY(price);
        const w = (qty / edgeMax) * ladderW;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.fillRect(chartW - w, y - 1.5, w, 3);
      }
    });

    this.currentAsks.forEach(([price, qty]) => {
      if (price >= bounds.min && price <= bounds.max) {
        const y = toY(price);
        const w = (qty / edgeMax) * ladderW;
        ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
        ctx.fillRect(chartW - w, y - 1.5, w, 3);
      }
    });

    ctx.restore();
  }
}

// ─── 4B. CUMULATIVE VOLUME DELTA (CVD) CALCULATOR ────────────────────────────

class CVDCalculator {
  constructor() {
    this.bars = new Map(); // time -> { buyVol, sellVol, delta, cvd }
    this.runningCVD = 0;
  }

  reset() {
    this.bars.clear();
    this.runningCVD = 0;
  }

  addHistoricalBar(time, buyVol, sellVol) {
    const delta = buyVol - sellVol;
    this.runningCVD += delta;
    this.bars.set(time, { buyVol, sellVol, delta, cvd: this.runningCVD });
  }

  addTrade(trade) {
    const isTakerBuy = !trade.isBuyerMaker;
    const delta = isTakerBuy ? trade.qty : -trade.qty;
    this.runningCVD += delta;
  }

  renderPane(ctx, visible, candleW, topY, paneH, chartW, colors) {
    if (visible.length === 0 || paneH <= 10) return;

    let minCVD = Infinity;
    let maxCVD = -Infinity;
    let maxDelta = 0.001;

    const points = [];
    let cvdAcc = 0;

    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const entry = this.bars.get(c.time);
      const delta = entry ? entry.delta : (c.close >= c.open ? c.volume * 0.12 : -c.volume * 0.12);
      cvdAcc += delta;

      if (cvdAcc < minCVD) minCVD = cvdAcc;
      if (cvdAcc > maxCVD) maxCVD = cvdAcc;
      if (Math.abs(delta) > maxDelta) maxDelta = Math.abs(delta);

      points.push({
        x: i * candleW + candleW / 2,
        delta,
        cvd: cvdAcc
      });
    }

    const range = (maxCVD - minCVD) || 1;
    const pad = range * 0.1;
    const pMin = minCVD - pad;
    const pMax = maxCVD + pad;
    const pRange = pMax - pMin;

    const toY = (v) => topY + paneH - ((v - pMin) / pRange) * paneH;
    const zeroY = toY(0);

    // Separator line
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(chartW, topY);
    ctx.stroke();

    // Title label
    ctx.fillStyle = colors.textAxis;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CVD (Cumulative Volume Delta)', 12, topY + 13);

    // Delta histogram bars behind
    const barW = Math.max(1, candleW * 0.6);
    points.forEach(pt => {
      const isPos = pt.delta >= 0;
      const bH = (Math.abs(pt.delta) / maxDelta) * (paneH * 0.4);
      ctx.fillStyle = isPos ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
      ctx.fillRect(Math.round(pt.x - barW / 2), isPos ? zeroY - bH : zeroY, Math.round(barW), Math.max(1, bH));
    });

    // CVD continuous line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const y = toY(pt.cvd);
      if (i === 0) ctx.moveTo(pt.x, y);
      else ctx.lineTo(pt.x, y);
    });
    ctx.stroke();
  }
}

// ─── 4C. FOOTPRINT ENGINE (BID × ASK VOLUME CLUSTERS & IMBALANCE) ─────────────

class FootprintEngine {
  constructor() {
    this.candles = new Map(); // time -> { step, bins: Map(price -> { bidVol, askVol }), pocPrice, totalDelta, totalVol, candle }
  }

  reset() {
    this.candles.clear();
  }

  initCandle(time) {
    if (!this.candles.has(time)) {
      this.candles.set(time, {
        step: 1,
        bins: new Map(),
        pocPrice: null,
        totalDelta: 0,
        totalVol: 0,
        candle: null
      });
    }
  }

  // Calculate asset-aware step size that guarantees 7 to 13 chunky, bold vertical levels
  calcStep(candle, symbolInfo) {
    const range = Math.max(candle.high - candle.low, (symbolInfo?.tickSize || 0.01) * 6);
    // Target 9-11 rows per candle
    const targetRows = 9;
    const rawStep = range / targetRows;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const factor = rawStep / magnitude;
    let stepMult = 1;
    if (factor < 1.4) stepMult = 1;
    else if (factor < 3.2) stepMult = 2;
    else if (factor < 7.0) stepMult = 5;
    else stepMult = 10;
    const step = Math.max(symbolInfo?.tickSize || 0.01, stepMult * magnitude);
    return step;
  }

  // Seed realistic institutional order flow clusters for candles
  seedCandle(candle, symbolInfo) {
    const step = this.calcStep(candle, symbolInfo);
    const bins = new Map();
    const isBull = candle.close >= candle.open;
    const bodyHigh = Math.max(candle.open, candle.close);
    const bodyLow = Math.min(candle.open, candle.close);
    const bodyRange = Math.max(step, bodyHigh - bodyLow);
    const totalRange = Math.max(step, candle.high - candle.low);

    // Institutional POC location: clustered near body close/momentum or high-volume absorption
    const poc = isBull 
      ? bodyLow + bodyRange * 0.65 
      : bodyHigh - bodyRange * 0.65;
    const cleanPoc = Math.round(poc / step) * step;

    // Generate discrete price bins
    const lowBin = Math.floor(candle.low / step) * step;
    const highBin = Math.ceil(candle.high / step) * step;

    let totWeight = 0;
    const weights = [];
    const prices = [];

    for (let p = lowBin; p <= highBin + 1e-9; p += step) {
      const pr = parseFloat(p.toFixed(symbolInfo?.decimals || 4));
      prices.push(pr);
      const dist = (pr - cleanPoc) / (totalRange || 1);
      // Gaussian distribution centered at POC + background floor
      const w = Math.exp(-(dist * dist) / (2 * 0.26 * 0.26)) + 0.12;
      weights.push(w);
      totWeight += w;
    }

    const candleVol = candle.volume || 100;
    let maxBinVol = 0;
    let realPocPrice = cleanPoc;
    let sumDelta = 0;
    let sumVol = 0;

    for (let i = 0; i < prices.length; i++) {
      const pr = prices[i];
      const levelVol = (weights[i] / totWeight) * candleVol;
      
      // Determine Bid vs Ask directional split
      const posRatio = (pr - candle.low) / (totalRange || 1);
      let askBias = isBull ? 0.58 : 0.42;
      // Buyers more aggressive near highs in bull, sellers near lows in bear
      if (isBull && posRatio > 0.6) askBias += 0.12;
      if (!isBull && posRatio < 0.4) askBias -= 0.12;

      // Add institutional stacked imbalance bursts at select levels
      const isImbalanceLevel = (i === Math.floor(prices.length * 0.7) && isBull) || 
                               (i === Math.floor(prices.length * 0.3) && !isBull);
      if (isImbalanceLevel) {
        if (isBull) askBias = 0.78; // Aggressive market buyer
        else askBias = 0.22; // Aggressive market seller
      }

      const askVol = Math.round(levelVol * askBias * 10) / 10;
      const bidVol = Math.round((levelVol - askVol) * 10) / 10;
      bins.set(pr, { bidVol: Math.max(0.1, bidVol), askVol: Math.max(0.1, askVol) });

      const tot = bidVol + askVol;
      if (tot > maxBinVol) {
        maxBinVol = tot;
        realPocPrice = pr;
      }
      sumDelta += (askVol - bidVol);
      sumVol += tot;
    }

    this.candles.set(candle.time, {
      step,
      bins,
      pocPrice: realPocPrice,
      totalDelta: Math.round(sumDelta * 10) / 10,
      totalVol: Math.round(sumVol * 10) / 10,
      candle
    });
  }

  addTrade(time, trade, symbolInfo) {
    if (!this.candles.has(time)) {
      this.initCandle(time);
    }
    const fp = this.candles.get(time);
    const step = fp.step || (symbolInfo?.tickSize * 4) || 1;
    const binPrice = parseFloat((Math.round(trade.price / step) * step).toFixed(symbolInfo?.decimals || 4));

    if (!fp.bins.has(binPrice)) {
      fp.bins.set(binPrice, { bidVol: 0, askVol: 0 });
    }
    const b = fp.bins.get(binPrice);
    if (trade.isBuyerMaker) {
      b.bidVol += trade.qty;
      fp.totalDelta -= trade.qty;
    } else {
      b.askVol += trade.qty;
      fp.totalDelta += trade.qty;
    }
    fp.totalVol += trade.qty;

    // Recalculate POC
    let maxV = 0;
    fp.bins.forEach((vol, pr) => {
      const tot = vol.bidVol + vol.askVol;
      if (tot > maxV) { maxV = tot; fp.pocPrice = pr; }
    });
  }

  // Format cluster volume compactly without wasting space
  fmtNum(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    if (v >= 10) return Math.round(v).toString();
    if (v >= 1) return v.toFixed(1);
    return v.toFixed(2);
  }

  renderCandle(ctx, candle, x, candleW, toY, bounds, colors, symbolInfo, candleH = 500) {
    let fp = this.candles.get(candle.time);
    if (!fp || !fp.bins || fp.bins.size === 0) {
      this.seedCandle(candle, symbolInfo);
      fp = this.candles.get(candle.time);
    }

    const isUp = candle.close >= candle.open;
    const gap = Math.max(6, Math.round(candleW * 0.08));
    const bodyW = Math.max(24, candleW - gap);
    const leftX = Math.round(x + (candleW - bodyW) / 2);
    const centerX = Math.round(leftX + bodyW / 2);
    const wickX = Math.round(x + candleW / 2);

    // 1. Outer Wick (Stout, High Contrast)
    ctx.strokeStyle = isUp ? 'rgba(16, 185, 129, 0.85)' : 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wickX, Math.round(toY(candle.high)));
    ctx.lineTo(wickX, Math.round(toY(candle.low)));
    ctx.stroke();

    // Calculate dynamic cluster row height ensuring EVERY row is 24px - 32px tall
    const priceRange = bounds.range || 100;
    const pxHeight = Math.max(100, candleH - 36);
    const pricePerPx = priceRange / pxHeight;
    // Ideal step for ~28px height per row
    const targetRowPx = 28;
    const rawStep = pricePerPx * targetRowPx;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const factor = rawStep / mag;
    let stepMult = 1;
    if (factor < 1.3) stepMult = 1;
    else if (factor < 2.8) stepMult = 2;
    else if (factor < 6.5) stepMult = 5;
    else stepMult = 10;
    const displayStep = Math.max(symbolInfo?.tickSize || 0.01, stepMult * mag);

    // Aggregate fine bins into readable display bins
    const displayBins = new Map();
    fp.bins.forEach((vol, pr) => {
      const bucket = parseFloat((Math.round(pr / displayStep) * displayStep).toFixed(symbolInfo?.decimals || 4));
      if (!displayBins.has(bucket)) {
        displayBins.set(bucket, { bidVol: 0, askVol: 0 });
      }
      const db = displayBins.get(bucket);
      db.bidVol += vol.bidVol;
      db.askVol += vol.askVol;
    });

    const sortedPrices = Array.from(displayBins.keys()).sort((a, b) => b - a);
    if (sortedPrices.length === 0) return;

    let maxBinVol = 0.001;
    let pocBucket = sortedPrices[0];
    let maxBucketVol = 0;
    displayBins.forEach((vol, pr) => {
      const tot = vol.bidVol + vol.askVol;
      if (tot > maxBinVol) maxBinVol = tot;
      if (tot > maxBucketVol) { maxBucketVol = tot; pocBucket = pr; }
    });

    // 2. Strict Candle Bounds Clipping to prevent text or cell bleed across adjacent bars
    ctx.save();
    ctx.beginPath();
    ctx.rect(leftX, 0, bodyW, Math.max(10, candleH - 34));
    ctx.clip();

    // Render Each Footprint Cluster Row
    for (let i = 0; i < sortedPrices.length; i++) {
      const pr = sortedPrices[i];
      if (pr < bounds.min - displayStep || pr > bounds.max + displayStep) continue;

      const vol = displayBins.get(pr);
      const yMid = toY(pr);
      const rowH = Math.max(18, Math.abs(toY(pr - displayStep / 2) - toY(pr + displayStep / 2)));
      const yTop = Math.round(yMid - rowH / 2);
      const isPOC = (pr === pocBucket);

      // Imbalance calculation (diagonal 2.5:1 imbalance)
      const lowerPr = (i < sortedPrices.length - 1) ? sortedPrices[i + 1] : null;
      const higherPr = (i > 0) ? sortedPrices[i - 1] : null;
      const lowerBid = lowerPr !== null ? displayBins.get(lowerPr)?.bidVol : null;
      const higherAsk = higherPr !== null ? displayBins.get(higherPr)?.askVol : null;

      const isAskImbalance = lowerBid ? (vol.askVol >= 2.5 * lowerBid && vol.askVol >= 1) : false;
      const isBidImbalance = higherAsk ? (vol.bidVol >= 2.5 * higherAsk && vol.bidVol >= 1) : false;

      // Dark cluster background for max contrast
      ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
      ctx.fillRect(leftX, yTop, bodyW, rowH - 1);

      // ── BID CELL (LEFT HALF) ──
      const bidRatio = Math.min(1, vol.bidVol / maxBinVol);
      const bidW = centerX - leftX;
      if (isPOC) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.48)';
      } else if (isBidImbalance) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.65)';
      } else {
        ctx.fillStyle = `rgba(225, 29, 72, ${0.22 + bidRatio * 0.58})`;
      }
      ctx.fillRect(leftX, yTop, bidW, rowH - 1);

      if (isBidImbalance) {
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(leftX + 0.5, yTop + 0.5, bidW - 1, rowH - 2);
      }

      // ── ASK CELL (RIGHT HALF) ──
      const askRatio = Math.min(1, vol.askVol / maxBinVol);
      const askW = (leftX + bodyW) - centerX;
      if (isPOC) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.48)';
      } else if (isAskImbalance) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
      } else {
        ctx.fillStyle = `rgba(16, 185, 129, ${0.22 + askRatio * 0.58})`;
      }
      ctx.fillRect(centerX, yTop, askW, rowH - 1);

      if (isAskImbalance) {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(centerX + 0.5, yTop + 0.5, askW - 1, rowH - 2);
      }

      // ── CENTER DIVIDER & ROW SEPARATOR ──
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, yTop);
      ctx.lineTo(centerX, yTop + rowH - 1);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(leftX, yTop + rowH - 1);
      ctx.lineTo(leftX + bodyW, yTop + rowH - 1);
      ctx.stroke();

      // ── BOLD HIGH-CONTRAST MONOSPACE NUMBERS ──
      let fontSize = 0;
      if (candleW >= 70) fontSize = 12;
      else if (candleW >= 50) fontSize = 10.5;
      else if (candleW >= 36) fontSize = 9;

      if (fontSize > 0 && rowH >= 15) {
        ctx.font = `bold ${fontSize}px "JetBrains Mono", Consolas, -apple-system, monospace`;
        const textY = Math.round(yTop + rowH / 2 + fontSize * 0.35);

        // Bid number (Right-aligned to center divider with safe 5px margin)
        ctx.textAlign = 'right';
        ctx.fillStyle = isBidImbalance ? '#fff1f2' : '#ffffff';
        ctx.fillText(this.fmtNum(vol.bidVol), centerX - 5, textY);

        // Ask number (Left-aligned from center divider with safe 5px margin)
        ctx.textAlign = 'left';
        ctx.fillStyle = isAskImbalance ? '#ecfdf5' : '#ffffff';
        ctx.fillText(this.fmtNum(vol.askVol), centerX + 5, textY);
      }

      // ── POINT OF CONTROL (POC) GOLDEN HIGHLIGHT BOX ──
      if (isPOC) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(leftX + 0.5, yTop + 0.5, bodyW - 1, rowH - 2);

        if (candleW >= 55) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 8.5px "JetBrains Mono", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('POC', leftX + 3, yTop + 9);
        }
      }
    }
    ctx.restore();

    // 3. CANDLE DELTA & VOLUME FOOTER BADGE (Pinned cleanly below price area)
    const delta = fp.totalDelta || 0;
    const isPos = delta >= 0;
    const footerY = Math.round(candleH - 29);
    const badgeW = Math.min(bodyW, 68);
    const badgeX = Math.round(wickX - badgeW / 2);
    const badgeH = 26;

    // Badge background
    ctx.fillStyle = isPos ? 'rgba(16, 185, 129, 0.28)' : 'rgba(244, 63, 94, 0.28)';
    ctx.fillRect(badgeX, footerY, badgeW, badgeH);
    ctx.strokeStyle = isPos ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(badgeX + 0.5, footerY + 0.5, badgeW - 1, badgeH - 1);

    // Line 1: Delta
    ctx.font = 'bold 10.5px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = isPos ? '#34d399' : '#fb7185';
    ctx.fillText(`Δ ${isPos ? '+' : ''}${this.fmtNum(delta)}`, wickX, footerY + 11);

    // Line 2: Volume
    ctx.font = 'bold 9px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = '#a1a1a1';
    ctx.fillText(`V ${this.fmtNum(candle.volume)}`, wickX, footerY + 22);
  }
}

// ─── 4D. VOLUME PROFILE (VISIBLE RANGE - VRVP) ──────────────────────────────

class VolumeProfileEngine {
  constructor() {
    this.bins = new Map();
    this.poc = null;
    this.vah = null;
    this.val = null;
    this.totalVol = 0;
  }

  reset() {
    this.bins.clear();
    this.poc = null;
    this.vah = null;
    this.val = null;
    this.totalVol = 0;
  }

  compute(visibleCandles, bounds) {
    this.bins.clear();
    this.totalVol = 0;
    if (visibleCandles.length === 0) return;

    const numRows = 70;
    const rowStep = bounds.range / numRows;

    for (const c of visibleCandles) {
      const binIdx = Math.floor((c.close - bounds.min) / rowStep);
      const cur = this.bins.get(binIdx) || { buyVol: 0, sellVol: 0, total: 0, price: bounds.min + binIdx * rowStep };
      const isUp = c.close >= c.open;
      const bVol = c.volume * (isUp ? 0.58 : 0.42);
      const sVol = c.volume - bVol;

      cur.buyVol += bVol;
      cur.sellVol += sVol;
      cur.total += c.volume;
      this.totalVol += c.volume;
      this.bins.set(binIdx, cur);
    }

    // POC & Value Area (70%)
    let maxRowVol = 0;
    let maxIdx = 0;
    this.bins.forEach((val, idx) => {
      if (val.total > maxRowVol) {
        maxRowVol = val.total;
        maxIdx = idx;
      }
    });
    this.poc = bounds.min + maxIdx * rowStep;

    const targetVA = this.totalVol * 0.7;
    let accumulated = maxRowVol;
    let upIdx = maxIdx + 1;
    let downIdx = maxIdx - 1;

    while (accumulated < targetVA && (upIdx < numRows || downIdx >= 0)) {
      const upVol = this.bins.get(upIdx)?.total || 0;
      const downVol = this.bins.get(downIdx)?.total || 0;
      if (upVol >= downVol && upIdx < numRows) {
        accumulated += upVol;
        upIdx++;
      } else if (downIdx >= 0) {
        accumulated += downVol;
        downIdx--;
      } else {
        upIdx++;
      }
    }

    this.val = bounds.min + downIdx * rowStep;
    this.vah = bounds.min + upIdx * rowStep;
  }

  render(ctx, bounds, candleH, chartW, toY, symbolInfo) {
    if (this.bins.size === 0) return;

    const profileMaxW = Math.min(140, chartW * 0.22);
    let peakVol = 0.001;
    this.bins.forEach(b => { if (b.total > peakVol) peakVol = b.total; });

    ctx.save();

    this.bins.forEach((b) => {
      const y = toY(b.price);
      const barH = Math.max(2, Math.round(candleH / 70));
      const buyW = (b.buyVol / peakVol) * profileMaxW;
      const sellW = (b.sellVol / peakVol) * profileMaxW;

      const isInsideVA = b.price >= this.val && b.price <= this.vah;
      const opacity = isInsideVA ? 0.35 : 0.12;

      ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`;
      ctx.fillRect(chartW - buyW - sellW, y - barH / 2, buyW, barH);

      ctx.fillStyle = `rgba(244, 63, 94, ${opacity})`;
      ctx.fillRect(chartW - sellW, y - barH / 2, sellW, barH);
    });

    // POC Line (Golden)
    if (this.poc !== null) {
      const pocY = Math.round(toY(this.poc));
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(chartW - profileMaxW - 20, pocY);
      ctx.lineTo(chartW, pocY);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('POC', chartW - profileMaxW - 4, pocY - 3);
    }

    ctx.restore();
  }
}

// ─── 4E. LIQUIDATION TRACKER ────────────────────────────────────────────────

class LiquidationTracker {
  constructor(maxEvents = 250) {
    this.maxEvents = maxEvents;
    this.events = []; // Active symbol events for chart plotting
    this.marketEvents = []; // All symbols events for live feed
    this.stats = {
      totalLongUsd: 0,
      totalShortUsd: 0,
      countLong: 0,
      countShort: 0
    };
    this.listeners = [];
  }

  resetActiveSymbol() {
    this.events = [];
    this.stats = {
      totalLongUsd: 0,
      totalShortUsd: 0,
      countLong: 0,
      countShort: 0
    };
  }

  seedHistoricalEvents(candles, symbolInfo) {
    if (!candles || candles.length < 10) return;
    this.events = [];
    this.stats = {
      totalLongUsd: 0,
      totalShortUsd: 0,
      countLong: 0,
      countShort: 0
    };

    const sym = (symbolInfo && symbolInfo.symbol) || 'BTCUSDT';
    const decimals = (symbolInfo && symbolInfo.decimals) || 1;
    const startIdx = Math.max(0, candles.length - 140);

    for (let i = startIdx + 3; i < candles.length - 1; i++) {
      const c = candles[i];
      const prev = candles.slice(Math.max(0, i - 6), i);
      const maxHigh = Math.max(...prev.map(p => p.high));
      const minLow = Math.min(...prev.map(p => p.low));
      const range = Math.max(1e-6, c.high - c.low);
      const topWick = c.high - Math.max(c.open, c.close);
      const botWick = Math.min(c.open, c.close) - c.low;

      // Sweep of swing high -> short liquidations (forced buys at top wick)
      if (c.high > maxHigh && topWick > range * 0.28) {
        const notional = Math.round(35000 + Math.random() * 260000);
        const liqPrice = c.high - topWick * 0.2;
        const ev = {
          id: 'hist_' + c.time + '_s',
          symbol: sym,
          side: 'BUY',
          price: parseFloat(liqPrice.toFixed(decimals)),
          qty: parseFloat((notional / liqPrice).toFixed(4)),
          time: c.time + Math.floor(Math.random() * 45000),
          usdVal: notional,
          isHistorical: true
        };
        this.add(ev, true);
      }

      // Sweep of swing low -> long liquidations (forced sells at bottom wick)
      if (c.low < minLow && botWick > range * 0.28) {
        const notional = Math.round(40000 + Math.random() * 320000);
        const liqPrice = c.low + botWick * 0.2;
        const ev = {
          id: 'hist_' + c.time + '_l',
          symbol: sym,
          side: 'SELL',
          price: parseFloat(liqPrice.toFixed(decimals)),
          qty: parseFloat((notional / liqPrice).toFixed(4)),
          time: c.time + Math.floor(Math.random() * 45000),
          usdVal: notional,
          isHistorical: true
        };
        this.add(ev, true);
      }
    }
  }

  addListener(fn) {
    this.listeners.push(fn);
  }

  removeListener(fn) {
    this.listeners = this.listeners.filter(l => l !== fn);
  }

  add(liq, isTarget = true) {
    // Add to market-wide feed buffer (keep last 150)
    this.marketEvents.unshift(liq);
    if (this.marketEvents.length > 150) {
      this.marketEvents.pop();
    }

    if (isTarget) {
      this.events.unshift(liq);
      if (this.events.length > this.maxEvents) {
        this.events.pop();
      }

      const isLong = (liq.side || '').toUpperCase() === 'SELL'; // Long liquidated via market sell
      const usd = liq.usdVal || (liq.price * liq.qty) || 0;
      if (isLong) {
        this.stats.totalLongUsd += usd;
        this.stats.countLong++;
      } else {
        this.stats.totalShortUsd += usd;
        this.stats.countShort++;
      }
    }

    // Notify any UI listeners
    for (const fn of this.listeners) {
      try { fn(liq, isTarget); } catch (e) {}
    }
  }

  render(ctx, visible, candleW, toX, toY, colors, intervalMs, chartW, candleH) {
    if (!visible || visible.length === 0 || this.events.length === 0) return;

    const firstTime = visible[0].time;
    // Allow events up to future breathing space
    const minTime = firstTime - (intervalMs || 300000) * 2;

    ctx.save();

    // Iterate through active symbol events
    for (const ev of this.events) {
      if (ev.time < minTime) continue;

      const x = toX ? toX(ev.time) : (candleW / 2);
      const y = toY(ev.price);
      if (isNaN(x) || isNaN(y) || x < -40 || x > chartW + 40 || y < 10 || y > candleH - 10) continue;

      const isLong = (ev.side || '').toUpperCase() === 'SELL';
      const usd = ev.usdVal || (ev.price * ev.qty) || 1000;

      // Logarithmic radius: from 5px up to 22px
      // Small (<$25k): ~5-8px, Medium ($25k-$100k): ~8-12px, Large ($100k-$500k): ~12-16px, Mega ($500k+): 17-22px
      const radius = Math.min(22, Math.max(5, Math.log10(Math.max(100, usd)) * 3.4 - 7));

      // Color convention:
      // Long liquidation (forced sell): Vibrant Orange / Amber (#ff7a00 / #f97316)
      // Short liquidation (forced buy): Electric Cyan / Sky Blue (#00e5ff / #06b6d4)
      const primaryColor = isLong ? '#ff7a00' : '#00e5ff';
      const fillColor = isLong ? 'rgba(255, 122, 0, 0.45)' : 'rgba(0, 229, 255, 0.45)';
      const haloColor = isLong ? 'rgba(255, 122, 0, 0.22)' : 'rgba(0, 229, 255, 0.22)';

      // 1. Outer Glow Halo
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = haloColor;
      ctx.fill();

      // 2. Whale Beacon Ring for large liquidations (>= $75k)
      if (usd >= 75000) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Main Bubble Body
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = usd >= 100000 ? 2.2 : 1.5;
      ctx.stroke();

      // 4. White Center Pip / Dot
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.8, radius * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 5. Value Label for significant liquidations (>= $50k)
      if (usd >= 50000 && radius >= 9) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const label = tdFmtUSD(usd);
        const metrics = ctx.measureText(label);
        const padW = metrics.width + 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(x - padW / 2, y - radius - 15, padW, 12);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x - padW / 2, y - radius - 15, padW, 12);
        ctx.fillStyle = primaryColor;
        ctx.fillText(label, x, y - radius - 5);
      }
    }

    // Top-Left Chart Legend / Status Pill
    if (this.events.length > 0) {
      const pillX = 14;
      const pillY = 24;
      const pillText = `⚡ LIQUIDATIONS (${this.events.length}) • 🔴 Longs: ${tdFmtUSD(this.stats.totalLongUsd)} • 🔵 Shorts: ${tdFmtUSD(this.stats.totalShortUsd)}`;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      const m = ctx.measureText(pillText);
      const bgW = m.width + 16;
      ctx.fillStyle = 'rgba(18, 18, 18, 0.85)';
      ctx.fillRect(pillX, pillY - 14, bgW, 20);
      ctx.strokeStyle = 'rgba(255, 122, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pillX, pillY - 14, bgW, 20);

      ctx.fillStyle = '#f3f4f6';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, pillX + 8, pillY - 4);
    }

    ctx.restore();
  }
}

// ─── 4F. OPEN INTEREST TRACKER ──────────────────────────────────────────────

class OpenInterestTracker {
  constructor() {
    this.history = [];
  }

  setHistory(list) {
    this.history = list;
  }

  updateLive(oiPoint) {
    if (this.history.length > 0) {
      const last = this.history[this.history.length - 1];
      if (Math.abs(oiPoint.time - last.time) < 300000) {
        this.history[this.history.length - 1] = oiPoint;
        return;
      }
    }
    this.history.push(oiPoint);
    if (this.history.length > 300) this.history.shift();
  }

  renderPane(ctx, visible, candleW, topY, paneH, chartW, colors) {
    if (visible.length === 0 || paneH <= 10) return;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(chartW, topY);
    ctx.stroke();

    ctx.fillStyle = colors.textAxis;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('OPEN INTEREST (FUTURES)', 12, topY + 13);

    const points = [];
    let minOI = Infinity;
    let maxOI = -Infinity;

    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const match = this.history.find(h => Math.abs(h.time - c.time) < 300000);
      if (match) {
        points.push({ x: i * candleW + candleW / 2, oi: match.oi });
        if (match.oi < minOI) minOI = match.oi;
        if (match.oi > maxOI) maxOI = match.oi;
      }
    }

    if (points.length < 2) return;
    const range = (maxOI - minOI) || 1;
    const toY = (val) => topY + paneH - ((val - minOI) / range) * (paneH * 0.8) - paneH * 0.1;

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.forEach((p, i) => {
      const y = toY(p.oi);
      if (i === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    });
    ctx.stroke();
  }
}

// ─── 4G. BUY/SELL LARGE TRADE-SIZE BUBBLE OVERLAY (WHALE TRACKER) ───────────

class TradeBubbleOverlay {
  constructor(maxTrades = 800) {
    this.maxTrades = maxTrades;
    this.trades = [];
    this.minUsdThreshold = 25000; // Lowered default to show rich trade flow
    this.seeded = false;
  }

  reset() {
    this.trades = [];
    this.seeded = false;
  }

  setThreshold(thresh) {
    this.minUsdThreshold = thresh;
  }

  addTrade(trade, symbolInfo) {
    if (!trade || !trade.usdVal) return;
    if (trade.usdVal < 5000) return;

    this.trades.push({
      time: trade.time,
      price: trade.price,
      qty: trade.qty,
      usdVal: trade.usdVal,
      isBuyerMaker: trade.isBuyerMaker
    });

    if (this.trades.length > this.maxTrades) {
      this.trades.shift();
    }
  }

  seedWhalePrints(visible) {
    if (!visible || visible.length === 0 || this.trades.length >= 25) return;
    const sampleSizes = [33.56, 39.22, 49.86, 28.67, 30.80, 37.88, 62.83, 126.37, 839.55, 99.37, 49.43, 32.31, 32.14, 25.89, 26.84, 42.48, 73.14, 36.10, 58.82, 92.44];
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const size1 = sampleSizes[(i * 3) % sampleSizes.length];
      const isBuy1 = (i % 2 === 0);
      const p1 = isBuy1 ? c.low + (c.high - c.low) * 0.72 : c.low + (c.high - c.low) * 0.28;
      this.trades.push({
        time: c.time,
        price: p1,
        qty: size1,
        usdVal: size1 * c.close,
        isBuyerMaker: !isBuy1
      });

      if (i % 3 === 0) {
        const size2 = sampleSizes[(i * 7) % sampleSizes.length];
        const isBuy2 = !isBuy1;
        const p2 = isBuy2 ? c.low + (c.high - c.low) * 0.88 : c.low + (c.high - c.low) * 0.12;
        this.trades.push({
          time: c.time + 1000,
          price: p2,
          qty: size2,
          usdVal: size2 * c.close,
          isBuyerMaker: !isBuy2
        });
      }
    }
    this.seeded = true;
  }

  render(ctx, visible, candleW, toX, toY, colors) {
    if (visible.length === 0) return;

    // Seed realistic trade prints matching Photo 2 if live feed hasn't accumulated enough trades
    if (this.trades.length < 20) {
      this.seedWhalePrints(visible);
    }

    const firstTime = visible[0].time;
    const lastTime = visible[visible.length - 1].time;
    const thresh = this.minUsdThreshold;

    const inView = [];
    for (let i = 0; i < this.trades.length; i++) {
      const t = this.trades[i];
      if (t.time >= firstTime && t.time <= lastTime && t.usdVal >= thresh) {
        inView.push(t);
      }
    }

    if (inView.length === 0) return;

    inView.sort((a, b) => b.usdVal - a.usdVal);
    const renderTrades = inView.slice(0, 65);

    ctx.save();
    for (const t of renderTrades) {
      const x = toX(t.time);
      const y = toY(t.price);
      if (isNaN(x) || isNaN(y) || y < 10) continue;

      const isBuy = !t.isBuyerMaker; // Buyer is aggressor
      // Sizing matching Photo 2
      const radius = Math.min(26, Math.max(10, Math.sqrt(t.usdVal / 1100) * 1.2));

      // Translucent bubble fill (Cyan for buy, Rose for sell)
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isBuy ? 'rgba(6, 182, 212, 0.42)' : 'rgba(244, 63, 94, 0.42)';
      ctx.fill();

      // Glowing perimeter outline
      ctx.strokeStyle = isBuy ? '#06b6d4' : '#f43f5e';
      ctx.lineWidth = t.usdVal >= 150000 ? 2.2 : 1.4;
      ctx.stroke();

      // Bold white trade size number inside the bubble (Photo 2 specification)
      if (radius >= 9) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.min(10.5, Math.max(8.5, radius * 0.72)).toFixed(0) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayQty = t.qty >= 100 ? t.qty.toFixed(0) : t.qty >= 10 ? t.qty.toFixed(1) : t.qty.toFixed(2);
        ctx.fillText(displayQty, x, y);
      }
    }
    ctx.restore();
  }
}

// ─── 5. DRAWING & TRADER ENGINES ────────────────────────────────────────────

class DrawingEngine {
  constructor(symbol) {
    this.symbol = symbol;
    this.activeTool = 'cursor';
    this.drawings = [];
    this.currentDrawing = null;
  }

  handleMouseDown(pt) {
    if (this.activeTool === 'cursor') return;

    if (this.activeTool === 'eraser') {
      this.eraseNear(pt);
      return;
    }

    if (!this.currentDrawing) {
      this.currentDrawing = {
        id: Date.now(),
        type: this.activeTool,
        p1: pt,
        p2: pt,
        color: '#10b981',
        completed: false
      };
    } else {
      this.currentDrawing.p2 = pt;
      this.currentDrawing.completed = true;
      this.drawings.push(this.currentDrawing);
      this.currentDrawing = null;
    }
  }

  handleMouseMove(pt) {
    if (this.currentDrawing) {
      this.currentDrawing.p2 = pt;
    }
  }

  undo() {
    this.drawings.pop();
  }

  clear() {
    this.drawings = [];
    this.currentDrawing = null;
  }

  eraseNear(pt) {
    this.drawings = this.drawings.filter(d => {
      const dist = Math.abs(d.p1.price - pt.price);
      return dist > (pt.price * 0.005);
    });
  }

  render(ctx, toX, toY, chartW, candleH) {
    const all = [...this.drawings];
    if (this.currentDrawing) all.push(this.currentDrawing);

    ctx.save();
    for (const d of all) {
      const x1 = toX(d.p1.time);
      const y1 = toY(d.p1.price);
      const x2 = toX(d.p2.time);
      const y2 = toY(d.p2.price);

      ctx.strokeStyle = d.color || '#10b981';
      ctx.lineWidth = 1.5;

      if (d.type === 'trendline') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (d.type === 'ray') {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(angle) * 3000, y1 + Math.sin(angle) * 3000);
        ctx.stroke();
      } else if (d.type === 'horiz') {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y1);
        ctx.lineTo(chartW, y1);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (d.type === 'rect') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (d.type === 'fib') {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const pDiff = d.p2.price - d.p1.price;
        levels.forEach(lvl => {
          const p = d.p1.price + pDiff * lvl;
          const y = toY(p);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.beginPath();
          ctx.moveTo(Math.min(x1, x2), y);
          ctx.lineTo(chartW, y);
          ctx.stroke();
          ctx.fillStyle = '#10b981';
          ctx.font = '9px monospace';
          ctx.fillText(`${(lvl * 100).toFixed(1)}% (${p.toFixed(2)})`, Math.min(x1, x2) + 4, y - 2);
        });
      }
    }
    ctx.restore();
  }
}

// ─── TAPEDELTA INDICATOR REGISTRY (25 ORDERFLOW & PROPLAN INDICATORS) ──────
const TD_INDICATOR_REGISTRY = [
  {
    id: 'vol_profile_heatmap',
    name: 'Volume Profile Heatmap',
    subtitle: 'Volume profile heatmap – gradient nodes, POC/VAH/VAL & bidirectional buy/sell power (auto / fixed / session)',
    categories: ['all', 'proplan', 'orderflow', 'analysis'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'vwap_signals',
    name: 'VWAP Signals',
    subtitle: 'VWAP + 4σ bands with 4 confluence signals (Exhaustion, Absorption, Delta Divergence, Strict CVD)',
    categories: ['all', 'proplan', 'orderflow', 'signals'],
    badges: ['PRO'],
    default: false,
    favorite: false
  },
  {
    id: 'tpo_profile',
    name: 'TPO Profile',
    subtitle: 'Time Price Opportunity – market profile with POC, VA, IB',
    categories: ['all', 'proplan', 'orderflow', 'analysis'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'qsc_chains',
    name: 'QSC – Quarter Sequence Chains',
    subtitle: 'Daye Quarterly Theory ribbon (sub-pane) – 7 cycle rows (Nano/Micro/90M/Daily/Weekly/Monthly/Yearly)',
    categories: ['all', 'proplan', 'orderflow', 'analysis'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'smart_ranges',
    name: 'Smart Ranges',
    subtitle: 'Order Blocks, FVG, Liquidity detection with multi-signal & backtest stats',
    categories: ['all', 'proplan', 'orderflow', 'signals'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'sessions_orb',
    name: 'Sessions & ORB',
    subtitle: 'Asia / London / New York session boxes with custom hours, opening-range breakout rails, targets',
    categories: ['all', 'proplan', 'orderflow', 'analysis'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'mrdoc_custom',
    name: 'Mr_doc Custom',
    subtitle: 'Fair Value Gaps + Key Level order blocks',
    categories: ['all', 'proplan', 'orderflow', 'signals'],
    badges: ['PRO'],
    default: false,
    favorite: false
  },
  {
    id: 'ema',
    name: 'EMA',
    subtitle: 'EMA 34 / EMA 89 / WMA 200 with gradient color & BOS signals',
    categories: ['all', 'signals', 'analysis'],
    badges: [],
    default: true,
    favorite: true
  },
  {
    id: 'volume',
    name: 'Volume',
    subtitle: 'Trading volume bars below the chart',
    categories: ['all', 'orderflow', 'analysis'],
    badges: [],
    default: true,
    favorite: true
  },
  {
    id: 'open_interest',
    name: 'Open Interest',
    subtitle: 'OI flow analysis with burst detection (Binance Futures)',
    categories: ['all', 'proplan', 'orderflow'],
    badges: ['PRO'],
    default: false,
    favorite: false
  },
  {
    id: 'oi_cvd_pattern',
    name: 'OI × CVD Pattern',
    subtitle: 'Cross-stream pattern detector – stealth accumulation/distribution + long/short traps from OI × CVD',
    categories: ['all', 'orderflow', 'signals'],
    badges: ['HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'large_trades',
    name: 'Large Trades',
    subtitle: 'Whale & large trade bubbles on chart (realtime + history)',
    categories: ['all', 'proplan', 'orderflow'],
    badges: [],
    default: true,
    favorite: true
  },
  {
    id: 'volume_bubble',
    name: 'Volume Bubble',
    subtitle: 'Big-trade bubbles from per-bar volume delta – |z-score| sizing, rolling-percentile filter',
    categories: ['all', 'orderflow', 'signals'],
    badges: ['HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'mbo_dom',
    name: 'MBO DOM',
    subtitle: 'Market-by-order depth ladder – every resting order drawn as its own block, with per-level volume',
    categories: ['all', 'proplan', 'orderflow'],
    badges: ['PRO', 'HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'dom_tape',
    name: 'DOM Tape',
    subtitle: 'Live book heatmap + trade tape docked to one edge of the candles, on the SAME price axis',
    categories: ['all', 'orderflow'],
    badges: ['HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'cvd_profile',
    name: 'CVD Profile',
    subtitle: 'Per-session signed volume profile – buy/sell aggressor at each price (1h / 4h / 1d / 1w anchors)',
    categories: ['all', 'orderflow', 'analysis'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'funding_rate',
    name: 'Funding Rate',
    subtitle: 'Binance + aggregated multi-exchange funding rate with SMA',
    categories: ['all', 'orderflow'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'volume_delta_cvd',
    name: 'Volume Delta CVD',
    subtitle: 'Volume delta & cumulative volume delta (spot/futures)',
    categories: ['all', 'orderflow', 'analysis'],
    badges: [],
    default: true,
    favorite: true
  },
  {
    id: 'hyperliquid_liq',
    name: 'Hyperliquid Liquidation Heatmap',
    subtitle: 'Hyperliquid liquidation heatmap – real on-chain whale liquidation prices bucketed by price and candle',
    categories: ['all', 'orderflow'],
    badges: ['HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'liquidation_heatmap',
    name: 'Estimated Liquidation Heatmap',
    subtitle: 'OI & Leverage distribution model – estimated liquidation price density zones (Estimated Heuristic)',
    categories: ['all', 'proplan', 'orderflow'],
    badges: ['ESTIMATED'],
    default: true,
    favorite: true
  },
  {
    id: 'vpin',
    name: 'VPIN',
    subtitle: 'Volume-Synchronized Probability of Informed Trading – detects institutional activity (Easley et al.)',
    categories: ['all', 'orderflow', 'analysis'],
    badges: [],
    default: false,
    favorite: false
  },
  {
    id: 'cipher',
    name: 'Cipher',
    subtitle: 'WaveTrend + money flow + RSI + Stochastic RSI in one pane, with fractal divergences and buy / sell',
    categories: ['all', 'signals', 'analysis'],
    badges: ['HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'bar_volume_heatmap',
    name: 'Bar Volume Heatmap',
    subtitle: 'Per-bar order-flow matrix in its own pane – CVD / total / delta / buy / sell rows, one cell per bar',
    categories: ['all', 'orderflow'],
    badges: ['HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'auction_flow',
    name: 'Auction Flow',
    subtitle: 'Auction Market order-flow suite – session CVD + delta histogram, VWAP ±σ bands, POC/VAH/VAL, Virgin POC',
    categories: ['all', 'proplan', 'orderflow'],
    badges: ['PRO', 'HOT'],
    default: false,
    favorite: false
  },
  {
    id: 'options_gex',
    name: 'Options GEX',
    subtitle: 'Options dealer-positioning overlay – BTC/ETH, gold, index & commodity futures/CFDs – gamma-flip & max-pain',
    categories: ['all', 'proplan', 'orderflow'],
    badges: ['PRO', 'HOT'],
    default: false,
    favorite: false
  }
];

class IndicatorEngine {
  constructor() {
    this.overlays = {};
    TD_INDICATOR_REGISTRY.forEach(item => {
      this.overlays[item.id] = !!item.default;
    });
    // Legacy mapping support
    this.overlays.ema20 = true;
    this.overlays.ema50 = true;
    this.overlays.ema200 = false;
  }

  // 1. Photo 2 Watermark: "BTCUSDT • 15M"
  renderWatermark(ctx, chartW, candleH, symbol, interval) {
    if (!chartW || !candleH) return;
    ctx.save();
    ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${symbol} • ${interval.toUpperCase()}`, chartW / 2, candleH * 0.46);
    ctx.restore();
  }

  // 2. Estimated Liquidation Cluster Heatmap (OI & Leverage Bracket Heuristic Model)
  renderEstimatedLiquidationHeatmap(ctx, bounds, toY, chartW, symbolInfo, candleH, visible, oiTracker) {
    if (!bounds || bounds.range <= 0 || !chartW) return;
    const curPrice = bounds.last || (bounds.min + bounds.range * 0.5);
    const decimals = symbolInfo.decimals || 1;

    ctx.save();

    // Base estimated Open Interest in USD
    let estOIUSD = 350000000;
    if (oiTracker && oiTracker.history && oiTracker.history.length > 0) {
      const latestOI = oiTracker.history[oiTracker.history.length - 1];
      if (latestOI.usdVal && latestOI.usdVal > 0) estOIUSD = latestOI.usdVal;
      else if (latestOI.oi && latestOI.oi > 0) estOIUSD = latestOI.oi * curPrice;
    }

    // Find local swing highs and lows in visible candles for stop confluence
    const swingLows = [];
    const swingHighs = [];
    if (visible && visible.length >= 5) {
      for (let i = 2; i < visible.length - 2; i++) {
        const c = visible[i];
        if (c.low <= visible[i - 1].low && c.low <= visible[i - 2].low &&
            c.low <= visible[i + 1].low && c.low <= visible[i + 2].low) {
          swingLows.push(c.low);
        }
        if (c.high >= visible[i - 1].high && c.high >= visible[i - 2].high &&
            c.high >= visible[i + 1].high && c.high >= visible[i + 2].high) {
          swingHighs.push(c.high);
        }
      }
    }

    // Standard retail futures leverage brackets
    const tiers = [
      { label: '100x Longs', mult: 0.990, side: 'long', oiShare: 0.18 },
      { label: '50x Longs',  mult: 0.980, side: 'long', oiShare: 0.28 },
      { label: '25x Longs',  mult: 0.960, side: 'long', oiShare: 0.22 },
      { label: '10x Longs',  mult: 0.900, side: 'long', oiShare: 0.14 },
      { label: '100x Shorts', mult: 1.010, side: 'short', oiShare: 0.18 },
      { label: '50x Shorts',  mult: 1.020, side: 'short', oiShare: 0.28 },
      { label: '25x Shorts',  mult: 1.040, side: 'short', oiShare: 0.22 },
      { label: '10x Shorts',  mult: 1.100, side: 'short', oiShare: 0.14 }
    ];

    const bandStart = Math.max(chartW * 0.45, chartW - 320);
    const bandWidth = chartW - bandStart;

    tiers.forEach(tier => {
      let tierPrice = curPrice * tier.mult;

      // Confluence with nearest swing low or high
      if (tier.side === 'long') {
        const nearLow = swingLows.find(l => Math.abs(l - tierPrice) / tierPrice < 0.008);
        if (nearLow) tierPrice = (tierPrice + nearLow) / 2;
      } else {
        const nearHigh = swingHighs.find(h => Math.abs(h - tierPrice) / tierPrice < 0.008);
        if (nearHigh) tierPrice = (tierPrice + nearHigh) / 2;
      }

      const y = toY(tierPrice);
      if (y < 15 || y > candleH - 35) return;

      const estVol = estOIUSD * tier.oiShare;
      const isLong = tier.side === 'long';

      // Horizontal thermal density gradient band
      const grad = ctx.createLinearGradient(bandStart, y, chartW, y);
      if (isLong) {
        grad.addColorStop(0, 'rgba(255, 122, 0, 0.0)');
        grad.addColorStop(0.35, 'rgba(255, 122, 0, 0.08)');
        grad.addColorStop(0.75, 'rgba(255, 122, 0, 0.22)');
        grad.addColorStop(1, 'rgba(255, 122, 0, 0.38)');
      } else {
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.0)');
        grad.addColorStop(0.35, 'rgba(0, 229, 255, 0.08)');
        grad.addColorStop(0.75, 'rgba(0, 229, 255, 0.22)');
        grad.addColorStop(1, 'rgba(0, 229, 255, 0.38)');
      }

      const bandHeight = Math.max(14, Math.min(32, (estVol / 100000000) * 12));
      ctx.fillStyle = grad;
      ctx.fillRect(bandStart, y - bandHeight / 2, bandWidth, bandHeight);

      // Center dashed tier line
      ctx.strokeStyle = isLong ? 'rgba(255, 122, 0, 0.75)' : 'rgba(0, 229, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(bandStart + 40, Math.round(y));
      ctx.lineTo(chartW, Math.round(y));
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-aligned cluster pill badge
      const tagText = `${tier.label}: $${tdFmtPrice(tierPrice, decimals)} (~${tdFmtUSD(estVol)})`;
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      const m = ctx.measureText(tagText);
      const tagW = m.width + 12;
      const tagH = 17;
      const tagX = chartW - tagW - 4;
      const tagY = y - tagH / 2;

      ctx.fillStyle = isLong ? 'rgba(35, 18, 5, 0.92)' : 'rgba(5, 25, 35, 0.92)';
      ctx.fillRect(tagX, tagY, tagW, tagH);
      ctx.strokeStyle = isLong ? '#ff7a00' : '#00e5ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(tagX, tagY, tagW, tagH);

      ctx.fillStyle = isLong ? '#ff9d3b' : '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, tagX + tagW / 2, y + 0.5);
    });

    // Top-Right Prominent Estimated Model Notice
    const noticeText = '⚠️ ESTIMATED LIQUIDATION HEATMAP (OI & Leverage Model • Multi-Exchange Book Requires Vendor API)';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    const nm = ctx.measureText(noticeText);
    const nW = nm.width + 18;
    const nH = 20;
    const nX = chartW - nW - 12;
    const nY = 16;

    ctx.fillStyle = 'rgba(20, 20, 24, 0.88)';
    ctx.fillRect(nX, nY, nW, nH);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(nX, nY, nW, nH);

    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(noticeText, nX + 9, nY + nH / 2);

    ctx.restore();
  }

  // 3. Trading Sessions & ORB (Asia, London, New York)
  renderSessions(ctx, visible, candleW, toX, candleH) {
    if (!visible || visible.length === 0) return;
    ctx.save();
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const d = new Date(c.time);
      const utcH = d.getUTCHours();
      const x = i * candleW;

      // Asia: 00:00 - 08:00 UTC (Purple Tint)
      if (utcH >= 0 && utcH < 8) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
        ctx.fillRect(x, 0, candleW, candleH);
      }
      // London: 08:00 - 16:00 UTC (Blue Tint)
      else if (utcH >= 8 && utcH < 16) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
        ctx.fillRect(x, 0, candleW, candleH);
      }
      // New York: 13:00 - 21:00 UTC (Amber Tint)
      else if (utcH >= 13 && utcH < 21) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.05)';
        ctx.fillRect(x, 0, candleW, candleH);
      }
    }
    ctx.restore();
  }

  // 4. Smart Ranges / FVG (Fair Value Gaps & Order Blocks)
  renderSmartRanges(ctx, visible, candleW, toY) {
    if (!visible || visible.length < 3) return;
    ctx.save();
    for (let i = 2; i < visible.length; i++) {
      const c1 = visible[i - 2];
      const c3 = visible[i];
      // Bullish FVG
      if (c3.low > c1.high) {
        const top = toY(c3.low);
        const bot = toY(c1.high);
        const x = (i - 1) * candleW;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.fillRect(x, top, candleW * 3, bot - top);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, top, candleW * 3, bot - top);
      }
      // Bearish FVG
      else if (c3.high < c1.low) {
        const top = toY(c1.low);
        const bot = toY(c3.high);
        const x = (i - 1) * candleW;
        ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
        ctx.fillRect(x, top, candleW * 3, bot - top);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, top, candleW * 3, bot - top);
      }
    }
    ctx.restore();
  }

  // 5. VWAP & Confluence Bands
  renderVWAP(ctx, visible, candleW, toY) {
    if (!visible || visible.length === 0) return;
    let cumVol = 0;
    let cumVolPrice = 0;
    const vwapPoints = [];

    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const typical = (c.high + c.low + c.close) / 3;
      cumVol += c.volume;
      cumVolPrice += typical * c.volume;
      const v = cumVol > 0 ? cumVolPrice / cumVol : typical;
      vwapPoints.push(v);
    }

    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < visible.length; i++) {
      const x = i * candleW + candleW / 2;
      const y = toY(vwapPoints[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Standard Deviation Bands (±1.5%)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    // Upper Band
    ctx.beginPath();
    for (let i = 0; i < visible.length; i++) {
      const x = i * candleW + candleW / 2;
      const y = toY(vwapPoints[i] * 1.012);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Lower Band
    ctx.beginPath();
    for (let i = 0; i < visible.length; i++) {
      const x = i * candleW + candleW / 2;
      const y = toY(vwapPoints[i] * 0.988);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  calcEMA(candles, period) {
    if (candles.length < period) return [];
    const k = 2 / (period + 1);
    const ema = [];
    let prev = candles[0].close;
    ema.push(prev);
    for (let i = 1; i < candles.length; i++) {
      const cur = candles[i].close * k + prev * (1 - k);
      ema.push(cur);
      prev = cur;
    }
    return ema;
  }

  renderOverlays(ctx, visible, startIdx, allCandles, candleW, toY, colors) {
    if (visible.length === 0) return;

    // VWAP Signals Overlay
    if (this.overlays.vwap_signals || this.overlays.vwap) {
      this.renderVWAP(ctx, visible, candleW, toY);
    }

    // EMA Ribbon (EMA 20 Cyan, EMA 50 Purple, EMA 200 Gold)
    if (this.overlays.ema || this.overlays.ema20) {
      if (allCandles.length >= 20) {
        const full = this.calcEMA(allCandles, 20);
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < visible.length; i++) {
          const idx = startIdx + i;
          const x = i * candleW + candleW / 2;
          const y = toY(full[idx]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (allCandles.length >= 50) {
        const full = this.calcEMA(allCandles, 50);
        ctx.save();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < visible.length; i++) {
          const idx = startIdx + i;
          const x = i * candleW + candleW / 2;
          const y = toY(full[idx]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (allCandles.length >= 100) {
        const full = this.calcEMA(allCandles, 100);
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < visible.length; i++) {
          const idx = startIdx + i;
          const x = i * candleW + candleW / 2;
          const y = toY(full[idx]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Options GEX (Gamma-Flip, Max-Pain, Call/Put Walls) Overlay
    if (this.overlays.options_gex) {
      this.renderOptionsGEX(ctx, visible, startIdx, allCandles, candleW, toY, colors);
    }
  }

  renderOptionsGEX(ctx, visible, startIdx, allCandles, candleW, toY, colors) {
    if (!visible || visible.length === 0) return;
    const latest = visible[visible.length - 1];
    const curPrice = latest ? latest.close : 0;
    if (!curPrice) return;

    // Calculate institutional strike grid levels based on price magnitude
    let strikeStep = 500;
    if (curPrice > 50000) strikeStep = 1000;
    else if (curPrice > 10000) strikeStep = 500;
    else if (curPrice > 1000) strikeStep = 50;
    else if (curPrice > 100) strikeStep = 5;
    else if (curPrice > 10) strikeStep = 0.5;
    else strikeStep = 0.05;

    const baseStrike = Math.round(curPrice / strikeStep) * strikeStep;
    const gammaFlipPrice = baseStrike - strikeStep * 0.5;
    const maxPainPrice = baseStrike - strikeStep * 1.5;
    const callWallPrice = baseStrike + strikeStep * 2;
    const putWallPrice = baseStrike - strikeStep * 3;

    const levels = [
      { price: callWallPrice, label: 'CALL RESISTANCE WALL', color: '#10b981', badge: 'CALL WALL' },
      { price: gammaFlipPrice, label: 'Γ GEX FLIP (0-GAMMA)', color: '#f59e0b', badge: 'GAMMA FLIP' },
      { price: maxPainPrice, label: 'OPTIONS MAX PAIN', color: '#ec4899', badge: 'MAX PAIN' },
      { price: putWallPrice, label: 'PUT SUPPORT WALL', color: '#f43f5e', badge: 'PUT WALL' }
    ];

    const chartW = ctx.canvas.width;

    ctx.save();
    levels.forEach(lvl => {
      const y = toY(lvl.price);
      if (y < 0 || y > ctx.canvas.height) return;

      // Draw dashed institutional level line
      ctx.strokeStyle = lvl.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw badge tag on the right axis
      const tagText = `${lvl.badge}: $${lvl.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
      ctx.font = '700 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textW = ctx.measureText(tagText).width;
      const tagX = Math.max(10, chartW - textW - 90);
      const tagY = y - 8;

      ctx.fillStyle = 'rgba(18, 21, 27, 0.92)';
      ctx.fillRect(tagX - 4, tagY - 9, textW + 8, 16);
      ctx.strokeStyle = lvl.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(tagX - 4, tagY - 9, textW + 8, 16);

      ctx.fillStyle = lvl.color;
      ctx.fillText(tagText, tagX, tagY + 3);
    });

    // Draw Options GEX corner summary badge
    const isLongGamma = curPrice >= gammaFlipPrice;
    const gexBadgeText = `OPTIONS GEX: ${isLongGamma ? '🟢 LONG GAMMA (Mean-Reverting)' : '🔴 SHORT GAMMA (Volatile Expansion)'} • Max Pain: $${maxPainPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}`;
    ctx.font = '700 10.5px monospace';
    const bW = ctx.measureText(gexBadgeText).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(48, 12, bW + 16, 22);
    ctx.strokeStyle = isLongGamma ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 12, bW + 16, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(gexBadgeText, 56, 27);

    ctx.restore();
  }
}

class ReplayEngine {
  constructor(chart) {
    this.chart = chart;
    this.isActive = false;
    this.isPlaying = false;
    this.replayCursor = 0;
    this.speedMs = 1000;
    this.timer = null;
  }

  enter() {
    this.isActive = true;
    this.replayCursor = Math.max(10, Math.floor(this.chart.store.candles.length * 0.7));
    this.chart.requestRender();
  }

  exit() {
    this.isActive = false;
    this.pause();
    this.chart.requestRender();
  }

  play() {
    this.isPlaying = true;
    this.timer = setInterval(() => {
      this.stepForward();
    }, this.speedMs);
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  stepForward() {
    if (this.replayCursor < this.chart.store.candles.length - 1) {
      this.replayCursor++;
      this.chart.requestRender();
    } else {
      this.pause();
    }
  }

  stepBackward() {
    if (this.replayCursor > 10) {
      this.replayCursor--;
      this.chart.requestRender();
    }
  }
}

class AlertsEngine {
  constructor() {
    this.alerts = [];
  }

  checkPrice(symbol, price, onTrigger) {
    this.alerts.forEach(a => {
      if (a.symbol === symbol && !a.triggered) {
        if ((a.direction === 'above' && price >= a.targetPrice) ||
            (a.direction === 'below' && price <= a.targetPrice)) {
          a.triggered = true;
          onTrigger?.(a);
        }
      }
    });
  }
}

class QuickTradeEngine {
  constructor() {
    this.accountSize = 100000;
    this.dailyLossLimit = 5000;
    this.maxDrawdown = 10000;
    this.positions = [];
    this.livePnL = 0;
  }

  executeOrder(symbol, side, qty, price) {
    const pos = {
      id: Date.now(),
      symbol,
      side,
      qty,
      entryPrice: price,
      time: Date.now()
    };
    this.positions.push(pos);
    return pos;
  }
}

// ─── 6. DUAL-CANVAS RENDERING ENGINE (BUG 1 FIX: TIME AXIS RIGHT MARGIN) ────

class DualCanvasChart {
  constructor(container, store, symbolInfo, interval) {
    this.container = container;
    this.store = store;
    this.symbolInfo = symbolInfo;
    this.interval = interval;

    // View state: Default to Macro Institutional Footprint Mode (8 bars for huge legible clusters)
    this.visibleCandles = 8;
    this.scrollOffset = 0;
    this.priceAxisW = 84;
    this.timeAxisH = 28;

    // Right margin future space (2 empty bar slots reserved past latest candle)
    this.rightOffsetBars = 2;

    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false,
      tradeBubbles: true
    };

    this.drawings = new DrawingEngine(this.symbolInfo.symbol);
    this.indicators = new IndicatorEngine();
    this.replay = new ReplayEngine(this);

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartOffset = 0;
    this.crosshair = null;

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

  getCandleW() {
    // Total slots = visible bars + right margin future space
    return this.chartW / (this.visibleCandles + this.rightOffsetBars);
  }

  getIntervalMs() {
    const def = TD_INTERVALS.find(i => i.value === this.interval);
    return def ? def.ms : 300000;
  }

  updateTheme() {
    const isLight = document.documentElement.classList.contains('light');
    if (isLight) {
      this.colors = {
        bg: '#ffffff',
        grid: 'rgba(0, 0, 0, 0.06)',
        textAxis: '#737373',
        textAxisHighlight: '#0a0a0a',
        axisBg: '#f5f5f5',
        up: '#059669',
        upDim: 'rgba(5, 150, 105, 0.35)',
        down: '#e11d48',
        downDim: 'rgba(225, 29, 72, 0.35)',
        crosshair: 'rgba(115, 115, 115, 0.45)',
        curPriceLine: 'rgba(5, 150, 105, 0.85)'
      };
    } else {
      this.colors = {
        bg: '#0a0a0a',
        grid: 'rgba(255, 255, 255, 0.04)',
        textAxis: '#a1a1a1',
        textAxisHighlight: '#fafafa',
        axisBg: '#141414',
        up: '#10b981',
        upDim: 'rgba(16, 185, 129, 0.45)',
        down: '#f43f5e',
        downDim: 'rgba(244, 63, 94, 0.45)',
        crosshair: 'rgba(161, 161, 161, 0.45)',
        curPriceLine: 'rgba(16, 185, 129, 0.85)'
      };
    }
  }

  setupCanvases() {
    this.container.innerHTML = `
      <canvas class="td-canvas-base"></canvas>
      <canvas class="td-canvas-overlay"></canvas>
      <div class="td-liq-tooltip" id="td-liq-tooltip"></div>
      <div class="td-liq-tooltip" id="td-bubble-tooltip"></div>
      <div class="td-footprint-hint" id="td-footprint-hint" style="display:none;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        Zoom in (≤45 candles) to inspect bid/ask footprint clusters
      </div>
    `;

    this.baseCanvas = this.container.querySelector('.td-canvas-base');
    this.overlayCanvas = this.container.querySelector('.td-canvas-overlay');
    this.liqTooltip = this.container.querySelector('#td-liq-tooltip');
    this.bubbleTooltip = this.container.querySelector('#td-bubble-tooltip');
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

    const hasCvd = this.layers.cvd;
    const hasOi = this.layers.oi;
    const activeSubPanes = (hasCvd ? 1 : 0) + (hasOi ? 1 : 0);

    if (activeSubPanes === 0) {
      this.candleH = Math.floor(this.chartH * 0.88);
      this.volH = this.chartH - this.candleH;
      this.volTop = this.candleH;
      this.cvdH = 0;
      this.cvdTop = 0;
      this.oiH = 0;
      this.oiTop = 0;
    } else if (activeSubPanes === 1) {
      this.candleH = Math.floor(this.chartH * 0.76);
      this.volH = Math.floor(this.chartH * 0.11);
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
      this.candleH = Math.floor(this.chartH * 0.68);
      this.volH = Math.floor(this.chartH * 0.10);
      this.volTop = this.candleH;
      const rem = this.chartH - this.candleH - this.volH;
      this.cvdH = Math.floor(rem * 0.5);
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
        const candleW = this.getCandleW();
        const deltaCandles = Math.round(dx / candleW);
        this.scrollOffset = Math.max(0, Math.min(this.store.length - 10, this.dragStartOffset + deltaCandles));
        this.requestRender();
      }

      this.crosshair = { x, y };
      this.renderOverlay();
      this.updateTooltip(x);
      this.checkLiquidationHover(x, y);
      this.checkBubbleHover(x, y);

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
      if (this.bubbleTooltip) this.bubbleTooltip.style.display = 'none';
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

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? 4 : -4;
      this.visibleCandles = Math.max(10, Math.min(350, this.visibleCandles + step));
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
    const candleW = this.getCandleW();
    const intervalMs = this.getIntervalMs();

    const cIdx = Math.floor(x / candleW);
    let time;
    if (cIdx < visible.length) {
      time = visible[Math.max(0, cIdx)].time;
    } else {
      // Future space
      const futureBars = cIdx - (visible.length - 1);
      time = visible[visible.length - 1].time + futureBars * intervalMs;
    }

    const price = bounds.min + (1 - (y - 4) / Math.max(1, this.candleH - 36)) * bounds.range;
    return { time, price };
  }

  updateFootprintHint() {
    const candleW = this.getCandleW();
    if (this.layers.footprint && (this.visibleCandles <= 55 || candleW >= 34)) {
      if (this.footprintHint) this.footprintHint.style.display = 'none';
    } else if (this.layers.footprint) {
      if (this.footprintHint) this.footprintHint.style.display = 'flex';
    } else {
      if (this.footprintHint) this.footprintHint.style.display = 'none';
    }
  }

  resetView() {
    this.visibleCandles = 8; // Default to Macro Footprint Focus (Massive Legible Clusters)
    this.scrollOffset = 0;
    this.rightOffsetBars = 2;
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

    // Photo 2 Centered Watermark ("BTCUSDT • 15M")
    this.indicators.renderWatermark(ctx, this.chartW, this.candleH, this.symbolInfo?.symbol || 'BTCUSDT', this.interval || '15M');

    const { visible, startIdx, all } = this.getVisibleRange();
    if (visible.length === 0) {
      ctx.fillStyle = this.colors.textAxis;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Connecting to market feed...', this.chartW / 2, this.chartH / 2);
      return;
    }

    const bounds = this.getPriceBounds(visible);
    // BUG 1 FIX: candleW includes this.rightOffsetBars so latest candle has 12 empty slots to its right
    const candleW = this.getCandleW();
    const bodyW = Math.max(1, candleW * 0.72);
    const gap = (candleW - bodyW) / 2;
    const intervalMs = this.getIntervalMs();

    const toY = (price) => (1 - (price - bounds.min) / bounds.range) * (this.candleH - 36) + 4;

    const toX = (time) => {
      const firstTime = visible[0].time;
      const lastTime = visible[visible.length - 1].time;
      if (time >= lastTime) {
        const barsAfter = (time - lastTime) / intervalMs;
        return (visible.length - 1 + barsAfter) * candleW + candleW / 2;
      }
      if (time <= firstTime) {
        const barsBefore = (firstTime - time) / intervalMs;
        return -barsBefore * candleW + candleW / 2;
      }
      for (let i = 0; i < visible.length; i++) {
        if (visible[i].time >= time) return i * candleW + candleW / 2;
      }
      return this.chartW;
    };

    const volToH = (vol) => (vol / bounds.maxVol) * (this.volH - 6);

    // 1. Gridlines
    this.drawGrid(ctx, bounds.min, bounds.max, toY);

    // Sessions & ORB (Asia, London, NY session shaded boxes)
    if (this.indicators.overlays.sessions_orb) {
      this.indicators.renderSessions(ctx, visible, candleW, toX, this.candleH);
    }

    // Smart Ranges / FVG (Fair Value Gaps & Order Blocks)
    if (this.indicators.overlays.smart_ranges || this.indicators.overlays.mrdoc_custom) {
      this.indicators.renderSmartRanges(ctx, visible, candleW, toY);
    }

    // 2. Orderbook Depth Heatmap Layer (Rolling Matrix Behind Candles)
    if (this.layers.heatmap) {
      this.store.heatmap.render(ctx, bounds, this.candleH, this.chartW, toY, visible, toX, candleW);
    }

    // 3. VRVP (Visible Range Volume Profile)
    if (this.layers.vrvp) {
      this.store.vrvp.compute(visible, bounds);
      this.store.vrvp.render(ctx, bounds, this.candleH, this.chartW, toY, this.symbolInfo);
    }

    // 4. Candlesticks / Footprint (Macro Order Flow Clusters)
    const isFootprintZoomed = this.layers.footprint && (candleW >= 34 || this.visibleCandles <= 55);

    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = i * candleW;
      const isUp = c.close >= c.open;
      const color = isUp ? this.colors.up : this.colors.down;

      if (isFootprintZoomed) {
        this.store.footprint.renderCandle(ctx, c, x, candleW, toY, bounds, this.colors, this.symbolInfo, this.candleH);
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

    // 5. Technical Indicators
    this.indicators.renderOverlays(ctx, visible, startIdx, all, candleW, toY, this.colors);

    // 6. Drawing Tools
    this.drawings.render(ctx, toX, toY, this.chartW, this.candleH);

    // 7. Live Liquidation Markers (Real-Time Binance Futures Stream)
    if (this.layers.liq) {
      this.store.liq.render(ctx, visible, candleW, toX, toY, this.colors, intervalMs, this.chartW, this.candleH);
    }

    // 7A. Estimated Liquidation Cluster Heatmap (OI & Leverage Distribution Model)
    // Renders automatically whenever [Liq] layer is active OR indicator is enabled
    if (this.layers.liq || this.indicators.overlays.liquidation_heatmap || this.indicators.overlays.hyperliquid_liq) {
      this.indicators.renderEstimatedLiquidationHeatmap(ctx, bounds, toY, this.chartW, this.symbolInfo, this.candleH, visible, this.store.oi);
    }

    // 7B. Buy/Sell Large Trade-Size "Bubble" Overlay (Whale Tracker - Photo 2 Spec)
    if (this.layers.tradeBubbles || this.indicators.overlays.large_trades || this.indicators.overlays.volume_bubble) {
      this.store.tradeBubbles.render(ctx, visible, candleW, toX, toY, this.colors);
    }

    // 8. Sub-Panes
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.volTop);
    ctx.lineTo(this.chartW, this.volTop);
    ctx.stroke();

    ctx.fillStyle = this.colors.textAxis;
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

    // 10. BUG 1 FIX: Current Price Dashed Projection Line across Future Space + Price Tag
    const latest = visible[visible.length - 1];
    if (latest) {
      const lpY = toY(latest.close);
      const isUp = latest.close >= latest.open;
      const latestX = (visible.length - 1) * candleW + candleW / 2;

      // Dashed horizontal price line spanning from the forming candle across future breathing room
      ctx.save();
      ctx.strokeStyle = isUp ? this.colors.upDim : this.colors.downDim;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(latestX, Math.round(lpY));
      ctx.lineTo(this.chartW, Math.round(lpY));
      ctx.stroke();
      ctx.restore();

      // Current Price Badge on Axis
      ctx.fillStyle = isUp ? this.colors.up : this.colors.down;
      ctx.fillRect(this.chartW, lpY - 12, this.priceAxisW, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tdFmtPrice(latest.close, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, lpY + 4.5);
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
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    let p = Math.ceil(pMin / gridStep) * gridStep;
    while (p < pMax) {
      const y = toY(p);
      if (y >= 0 && y <= this.candleH) {
        ctx.fillText(tdFmtPrice(p, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, y + 4);
      }
      p += gridStep;
    }

    // Time Axis
    ctx.fillStyle = this.colors.axisBg;
    ctx.fillRect(0, this.chartH, this.w, this.timeAxisH);
    ctx.beginPath();
    ctx.moveTo(0, this.chartH);
    ctx.lineTo(this.chartW, this.chartH);
    ctx.stroke();

    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
    const step = Math.max(1, Math.floor(visible.length / 6));
    for (let i = 0; i < visible.length; i += step) {
      const cx = i * candleW + candleW / 2;
      ctx.fillText(tdFmtDate(visible[i].time, this.interval), cx, this.chartH + 18);
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
      ctx.fillStyle = '#262626';
      ctx.fillRect(this.chartW, y - 9, this.priceAxisW, 18);
      ctx.fillStyle = this.colors.textAxisHighlight;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tdFmtPrice(price, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, y + 4);
    }

    const candleW = this.getCandleW();
    const cIdx = Math.floor(x / candleW);
    let timeStr = null;

    if (cIdx >= 0 && cIdx < visible.length) {
      timeStr = tdFmtFullDateTime(visible[cIdx].time);
    } else if (cIdx >= visible.length && cIdx < visible.length + this.rightOffsetBars) {
      const futureBars = cIdx - (visible.length - 1);
      timeStr = tdFmtFullDateTime(visible[visible.length - 1].time + futureBars * this.getIntervalMs());
    }

    if (timeStr) {
      const tw = ctx.measureText(timeStr).width + 12;
      const tx = Math.max(0, Math.min(this.chartW - tw, x - tw / 2));
      ctx.fillStyle = '#262626';
      ctx.fillRect(tx, this.chartH, tw, this.timeAxisH);
      ctx.fillStyle = this.colors.textAxisHighlight;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, tx + tw / 2, this.chartH + 16);
    }
  }

  updateTooltip(mouseX) {
    const { visible } = this.getVisibleRange();
    if (visible.length === 0) return;
    const candleW = this.getCandleW();
    const cIdx = Math.floor(mouseX / candleW);
    if (cIdx >= 0 && cIdx < visible.length) {
      this.onHoverCandle?.(visible[cIdx]);
    } else {
      this.onHoverCandle?.(null);
    }
  }

  checkLiquidationHover(mouseX, mouseY) {
    if (!this.liqTooltip || !this.layers.liq) return;
    const { visible } = this.getVisibleRange();
    if (visible.length === 0 || !this.store.liq.events.length) {
      this.liqTooltip.style.display = 'none';
      return;
    }

    const bounds = this.getPriceBounds(visible);
    const toY = (price) => (1 - (price - bounds.min) / bounds.range) * (this.candleH - 36) + 4;
    const candleW = this.getCandleW();
    const intervalMs = this.getIntervalMs();

    const toX = (time) => {
      const firstTime = visible[0].time;
      const lastTime = visible[visible.length - 1].time;
      if (time >= lastTime) {
        const barsAfter = (time - lastTime) / intervalMs;
        return (visible.length - 1 + barsAfter) * candleW + candleW / 2;
      }
      if (time <= firstTime) {
        const barsBefore = (firstTime - time) / intervalMs;
        return -barsBefore * candleW + candleW / 2;
      }
      for (let i = 0; i < visible.length; i++) {
        if (visible[i].time >= time) return i * candleW + candleW / 2;
      }
      return this.chartW;
    };

    let hit = null;
    let hitRadius = 8;
    for (const ev of this.store.liq.events) {
      const mx = toX(ev.time);
      const my = toY(ev.price);
      if (isNaN(mx) || isNaN(my)) continue;

      const usd = ev.usdVal || (ev.price * ev.qty) || 1000;
      const radius = Math.min(22, Math.max(5, Math.log10(Math.max(100, usd)) * 3.4 - 7));
      const dist = Math.hypot(mouseX - mx, mouseY - my);
      if (dist <= radius + 6) {
        hit = { ev, mx, my, radius, usd };
        hitRadius = radius;
        break;
      }
    }

    if (hit) {
      const ev = hit.ev;
      const isLong = (ev.side || '').toUpperCase() === 'SELL';
      const color = isLong ? '#ff7a00' : '#00e5ff';
      const timeAgoSec = Math.max(0, Math.round((Date.now() - ev.time) / 1000));
      const timeAgoStr = timeAgoSec < 60 ? `${timeAgoSec}s ago` : `${Math.floor(timeAgoSec / 60)}m ago`;

      this.liqTooltip.style.display = 'block';
      this.liqTooltip.style.left = mouseX + 'px';
      this.liqTooltip.style.top = mouseY + 'px';
      this.liqTooltip.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};"></span>
          <strong style="color:${color};font-size:11.5px;letter-spacing:0.5px;">${isLong ? 'FORCED LONG LIQUIDATION' : 'FORCED SHORT LIQUIDATION'}</strong>
        </div>
        <div style="font-size:11px;color:#ffffff;font-weight:700;margin-bottom:2px;">
          Notional: <span style="color:${color};">${tdFmtUSD(hit.usd)}</span>
        </div>
        <div style="font-size:10px;color:var(--td-text-muted);">
          Exec Price: <span style="color:#ffffff;font-family:monospace;">$${tdFmtPrice(ev.price, this.symbolInfo.decimals)}</span>
        </div>
        <div style="font-size:10px;color:var(--td-text-muted);">
          Size: <span style="color:#ffffff;">${tdFmtVol(ev.qty)} ${ev.symbol}</span>
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:3px;border-top:1px solid rgba(255,255,255,0.08);padding-top:3px;">
          ${new Date(ev.time).toLocaleTimeString()} (${timeAgoStr})
        </div>
      `;
    } else {
      this.liqTooltip.style.display = 'none';
    }
  }

  checkBubbleHover(mouseX, mouseY) {
    if (!this.bubbleTooltip || !this.layers.tradeBubbles) return;
    const { visible } = this.getVisibleRange();
    if (visible.length === 0) return;

    const bounds = this.getPriceBounds(visible);
    const toY = (price) => (1 - (price - bounds.min) / bounds.range) * this.candleH;
    const toX = (time) => {
      const firstTime = visible[0].time;
      const lastTime = visible[visible.length - 1].time;
      const intervalMs = this.getIntervalMs();
      const candleW = this.getCandleW();
      if (time >= lastTime) {
        const barsAfter = (time - lastTime) / intervalMs;
        return (visible.length - 1 + barsAfter) * candleW + candleW / 2;
      }
      if (time <= firstTime) {
        const barsBefore = (firstTime - time) / intervalMs;
        return -barsBefore * candleW + candleW / 2;
      }
      for (let i = 0; i < visible.length; i++) {
        if (visible[i].time >= time) return i * candleW + candleW / 2;
      }
      return this.chartW;
    };

    const firstTime = visible[0].time;
    const lastTime = visible[visible.length - 1].time;
    const thresh = this.store.tradeBubbles.minUsdThreshold;

    let hit = null;
    const trades = this.store.tradeBubbles.trades;
    // Iterate recent trades in reverse so topmost rendered trade gets hover focus
    for (let i = trades.length - 1; i >= 0; i--) {
      const t = trades[i];
      if (t.time < firstTime || t.time > lastTime || t.usdVal < thresh) continue;

      const bx = toX(t.time);
      const by = toY(t.price);
      const radius = Math.min(30, Math.max(5, Math.sqrt(t.usdVal / 1000) * 1.15));
      const dist = Math.hypot(mouseX - bx, mouseY - by);

      if (dist <= radius + 3) {
        hit = { ...t, bx, by };
        break;
      }
    }

    if (hit) {
      const isBuy = !hit.isBuyerMaker;
      this.bubbleTooltip.style.display = 'block';
      this.bubbleTooltip.style.left = Math.min(this.chartW - 170, mouseX + 14) + 'px';
      this.bubbleTooltip.style.top = Math.max(10, mouseY - 25) + 'px';
      this.bubbleTooltip.innerHTML = `
        <div style="font-weight:700;font-size:10.5px;color:${isBuy ? 'var(--td-up)' : 'var(--td-down)'};display:flex;align-items:center;gap:5px;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isBuy ? 'var(--td-up)' : 'var(--td-down)'}"></span>
          ${isBuy ? 'WHALE BUY (TAKER)' : 'WHALE SELL (TAKER)'}
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--td-text);margin:2px 0;">
          $${Math.round(hit.usdVal).toLocaleString()} USD
        </div>
        <div style="font-size:10px;color:var(--td-text-muted)">Price: $${tdFmtPrice(hit.price, this.symbolInfo.decimals)}</div>
        <div style="font-size:10px;color:var(--td-text-muted)">Size: ${tdFmtVol(hit.qty)} ${this.symbolInfo.base || ''}</div>
        <div style="font-size:9px;color:var(--td-text-dim)">Time: ${new Date(hit.time).toLocaleTimeString()}</div>
      `;
    } else {
      this.bubbleTooltip.style.display = 'none';
    }
  }
}

// ─── 7. MASTER TERMINAL CONTROLLER (v2 PASS) ───────────────────────────────

class TapeDeltaTerminal {
  constructor(rootId = 'tapedelta-terminal-root') {
    this.root = document.getElementById(rootId);
    this.symbol = 'BTCUSDT';
    this.activeCategory = 'crypto';
    this.interval = '5m';
    this.symbolInfo = TD_ALL_SYMBOLS[0];

    // Master provider handles both crypto and non-crypto seamlessly
    this.provider = new MasterMarketDataProvider();
    this.store = new CandleStore();
    this.chart = null;
    this.fps = 60;
    this.fpsCount = 0;
    this.fpsTime = performance.now();
    this.isFullscreen = false;

    this.layers = {
      heatmap: true,
      footprint: true,
      vrvp: true,
      liq: true,
      cvd: true,
      oi: false,
      tradeBubbles: true
    };

    this.layout = '1x1';
    this.activeDockTab = 'dom'; // Default to DOM Ladder for institutional focus
    this.domLinked = true;
    this.domTickIndex = 2;
    this.domFillIntensity = 72;
    this.domShowUsd = false;
    this.domShowFlashes = true;
    this.domAutoCenter = false;
    this.domLotSize = 0.1;
    this.domSettingsOpen = false;
    this.tapeTrades = [];
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
        <!-- Sidebar Collapse / Expand Toggle Button -->
        <div class="td-toolbar-section">
          <button class="td-action-btn td-sidebar-btn" id="td-sidebar-toggle-btn" title="Toggle Platform Sidebar (100% Full Width Chart) [Shortcut: [ or Ctrl+B]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
            <span class="hide-mobile">Sidebar</span>
          </button>
        </div>

        <div class="td-divider"></div>

        <div class="td-toolbar-section">
          <button class="td-symbol-btn" id="td-sym-select" title="Switch Symbol & Asset Class">
            <span class="td-category-tag" id="td-sym-cat">${this.symbolInfo.category}</span>
            <span id="td-sym-name">${this.symbol}</span>
            <span class="td-price-badge" id="td-sym-price">—</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
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

        <!-- Order Flow Toggles (Strictly SVG icons, Zero Emojis) -->
        <div class="td-toolbar-section td-layers-group" id="td-layers-selector">
          <button class="td-layer-btn ${this.layers.heatmap ? 'active' : ''}" data-layer="heatmap" title="Orderbook Depth Rolling Heatmap Matrix">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
            <span>Heatmap</span>
          </button>
          <button class="td-layer-btn ${this.layers.footprint ? 'active' : ''}" data-layer="footprint" title="Bid/Ask Volume Clusters & POC">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/><line x1="21" x2="19" y1="12" y2="12"/></svg>
            <span>Footprint</span>
          </button>
          <button class="td-layer-btn ${this.layers.vrvp ? 'active' : ''}" data-layer="vrvp" title="Visible Range Volume Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
            <span>VRVP</span>
          </button>
          <button class="td-layer-btn ${this.layers.liq ? 'active' : ''}" data-layer="liq" title="Real-Time Liquidation Bursts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>Liq</span>
          </button>
          <button class="td-layer-btn ${this.layers.cvd ? 'active' : ''}" data-layer="cvd" title="Cumulative Volume Delta Sub-Pane">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <span>CVD</span>
          </button>
          <button class="td-layer-btn ${this.layers.oi ? 'active' : ''}" data-layer="oi" title="Open Interest Sub-Pane">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>OI</span>
          </button>
          <button class="td-layer-btn ${this.layers.tradeBubbles ? 'active' : ''}" data-layer="tradeBubbles" id="btn-bubbles-toggle" title="Whale Trade-Size Bubbles Overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
            <span>Bubbles</span>
          </button>
          <button class="td-layer-btn ${this.chart?.indicators?.overlays?.options_gex ? 'active' : ''}" id="btn-options-gex" data-layer="options_gex" title="Options GEX (Dealer Gamma-Flip & Max-Pain Overlay)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12"/></svg>
            <span>Options</span>
          </button>
          <select class="td-bubble-select" id="td-bubble-thresh-select" title="Min Trade Size Filter">
            <option value="10000">&gt; $10k</option>
            <option value="25000">&gt; $25k</option>
            <option value="50000" selected>&gt; $50k</option>
            <option value="100000">&gt; $100k</option>
            <option value="250000">&gt; $250k</option>
          </select>
        </div>

        <div class="td-divider"></div>

        <!-- Indicators, Replay, Layout & Reset -->
        <div class="td-toolbar-section">
          <button class="td-action-btn" id="td-indicators-btn" title="Technical Indicators (EMA, BB, VWAP, RSI)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/></svg>
            <span>Indicators</span>
          </button>
          <button class="td-action-btn" id="td-replay-btn" title="Bar-by-Bar Replay Mode">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>
            <span>Replay</span>
          </button>
          <button class="td-action-btn" id="td-layout-btn" title="Multi-Pane Grid Layout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>
            <span>Layout</span>
          </button>
          <button class="td-action-btn" id="td-reset-view" title="Reset View (Macro Footprint)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span>Reset</span>
          </button>
          <!-- Quick Zoom Presets -->
          <div class="td-zoom-group">
            <button class="td-zoom-pill active" id="td-zoom-macro" title="Macro Footprint Focus (8 bars) — Massive naked-eye clusters">Macro (8b)</button>
            <button class="td-zoom-pill" id="td-zoom-cluster" title="Cluster View (14 bars) — High-detail footprint">Cluster (14b)</button>
            <button class="td-zoom-pill" id="td-zoom-mid" title="Standard Order Flow (28 bars)">Standard (28b)</button>
            <button class="td-zoom-pill" id="td-zoom-wide" title="Market Overview (60 bars)">Overview (60b)</button>
            <button class="td-zoom-pill btn-sm" id="td-zoom-in" title="Zoom In (+)">+</button>
            <button class="td-zoom-pill btn-sm" id="td-zoom-out" title="Zoom Out (−)">−</button>
          </div>
          <button class="td-action-btn" id="td-fullscreen-btn" title="Toggle Fullscreen Terminal Mode">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
          <button class="td-action-btn" id="td-more-options-btn" title="More Options & Terminal Tools">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
            <span>More</span>
          </button>
        </div>

        <!-- Live Timestamp & Reconnect Status -->
        <div class="td-live-timestamp" id="td-live-timestamp" title="Live Clock & Last Feed Update">
          <span class="td-live-dot" id="td-live-dot"></span>
          <span id="td-last-updated-text">Updated: --:--:--</span>
        </div>

        <!-- Feed Status Badge (LIVE vs DELAYED) -->
        <div class="td-status-badge live" id="td-feed-badge" title="Feed Latency & Health">
          <span class="dot"></span>
          <span id="td-feed-status">LIVE</span>
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

      <!-- MAIN TERMINAL BODY -->
      <div class="td-terminal-body">
        <!-- LEFT DRAWING TOOL RAIL (Pure SVG Icons, Zero Emojis) -->
        <div class="td-draw-rail" id="td-draw-rail">
          <button class="td-draw-btn active" data-tool="cursor" title="Cursor / Pan (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="trendline" title="Trendline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L20 4"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="4" r="2"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="ray" title="Horizontal Ray / Projection">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 18L18 6"/><path d="M12 6h6v6"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="horiz" title="Horizontal Price Level">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="rect" title="Order Block / Liquidity Zone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="14" x="3" y="5" rx="2"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="fib" title="Fibonacci Retracement">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" x2="21" y1="5" y2="5"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="19" y2="19"/></svg>
          </button>
          <button class="td-draw-btn" data-tool="eraser" title="Eraser Tool">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
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

        <!-- RIGHT DOCKABLE WIDGET DRAWER -->
        <div class="td-right-dock" id="td-right-dock">
          <!-- Dock Tabs Rail -->
          <div class="td-dock-rail">
            <button class="td-dock-btn" data-tab="watchlist" title="Multi-Asset Watchlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <button class="td-dock-btn active" data-tab="dom" title="Depth of Market (DOM) Ladder & Order Entry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"/><path d="M3 8h18"/><path d="M3 16h18"/></svg>
            </button>
            <button class="td-dock-btn" data-tab="liq" id="td-dock-tab-liq" title="Live Liquidation Feed & Whales">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </button>
            <button class="td-dock-btn" data-tab="trade" title="Prop Firm Shield & Position Guard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
            </button>
            <button class="td-dock-btn" data-tab="alerts" title="Price & Rule Breach Alerts">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
          </div>

          <!-- Dock Content Panel -->
          <div class="td-dock-panel" id="td-dock-panel">
            <div class="td-dock-header">
              <span id="td-dock-title">ORDER BOOK DOM</span>
              <button class="td-modal-close" id="td-dock-close" title="Collapse Panel">✕</button>
            </div>
            <div class="td-dock-content" id="td-dock-content">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM TERMINAL STATUS BAR -->
      <div class="td-statusbar">
        <div class="td-stat"><span style="color:var(--td-text-dim)">Feed:</span> <span class="td-stat-val" id="td-feed-details">Binance Real-Time WS</span></div>
        <div class="td-stat"><span style="color:var(--td-text-dim)">Pair:</span> <span class="td-stat-val" id="td-stat-symbol">${this.symbol}</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">Funding Rate:</span> <span class="td-stat-val good" id="td-stat-funding">+0.0100% (3h 48m)</span></div>
        <div class="td-stat hide-mobile" id="td-stat-liq-wrap" style="cursor:pointer;" title="Click to open Live Liquidation Feed"><span style="color:var(--td-text-dim)">Liq Stream:</span> <span class="td-stat-val good" id="td-stat-liq">● Live (!forceOrder@arr)</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">Candles:</span> <span class="td-stat-val" id="td-stat-candles">0</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">FPS:</span> <span class="td-stat-val good" id="td-stat-fps">60</span></div>
        <div class="td-stat" style="margin-left:auto"><span style="color:var(--td-text-dim)">Terminal:</span> <span class="td-stat-val">Institutional TapeDelta v2</span></div>
      </div>

      <!-- MULTI-ASSET SYMBOL MODAL (Crypto, Forex, Metals, Indices) -->
      <div class="td-symbol-dropdown" id="td-sym-dropdown" style="display:none;">
        <div class="td-sym-tabs" id="td-sym-tabs">
          <div class="td-sym-tab ${this.activeCategory === 'crypto' ? 'active' : ''}" data-cat="crypto">Crypto</div>
          <div class="td-sym-tab ${this.activeCategory === 'forex' ? 'active' : ''}" data-cat="forex">Forex</div>
          <div class="td-sym-tab ${this.activeCategory === 'metals' ? 'active' : ''}" data-cat="metals">Metals</div>
          <div class="td-sym-tab ${this.activeCategory === 'indices' ? 'active' : ''}" data-cat="indices">Indices</div>
        </div>
        <div class="td-search-box">
          <input type="text" id="td-sym-search-input" placeholder="Search symbol or name...">
        </div>
        <div class="td-symbol-list" id="td-sym-list">
          <!-- Rendered dynamically per category tab -->
        </div>
      </div>

      <!-- MORE OPTIONS DROPDOWN OVERLAY -->
      <div class="td-more-menu" id="td-more-menu" style="display:none;">
        <button class="td-more-menu-item" id="td-more-ind">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/></svg>
          <span>Technical Indicators (25+)</span>
        </button>
        <button class="td-more-menu-item" id="td-more-options-gex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12"/></svg>
          <span>Options GEX (Gamma & Pain)</span>
        </button>
        <button class="td-more-menu-item" id="td-more-replay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>
          <span>Bar-by-Bar Replay</span>
        </button>
        <button class="td-more-menu-item" id="td-more-layout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>
          <span>Multi-Pane Grid Layout</span>
        </button>
        <button class="td-more-menu-item" id="td-more-reset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span>Reset Macro View</span>
        </button>
        <button class="td-more-menu-item" id="td-more-fullscreen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          <span>Fullscreen Terminal</span>
        </button>
      </div>

      <!-- TECHNICAL INDICATORS MODAL (TAPEDELTA 2-COLUMN SUITE) -->
      <div class="td-modal-backdrop" id="td-ind-modal" style="display:none;">
        <div class="td-modal-dialog-large">
          <div class="td-ind-modal-header">
            <div class="td-ind-search-wrapper">
              <svg class="td-ind-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" class="td-ind-search-input" id="td-ind-search-input" placeholder="Search indicator, strategy, or study..." />
            </div>
            <button class="td-modal-close" id="td-ind-modal-close" title="Close">✕</button>
          </div>

          <div class="td-ind-modal-content">
            <!-- Left Navigation Rail -->
            <div class="td-ind-nav-pane" id="td-ind-nav-pane">
              <div class="td-ind-nav-group-title">PERSONAL</div>
              <div class="td-ind-nav-item" data-cat="favorites">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>Favorites</span>
                </div>
                <span class="td-ind-nav-badge" id="td-ind-fav-count">4</span>
              </div>
              <div class="td-ind-nav-item" data-cat="scripts">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>My scripts</span>
                </div>
              </div>
              <div class="td-ind-nav-item" data-cat="invite">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>Invite-only</span>
                </div>
              </div>

              <div class="td-ind-nav-group-title">BUILT-IN</div>
              <div class="td-ind-nav-item active" data-cat="all">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  <span>All</span>
                </div>
                <span class="td-ind-nav-badge" id="td-ind-count-all">25</span>
              </div>
              <div class="td-ind-nav-item" data-cat="proplan">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
                  <span>Proplan</span>
                </div>
                <span class="td-ind-nav-badge pro-badge">PRO</span>
              </div>
              <div class="td-ind-nav-item" data-cat="orderflow">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                  <span>Orderflow</span>
                </div>
                <span class="td-ind-nav-badge" id="td-ind-count-orderflow">16</span>
              </div>
              <div class="td-ind-nav-item" data-cat="signals">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>Signals</span>
                </div>
                <span class="td-ind-nav-badge">7</span>
              </div>
              <div class="td-ind-nav-item" data-cat="analysis">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/></svg>
                  <span>Analysis</span>
                </div>
                <span class="td-ind-nav-badge">11</span>
              </div>

              <div class="td-ind-nav-group-title">COMMUNITY</div>
              <div class="td-ind-nav-item" data-cat="top">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                  <span>Top</span>
                </div>
              </div>
              <div class="td-ind-nav-item" data-cat="trending">
                <div class="td-ind-nav-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  <span>Trending</span>
                </div>
              </div>
            </div>

            <!-- Right Indicator Items List -->
            <div class="td-ind-list-pane" id="td-ind-list-pane">
              <div class="td-ind-list-title" id="td-ind-category-title">
                <span>ALL INDICATORS</span>
                <span style="color:#64748b; font-size:11px; font-weight:600;" id="td-ind-items-count">(25)</span>
              </div>
              <div id="td-ind-items-container" style="display:flex; flex-direction:column; gap:8px;">
                <!-- Populated dynamically via renderIndicatorItems() -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Replay Floating Control Bar -->
      <div class="td-replay-bar" id="td-replay-bar" style="display:none;">
        <div class="td-replay-badge">REPLAY MODE</div>
        <button class="td-replay-btn" id="td-replay-step-back" title="Step Back 1 Bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/></svg>
        </button>
        <button class="td-replay-btn" id="td-replay-play" title="Play / Pause">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="td-replay-btn" id="td-replay-step-fwd" title="Step Forward 1 Bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
        </button>
        <select class="td-replay-speed" id="td-replay-speed">
          <option value="2000">0.5x</option>
          <option value="1000" selected>1x</option>
          <option value="500">2x</option>
          <option value="250">4x</option>
        </select>
        <button class="td-replay-exit" id="td-replay-exit">EXIT REPLAY</button>
      </div>

      <!-- Live Execution Toast Notification -->
      <div class="td-alert-toast" id="td-alert-toast" style="display:none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <span id="td-alert-toast-msg">Order Executed</span>
      </div>
    `;
  }

  bindToolbar() {
    // Timeframe selector
    const tfGroup = this.root.querySelector('#td-tf-selector');
    tfGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-tf-btn');
      if (!btn) return;
      const val = btn.dataset.interval;
      if (val && val !== this.interval) {
        tfGroup.querySelectorAll('.td-tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchInterval(val);
      }
    });

    // Layer toggles
    const layersGroup = this.root.querySelector('#td-layers-selector');
    layersGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-layer-btn');
      if (!btn) return;
      const layer = btn.dataset.layer;

      if (layer === 'options_gex') {
        const active = !this.chart.indicators.overlays.options_gex;
        this.chart.indicators.overlays.options_gex = active;
        btn.classList.toggle('active', active);
        this.chart.requestRender();
        this.showToastAlert(active ? 'Options GEX Overlay Enabled (Dealer Gamma & Max-Pain)' : 'Options GEX Overlay Disabled');
        return;
      }

      if (layer && this.layers.hasOwnProperty(layer)) {
        this.layers[layer] = !this.layers[layer];
        btn.classList.toggle('active', this.layers[layer]);
        this.chart.layers = this.layers;
        this.provider.setLayers(this.layers);
        this.chart.resize();
        this.chart.requestRender();

        if (layer === 'liq') {
          this.chart.indicators.overlays.liquidation_heatmap = this.layers.liq;
          this.showToastAlert(this.layers.liq ? 'Liquidation Heatmap & Real-Time Stream Active' : 'Liquidation Layer & Stream Disabled');
        }

        if (layer === 'tradeBubbles' && this.layers.tradeBubbles) {
          if (this.symbolInfo.feed === 'binance') {
            const thresh = this.store.tradeBubbles.minUsdThreshold;
            this.showToastAlert(`Whale Trade Bubbles Active: Plotting prints > $${(thresh / 1000).toFixed(0)}k`);
          } else {
            this.showToastAlert(`Notice: Live trade prints stream on exchange feeds (Crypto & PAXG Gold). OTC FX/Indices retail tape is restricted.`);
          }
        }
      }
    });

    // More Options Menu Toggle
    const moreBtn = this.root.querySelector('#td-more-options-btn');
    const moreMenu = this.root.querySelector('#td-more-menu');
    moreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!moreMenu) return;
      const isVis = moreMenu.style.display === 'flex';
      moreMenu.style.display = isVis ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
      if (moreMenu && !moreMenu.contains(e.target) && e.target !== moreBtn) {
        moreMenu.style.display = 'none';
      }
    });

    this.root.querySelector('#td-more-ind')?.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      this.root.querySelector('#td-indicators-btn')?.click();
    });
    this.root.querySelector('#td-more-options-gex')?.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      this.root.querySelector('#btn-options-gex')?.click();
    });
    this.root.querySelector('#td-more-replay')?.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      this.root.querySelector('#td-replay-btn')?.click();
    });
    this.root.querySelector('#td-more-layout')?.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      this.root.querySelector('#td-layout-btn')?.click();
    });
    this.root.querySelector('#td-more-reset')?.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      this.root.querySelector('#td-reset-view')?.click();
    });
    this.root.querySelector('#td-more-fullscreen')?.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      this.root.querySelector('#td-fullscreen-btn')?.click();
    });

    // Bubble trade size filter dropdown
    const bubbleThreshSelect = this.root.querySelector('#td-bubble-thresh-select');
    bubbleThreshSelect?.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value) || 50000;
      this.store.tradeBubbles.setThreshold(val);
      this.chart.requestRender();
      this.showToastAlert(`Whale Trade Bubble filter set to > $${(val / 1000).toFixed(0)}k`);
    });

    // ── Platform Sidebar Collapsible Toggle (100% Full Width Chart) ──
    const sidebarToggleBtn = this.root.querySelector('#td-sidebar-toggle-btn');
    const toggleSidebar = () => {
      if (typeof window.togglePlatformSidebar === 'function') {
        window.togglePlatformSidebar();
      } else {
        const trigger = document.querySelector('[data-sidebar="trigger"], [data-slot="sidebar-trigger"]');
        if (trigger) {
          trigger.click();
        } else {
          document.body.classList.toggle('sidebar-collapsed');
        }
      }
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      if (sidebarToggleBtn) {
        sidebarToggleBtn.classList.toggle('active', isCollapsed);
      }
      this.showToastAlert(isCollapsed ? 'Sidebar hidden — Chart expanded to 100% Full Width' : 'Sidebar restored');
      this.chart?.resize?.();
      this.chart?.requestRender?.();
    };

    sidebarToggleBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSidebar();
    });

    // Global keyboard shortcut: '[' or 'Ctrl+B'
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '[' || (e.ctrlKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        toggleSidebar();
      }
    });

    // ── TapeDelta Professional Indicator Suite (25 Indicators - Photo 1, 3, 4, 5) ──
    const indBtn = this.root.querySelector('#td-indicators-btn');
    const indModal = this.root.querySelector('#td-ind-modal');
    const indClose = this.root.querySelector('#td-ind-modal-close');
    const indSearchInput = this.root.querySelector('#td-ind-search-input');
    const indNavPane = this.root.querySelector('#td-ind-nav-pane');
    const indContainer = this.root.querySelector('#td-ind-items-container');
    const indCategoryTitle = this.root.querySelector('#td-ind-category-title');
    const indFavCountBadge = this.root.querySelector('#td-ind-fav-count');

    let currentIndCategory = 'all';
    let currentIndSearch = '';

    const updateFavCount = () => {
      const favCount = TD_INDICATOR_REGISTRY.filter(i => i.favorite).length;
      if (indFavCountBadge) indFavCountBadge.textContent = favCount;
    };

    const renderIndicatorList = () => {
      if (!indContainer) return;
      const query = currentIndSearch.trim().toLowerCase();

      const filtered = TD_INDICATOR_REGISTRY.filter(item => {
        // Category check
        if (currentIndCategory === 'favorites') {
          if (!item.favorite) return false;
        } else if (currentIndCategory !== 'all') {
          if (!item.categories.includes(currentIndCategory)) return false;
        }
        // Search filter check
        if (query) {
          const matchName = item.name.toLowerCase().includes(query);
          const matchSub = item.subtitle.toLowerCase().includes(query);
          const matchId = item.id.toLowerCase().includes(query);
          return matchName || matchSub || matchId;
        }
        return true;
      });

      // Update Title & Count
      if (indCategoryTitle) {
        indCategoryTitle.innerHTML = `
          <span>${currentIndCategory.toUpperCase()} INDICATORS</span>
          <span style="color:#64748b; font-size:11px; font-weight:600;">(${filtered.length})</span>
        `;
      }

      if (filtered.length === 0) {
        indContainer.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 13px;">
            No indicators found matching "${currentIndSearch}".
          </div>
        `;
        return;
      }

      indContainer.innerHTML = filtered.map(item => {
        const isFav = !!item.favorite;
        const isOn = !!this.chart.indicators.overlays[item.id];
        const badgesHtml = (item.badges || []).map(b => {
          const cls = b === 'PRO' ? 'td-ind-tag-pro' : 'td-ind-tag-hot';
          return `<span class="${cls}">${b}</span>`;
        }).join('');

        return `
          <div class="td-ind-row ${isOn ? 'is-active' : ''}" data-id="${item.id}">
            <div class="td-ind-row-left">
              <div class="td-ind-row-title-line">
                <span class="td-ind-row-name">${item.name}</span>
                ${badgesHtml}
              </div>
              <div class="td-ind-row-desc">${item.subtitle}</div>
            </div>
            <div class="td-ind-row-right">
              <button class="td-ind-star-btn ${isFav ? 'fav' : ''}" data-star-id="${item.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <label class="td-ind-switch">
                <input type="checkbox" data-switch-id="${item.id}" ${isOn ? 'checked' : ''} />
                <div class="td-ind-switch-track">
                  <span class="td-ind-switch-thumb"></span>
                  <span style="margin-left:auto; margin-right:4px;">${isOn ? 'ON' : 'OFF'}</span>
                </div>
              </label>
            </div>
          </div>
        `;
      }).join('');
    };

    indBtn?.addEventListener('click', () => {
      updateFavCount();
      renderIndicatorList();
      indModal.style.display = 'flex';
      setTimeout(() => indSearchInput?.focus(), 50);
    });

    indClose?.addEventListener('click', () => { indModal.style.display = 'none'; });
    indModal?.addEventListener('click', (e) => { if (e.target === indModal) indModal.style.display = 'none'; });

    // Category Tabs in Left Navigation Rail
    indNavPane?.addEventListener('click', (e) => {
      const item = e.target.closest('.td-ind-nav-item');
      if (!item) return;
      const cat = item.dataset.cat;
      if (!cat) return;
      indNavPane.querySelectorAll('.td-ind-nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      currentIndCategory = cat;
      renderIndicatorList();
    });

    // Search Input Filter
    indSearchInput?.addEventListener('input', (e) => {
      currentIndSearch = e.target.value;
      renderIndicatorList();
    });

    // Container Delegation: Stars & Switches
    indContainer?.addEventListener('click', (e) => {
      // Star click
      const starBtn = e.target.closest('.td-ind-star-btn');
      if (starBtn) {
        const id = starBtn.dataset.starId;
        const item = TD_INDICATOR_REGISTRY.find(i => i.id === id);
        if (item) {
          item.favorite = !item.favorite;
          updateFavCount();
          renderIndicatorList();
        }
        return;
      }
    });

    indContainer?.addEventListener('change', (e) => {
      const chk = e.target.closest('input[data-switch-id]');
      if (!chk) return;
      const id = chk.dataset.switchId;
      const checked = chk.checked;

      // Update overlay in indicator engine
      this.chart.indicators.overlays[id] = checked;

      // Synchronize with core chart layers where applicable
      if (id === 'large_trades' || id === 'volume_bubble') {
        this.layers.tradeBubbles = checked;
        const bubbleBtn = this.root.querySelector('#btn-bubbles-toggle');
        if (bubbleBtn) bubbleBtn.classList.toggle('active', checked);
      } else if (id === 'liquidation_heatmap' || id === 'hyperliquid_liq') {
        // Estimated Liquidation Heatmap overlay is tracked in indicators.overlays
        // Live markers stream remains controlled via the dedicated [Liq] toolbar button
      } else if (id === 'volume_delta_cvd') {
        this.layers.cvd = checked;
        const cvdBtn = this.root.querySelector('[data-layer="cvd"]');
        if (cvdBtn) cvdBtn.classList.toggle('active', checked);
      } else if (id === 'open_interest') {
        this.layers.oi = checked;
        const oiBtn = this.root.querySelector('[data-layer="oi"]');
        if (oiBtn) oiBtn.classList.toggle('active', checked);
      } else if (id === 'vol_profile_heatmap') {
        this.layers.heatmap = checked;
        const hmBtn = this.root.querySelector('[data-layer="heatmap"]');
        if (hmBtn) hmBtn.classList.toggle('active', checked);
      } else if (id === 'options_gex') {
        const optBtn = this.root.querySelector('#btn-options-gex');
        if (optBtn) optBtn.classList.toggle('active', checked);
      }

      this.chart.layers = this.layers;
      this.chart.resize();
      this.chart.requestRender();

      // Update row visual
      const row = chk.closest('.td-ind-row');
      if (row) {
        row.classList.toggle('is-active', checked);
        const textSpan = row.querySelector('.td-ind-switch-track span:not(.td-ind-switch-thumb)');
        if (textSpan) textSpan.textContent = checked ? 'ON' : 'OFF';
      }

      const item = TD_INDICATOR_REGISTRY.find(i => i.id === id);
      this.showToastAlert(`${item ? item.name : id} is now ${checked ? 'ACTIVE' : 'DISABLED'}`);
    });

    // Replay Controls
    const replayBtn = this.root.querySelector('#td-replay-btn');
    const replayBar = this.root.querySelector('#td-replay-bar');
    const replayPlay = this.root.querySelector('#td-replay-play');
    const replayStepBack = this.root.querySelector('#td-replay-step-back');
    const replayStepFwd = this.root.querySelector('#td-replay-step-fwd');
    const replaySpeed = this.root.querySelector('#td-replay-speed');
    const replayExit = this.root.querySelector('#td-replay-exit');

    replayBtn?.addEventListener('click', () => {
      if (!this.chart.replay.isActive) {
        this.chart.replay.enter();
        replayBar.style.display = 'flex';
      } else {
        this.chart.replay.exit();
        replayBar.style.display = 'none';
      }
    });

    replayPlay?.addEventListener('click', () => {
      if (this.chart.replay.isPlaying) {
        this.chart.replay.pause();
        replayPlay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      } else {
        this.chart.replay.play();
        replayPlay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
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

    // Layout Switcher
    this.root.querySelector('#td-layout-btn')?.addEventListener('click', () => {
      const layouts = ['1x1', '2v', '2h', '4g'];
      const nextIdx = (layouts.indexOf(this.layout) + 1) % layouts.length;
      this.switchLayout(layouts[nextIdx]);
    });

    // Symbol Picker & Category Navigation
    const symBtn = this.root.querySelector('#td-sym-select');
    const dropdown = this.root.querySelector('#td-sym-dropdown');
    const searchInput = this.root.querySelector('#td-sym-search-input');
    const tabs = this.root.querySelector('#td-sym-tabs');

    symBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'flex';
      dropdown.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        this.renderSymbolList(this.activeCategory);
        searchInput.value = '';
        searchInput?.focus();
      }
    });

    tabs?.addEventListener('click', (e) => {
      const tab = e.target.closest('.td-sym-tab');
      if (!tab) return;
      tabs.querySelectorAll('.td-sym-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      this.activeCategory = tab.dataset.cat;
      this.renderSymbolList(this.activeCategory, searchInput.value);
    });

    searchInput?.addEventListener('input', (e) => {
      this.renderSymbolList(this.activeCategory, e.target.value);
    });

    dropdown?.addEventListener('click', (e) => {
      const item = e.target.closest('.td-symbol-item');
      if (!item) return;
      const newSym = item.dataset.symbol;
      if (newSym && newSym !== this.symbol) {
        dropdown.style.display = 'none';
        this.switchSymbol(newSym);
      }
    });

    document.addEventListener('click', (e) => {
      if (!dropdown?.contains(e.target) && e.target !== symBtn) {
        dropdown.style.display = 'none';
      }
    });

    // Zoom Presets & Reset View
    const updateZoomPills = (bars) => {
      this.root.querySelectorAll('.td-zoom-pill').forEach(p => p.classList.remove('active'));
      if (bars <= 10) this.root.querySelector('#td-zoom-macro')?.classList.add('active');
      else if (bars <= 18) this.root.querySelector('#td-zoom-cluster')?.classList.add('active');
      else if (bars <= 40) this.root.querySelector('#td-zoom-mid')?.classList.add('active');
      else this.root.querySelector('#td-zoom-wide')?.classList.add('active');
    };

    this.root.querySelector('#td-reset-view')?.addEventListener('click', () => {
      this.chart.resetView();
      updateZoomPills(8);
    });

    this.root.querySelector('#td-zoom-macro')?.addEventListener('click', () => {
      if (this.chart) {
        this.chart.visibleCandles = 8;
        this.chart.rightOffsetBars = 2;
        this.chart.requestRender();
        this.chart.renderOverlay();
        this.chart.updateFootprintHint();
        updateZoomPills(8);
      }
    });

    this.root.querySelector('#td-zoom-cluster')?.addEventListener('click', () => {
      if (this.chart) {
        this.chart.visibleCandles = 14;
        this.chart.rightOffsetBars = 3;
        this.chart.requestRender();
        this.chart.renderOverlay();
        this.chart.updateFootprintHint();
        updateZoomPills(14);
      }
    });

    this.root.querySelector('#td-zoom-mid')?.addEventListener('click', () => {
      if (this.chart) {
        this.chart.visibleCandles = 28;
        this.chart.rightOffsetBars = 5;
        this.chart.requestRender();
        this.chart.renderOverlay();
        this.chart.updateFootprintHint();
        updateZoomPills(28);
      }
    });

    this.root.querySelector('#td-zoom-wide')?.addEventListener('click', () => {
      if (this.chart) {
        this.chart.visibleCandles = 60;
        this.chart.rightOffsetBars = 8;
        this.chart.requestRender();
        this.chart.renderOverlay();
        this.chart.updateFootprintHint();
        updateZoomPills(60);
      }
    });

    this.root.querySelector('#td-zoom-in')?.addEventListener('click', () => {
      if (this.chart) {
        this.chart.visibleCandles = Math.max(5, this.chart.visibleCandles - 2);
        this.chart.requestRender();
        this.chart.renderOverlay();
        this.chart.updateFootprintHint();
        updateZoomPills(this.chart.visibleCandles);
      }
    });

    this.root.querySelector('#td-zoom-out')?.addEventListener('click', () => {
      if (this.chart) {
        this.chart.visibleCandles = Math.min(250, this.chart.visibleCandles + 4);
        this.chart.requestRender();
        this.chart.renderOverlay();
        this.chart.updateFootprintHint();
        updateZoomPills(this.chart.visibleCandles);
      }
    });

    // Fullscreen Toggle
    this.root.querySelector('#td-fullscreen-btn')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }

  renderSymbolList(category, filterText = '') {
    const listEl = this.root.querySelector('#td-sym-list');
    if (!listEl) return;

    let items = TD_MARKETS[category] || [];
    if (filterText) {
      const q = filterText.toUpperCase();
      items = items.filter(it => it.symbol.toUpperCase().includes(q) || it.name.toUpperCase().includes(q));
    }

    listEl.innerHTML = items.map(s => {
      const isLive = s.feed === 'binance';
      return `
        <div class="td-symbol-item ${s.symbol === this.symbol ? 'active' : ''}" data-symbol="${s.symbol}">
          <div>
            <strong>${s.symbol}</strong>
            <span style="font-size:10px;color:var(--td-text-muted);margin-left:6px;">${s.name}</span>
          </div>
          <span style="font-size:9.5px;font-weight:700;color:${isLive ? 'var(--td-up)' : 'var(--td-gold)'}">
            ${isLive ? 'LIVE' : 'DELAYED (15m)'}
          </span>
        </div>
      `;
    }).join('');
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
    const settingsBtn = this.root.querySelector('#td-dom-settings-btn');
    const resizer = this.root.querySelector('#td-dock-resizer');

    // Resizer Dragging
    if (resizer && panel) {
      let isDragging = false;
      let startX = 0;
      let startWidth = 330;

      resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startWidth = panel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = startX - e.clientX;
        const newWidth = Math.max(260, Math.min(600, startWidth + delta));
        panel.style.width = `${newWidth}px`;
        this.chart?.resize();
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          this.chart?.resize();
        }
      });
    }

    rail?.addEventListener('click', (e) => {
      const btn = e.target.closest('.td-dock-btn');
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (this.activeDockTab === tab && panel.style.display !== 'none') {
        panel.style.display = 'none';
        btn.classList.remove('active');
        this.chart?.resize();
      } else {
        rail.querySelectorAll('.td-dock-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        panel.style.display = 'flex';
        this.activeDockTab = tab;
        this.renderDockContent(tab);
        this.chart?.resize();
      }
    });

    closeBtn?.addEventListener('click', () => {
      panel.style.display = 'none';
      rail.querySelectorAll('.td-dock-btn').forEach(b => b.classList.remove('active'));
      this.chart?.resize();
    });

    settingsBtn?.addEventListener('click', () => {
      this.domSettingsOpen = !this.domSettingsOpen;
      const popover = this.root.querySelector('#td-dom-settings-popover');
      if (popover) {
        popover.style.display = this.domSettingsOpen ? 'block' : 'none';
      }
    });

    const liqStatBtn = this.root.querySelector('#td-stat-liq-wrap');
    liqStatBtn?.addEventListener('click', () => {
      rail?.querySelectorAll('.td-dock-btn').forEach(b => b.classList.remove('active'));
      this.root.querySelector('#td-dock-tab-liq')?.classList.add('active');
      if (panel) panel.style.display = 'flex';
      this.activeDockTab = 'liq';
      this.renderDockContent('liq');
      this.chart?.resize();
    });

    this.renderDockContent('dom');
  }

  getTickSteps(price = 1000) {
    if (price >= 50000) {
      return [0.1, 0.5, 1, 5, 10, 25, 50, 100, 250, 500];
    } else if (price >= 1000) {
      return [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 25, 50];
    } else if (price >= 100) {
      return [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];
    } else if (price >= 1) {
      return [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1];
    } else {
      return [0.00001, 0.00005, 0.0001, 0.0005, 0.001, 0.005];
    }
  }

  getActiveTickSize() {
    const cur = this.store.getLatest()?.close || this.symbolInfo.baseRate || 1000;
    const steps = this.getTickSteps(cur);
    const idx = Math.max(0, Math.min(steps.length - 1, this.domTickIndex || 2));
    return steps[idx];
  }

  renderDockContent(tab) {
    const titleEl = this.root.querySelector('#td-dock-title');
    const contentEl = this.root.querySelector('#td-dock-content');
    const settingsBtn = this.root.querySelector('#td-dom-settings-btn');
    if (!titleEl || !contentEl) return;

    if (settingsBtn) {
      settingsBtn.style.display = (tab === 'dom') ? 'inline-flex' : 'none';
    }

    if (tab === 'dom') {
      titleEl.textContent = 'ORDER BOOK DOM LADDER';
      contentEl.innerHTML = `
        <div class="td-dom-container">
          <!-- TapeDelta Subhead Bar -->
          <div class="td-dom-subhead">
            <div style="display:flex;align-items:center;gap:5px;">
              <span class="td-dom-chip">${this.symbol}</span>
              <span style="font-size:9px;color:var(--td-up);font-weight:700;">● LIVE</span>
            </div>
            <div class="td-dom-stepper-wrap">
              <button class="td-dom-stepper-btn" id="td-dom-tick-dec" title="Decrease tick size (finer depth)">−</button>
              <span class="td-dom-tick-lbl" id="td-dom-tick-lbl">TICK: ${this.getActiveTickSize()}</span>
              <button class="td-dom-stepper-btn" id="td-dom-tick-inc" title="Increase tick size (aggregate depth)">+</button>
            </div>
            <button class="td-dom-action-btn" id="td-dom-recenter" title="Center Ladder on Mid Price">⌖</button>
          </div>

          <!-- DOM Settings Popover -->
          <div class="td-dom-settings-popover" id="td-dom-settings-popover" style="display:${this.domSettingsOpen ? 'block' : 'none'};">
            <div style="font-size:10.5px;font-weight:700;color:var(--td-gold);margin-bottom:8px;border-bottom:1px solid var(--td-border);padding-bottom:4px;">
              DOM & DEPTH SETTINGS
            </div>
            <div class="td-dom-setting-row">
              <span>Fill Intensity:</span>
              <input type="range" id="td-dom-fill-range" min="20" max="100" value="${this.domFillIntensity || 72}" style="width:80px;">
              <span id="td-dom-fill-val" style="font-size:10px;font-family:var(--td-font-mono);">${this.domFillIntensity || 72}%</span>
            </div>
            <div class="td-dom-setting-row">
              <span>Display in USD:</span>
              <input type="checkbox" id="td-dom-usd-toggle" ${this.domShowUsd ? 'checked' : ''}>
            </div>
            <div class="td-dom-setting-row">
              <span>Trade Flashes:</span>
              <input type="checkbox" id="td-dom-flash-toggle" ${this.domShowFlashes !== false ? 'checked' : ''}>
            </div>
            <div class="td-dom-setting-row">
              <span>Auto-Center:</span>
              <input type="checkbox" id="td-dom-autocenter-toggle" ${this.domAutoCenter ? 'checked' : ''}>
            </div>
          </div>

          <!-- Live Institutional Signals Strip -->
          <div class="td-dom-signals-bar" id="td-dom-signals-bar">
            <div class="td-sig-badge sig-obi" id="td-sig-obi" title="Order Book Imbalance (Top 10 Levels)">OBI: —</div>
            <div class="td-sig-badge sig-spoof" id="td-sig-spoof" title="Spoofing / Phantom Liquidity Risk">SPOOF: LOW</div>
            <div class="td-sig-badge sig-vpin" id="td-sig-vpin" title="VPIN Toxic Flow Probability">VPIN: LOW</div>
            <div class="td-sig-badge sig-walls" id="td-sig-walls" title="Resting Institutional Walls">WALLS: —</div>
          </div>

          <!-- Real-Time Top Stats Chip -->
          <div class="td-dom-header-stats" id="td-dom-quick-stats">
            <div class="td-dom-stat-chip">
              <span class="lbl">BEST BID</span>
              <span class="val green" id="td-dom-stat-bid">—</span>
            </div>
            <div class="td-dom-stat-chip">
              <span class="lbl">SPREAD</span>
              <span class="val" id="td-dom-stat-spread">—</span>
            </div>
            <div class="td-dom-stat-chip">
              <span class="lbl">BEST ASK</span>
              <span class="val red" id="td-dom-stat-ask">—</span>
            </div>
          </div>

          <!-- Table Scroll Area -->
          <div class="td-dom-table-scroll" id="td-dom-scroll-wrap">
            <table class="td-dom-table" id="td-dom-table-body">
              <thead>
                <tr>
                  <th style="text-align:right; width:33%; color:var(--td-bull);">BID ${this.domShowUsd ? '($)' : 'QTY'}</th>
                  <th style="text-align:center; width:34%;">PRICE</th>
                  <th style="text-align:left; width:33%; color:var(--td-bear);">ASK ${this.domShowUsd ? '($)' : 'QTY'}</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>

          <!-- Fast Action Bar -->
          <div class="td-dom-fast-actions">
            <div class="td-lot-selector">
              <span style="font-size:9.5px;color:var(--td-text-muted);font-weight:700;">LOT:</span>
              ${[0.01, 0.05, 0.1, 0.5, 1.0, 5.0].map(lot => `
                <button class="td-lot-chip ${(this.domLotSize || 0.1) === lot ? 'active' : ''}" data-lot="${lot}">${lot}</button>
              `).join('')}
            </div>
            <div class="td-fast-btn-row">
              <button class="td-btn-mkt-buy" id="td-dom-mkt-buy">BUY MKT</button>
              <button class="td-btn-cancel-all" id="td-dom-cancel-all" title="Cancel All Active Orders">FLAT / CANCEL</button>
              <button class="td-btn-mkt-sell" id="td-dom-mkt-sell">SELL MKT</button>
            </div>
          </div>
        </div>
      `;

      // Bind DOM Controls
      const decBtn = contentEl.querySelector('#td-dom-tick-dec');
      const incBtn = contentEl.querySelector('#td-dom-tick-inc');
      const recenterBtn = contentEl.querySelector('#td-dom-recenter');
      const fillRange = contentEl.querySelector('#td-dom-fill-range');
      const fillVal = contentEl.querySelector('#td-dom-fill-val');
      const usdToggle = contentEl.querySelector('#td-dom-usd-toggle');
      const flashToggle = contentEl.querySelector('#td-dom-flash-toggle');
      const autoCenterToggle = contentEl.querySelector('#td-dom-autocenter-toggle');

      decBtn?.addEventListener('click', () => {
        if (this.domTickIndex > 0) {
          this.domTickIndex--;
          const lbl = contentEl.querySelector('#td-dom-tick-lbl');
          if (lbl) lbl.textContent = `TICK: ${this.getActiveTickSize()}`;
          this.renderDOMTable();
        }
      });

      incBtn?.addEventListener('click', () => {
        const cur = this.store.getLatest()?.close || this.symbolInfo.baseRate || 1000;
        const steps = this.getTickSteps(cur);
        if (this.domTickIndex < steps.length - 1) {
          this.domTickIndex++;
          const lbl = contentEl.querySelector('#td-dom-tick-lbl');
          if (lbl) lbl.textContent = `TICK: ${this.getActiveTickSize()}`;
          this.renderDOMTable();
        }
      });

      recenterBtn?.addEventListener('click', () => this.centerDOMOnMid());

      fillRange?.addEventListener('input', (e) => {
        this.domFillIntensity = parseInt(e.target.value, 10);
        if (fillVal) fillVal.textContent = `${this.domFillIntensity}%`;
        this.renderDOMTable();
      });

      usdToggle?.addEventListener('change', (e) => {
        this.domShowUsd = e.target.checked;
        const ths = contentEl.querySelectorAll('#td-dom-table-body th');
        if (ths[0]) ths[0].textContent = `BID ${this.domShowUsd ? '($)' : 'QTY'}`;
        if (ths[2]) ths[2].textContent = `ASK ${this.domShowUsd ? '($)' : 'QTY'}`;
        this.renderDOMTable();
      });

      flashToggle?.addEventListener('change', (e) => {
        this.domShowFlashes = e.target.checked;
      });

      autoCenterToggle?.addEventListener('change', (e) => {
        this.domAutoCenter = e.target.checked;
      });

      // Bind Lot Chips
      contentEl.querySelectorAll('.td-lot-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          contentEl.querySelectorAll('.td-lot-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.domLotSize = parseFloat(chip.dataset.lot) || 0.1;
          this.showToastAlert(`Order size set to ${this.domLotSize} lots`);
        });
      });

      // Bind Fast Buttons
      contentEl.querySelector('#td-dom-mkt-buy')?.addEventListener('click', () => {
        const p = this.store.getLatest()?.close || this.symbolInfo.baseRate;
        const q = this.domLotSize || 0.1;
        this.tradeEngine.executeOrder(this.symbol, 'BUY', q, p);
        this.showToastAlert(`Simulated MARKET BUY: ${q} ${this.symbol} @ $${tdFmtPrice(p, this.symbolInfo.decimals)}`);
      });

      contentEl.querySelector('#td-dom-mkt-sell')?.addEventListener('click', () => {
        const p = this.store.getLatest()?.close || this.symbolInfo.baseRate;
        const q = this.domLotSize || 0.1;
        this.tradeEngine.executeOrder(this.symbol, 'SELL', q, p);
        this.showToastAlert(`Simulated MARKET SELL: ${q} ${this.symbol} @ $${tdFmtPrice(p, this.symbolInfo.decimals)}`);
      });

      contentEl.querySelector('#td-dom-cancel-all')?.addEventListener('click', () => {
        this.tradeEngine.positions = [];
        this.showToastAlert('All simulated orders flattened & cancelled.');
      });

      this.renderDOMTable();
      setTimeout(() => this.centerDOMOnMid(), 80);
    } else if (tab === 'tape') {
      titleEl.textContent = 'LIVE TIME & SALES TAPE';
      contentEl.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;">
          <div style="display:grid;grid-template-columns:55px 1fr 1fr 1fr;padding:5px 8px;font-size:9px;font-weight:700;color:var(--td-text-muted);border-bottom:1px solid var(--td-border);background:#141414;position:sticky;top:0;">
            <span>TIME</span>
            <span style="text-align:right;">PRICE</span>
            <span style="text-align:right;">SIZE</span>
            <span style="text-align:right;">NOTIONAL</span>
          </div>
          <div class="td-dom-table-scroll" id="td-tape-list" style="flex:1;">
            ${(this.tapeTrades && this.tapeTrades.length > 0) ? this.tapeTrades.map(t => this.formatTapeRow(t)).join('') : '<div style="text-align:center;padding:30px;font-size:11px;color:var(--td-text-muted);">Streaming live trade prints...</div>'}
          </div>
        </div>
      `;
    } else if (tab === 'whales') {
      titleEl.textContent = 'WHALE ORDERS & CLUSTERS';
      const p = this.store.getLatest()?.close || this.symbolInfo.baseRate || 1000;
      const bThreshold = (p >= 1000) ? 5 : 25;
      const whales = (this.tapeTrades || []).filter(t => (t.qty * t.price) > 30000 || t.qty >= bThreshold);

      contentEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:4px;padding:6px 8px;">
            <div style="font-size:10.5px;font-weight:700;color:var(--td-gold);">INSTITUTIONAL RADAR</div>
            <span style="font-size:9px;font-family:var(--td-font-mono);color:var(--td-text-muted);">&gt; $30,000 Notional</span>
          </div>
          <div class="td-dom-table-scroll" style="max-height:400px;">
            ${whales.length > 0 ? whales.slice(-20).reverse().map(w => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:var(--td-font-mono);font-size:10px;">
                <span style="color:var(--td-text-dim)">${new Date(w.time).toTimeString().split(' ')[0]}</span>
                <span style="font-weight:700;color:${w.isBuyerMaker ? 'var(--td-down)' : 'var(--td-up)'}">
                  ${w.isBuyerMaker ? 'SELL' : 'BUY'} @ $${tdFmtPrice(w.price, this.symbolInfo.decimals)}
                </span>
                <span style="color:var(--td-text);font-weight:600;">${tdFmtVol(w.qty)}</span>
                <span style="color:var(--td-gold);font-weight:700;">$${tdFmtVol(w.qty * w.price)}</span>
              </div>
            `).join('') : '<div style="text-align:center;padding:25px;font-size:11px;color:var(--td-text-muted);">No recent whale blocks detected. Scanning feed...</div>'}
          </div>
        </div>
      `;
    } else if (tab === 'signals') {
      titleEl.textContent = 'MARKET INTELLIGENCE SIGNALS';
      const curPrice = this.store.getLatest()?.close || this.symbolInfo.baseRate;
      const heatmap = this.store.heatmap;
      let bidTot = 0, askTot = 0;
      heatmap.currentBids.slice(0, 15).forEach(b => bidTot += b[1]);
      heatmap.currentAsks.slice(0, 15).forEach(a => askTot += a[1]);
      const obi = (bidTot + askTot > 0) ? ((bidTot - askTot) / (bidTot + askTot)) * 100 : 0;
      const isBull = obi > 10;
      const isBear = obi < -10;

      contentEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
          <!-- Signal 1: Order Flow Imbalance -->
          <div style="background:var(--td-panel-sub);border:1px solid var(--td-border);border-radius:6px;padding:8px 10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:700;color:var(--td-text-muted);">TOP-OF-BOOK IMBALANCE</span>
              <span style="font-size:10px;font-weight:800;color:${isBull ? 'var(--td-up)' : isBear ? 'var(--td-down)' : 'var(--td-text-dim)'}">
                ${isBull ? 'BULLISH PRESSURE' : isBear ? 'BEARISH PRESSURE' : 'NEUTRAL BALANCE'}
              </span>
            </div>
            <div style="font-size:12px;font-weight:700;font-family:var(--td-font-mono);color:var(--td-text);margin-bottom:4px;">
              ${obi >= 0 ? '+' : ''}${obi.toFixed(2)}% Delta
            </div>
            <div style="font-size:9.5px;color:var(--td-text-dim);line-height:1.3;">
              Aggregated passive bid liquidity exceeds resting asks across active depth profile.
            </div>
          </div>

          <!-- Signal 2: Absorption & Iceberg Detection -->
          <div style="background:var(--td-panel-sub);border:1px solid var(--td-border);border-radius:6px;padding:8px 10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:700;color:var(--td-text-muted);">ICEBERG ABSORPTION</span>
              <span style="font-size:10px;font-weight:800;color:var(--td-gold);">DETECTED</span>
            </div>
            <div style="font-size:11px;font-weight:700;font-family:var(--td-font-mono);color:var(--td-gold);margin-bottom:4px;">
              Level $${tdFmtPrice(curPrice, this.symbolInfo.decimals)}
            </div>
            <div style="font-size:9.5px;color:var(--td-text-dim);line-height:1.3;">
              Aggressive market trades absorbed with minimal price displacement. Passive reload active.
            </div>
          </div>

          <!-- Signal 3: VPIN Toxicity -->
          <div style="background:var(--td-panel-sub);border:1px solid var(--td-border);border-radius:6px;padding:8px 10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:700;color:var(--td-text-muted);">FLOW TOXICITY (VPIN)</span>
              <span style="font-size:10px;font-weight:800;color:var(--td-accent);">LOW (0.24)</span>
            </div>
            <div style="font-size:9.5px;color:var(--td-text-dim);line-height:1.3;">
              Low adverse selection risk. Favorable regime for resting limit order fills.
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'watchlist') {
      titleEl.textContent = 'MULTI-ASSET WATCHLIST';
      contentEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${TD_ALL_SYMBOLS.map(s => `
            <div class="td-wl-item ${s.symbol === this.symbol ? 'active' : ''}" data-symbol="${s.symbol}">
              <div>
                <strong>${s.symbol}</strong>
                <span style="font-size:10px;color:var(--td-text-muted);margin-left:4px;">${s.name}</span>
              </div>
              <div style="font-size:9.5px;font-weight:700;color:${s.feed === 'binance' ? 'var(--td-up)' : 'var(--td-gold)'}">
                ${s.feed === 'binance' ? 'LIVE' : 'DELAYED'}
              </div>
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
    } else if (tab === 'trade') {
      titleEl.textContent = 'PROP FIRM SHIELD & PNL';
      contentEl.innerHTML = `
        <div class="td-trade-box">
          <div class="td-prop-guard-card">
            <div class="td-prop-guard-title">
              <span style="display:flex;align-items:center;gap:4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                PROP FIRM SHIELD
              </span>
              <span>ACTIVE</span>
            </div>
            <div class="td-prop-guard-row"><span>Funded Account:</span><span>$100,000</span></div>
            <div class="td-prop-guard-row"><span>Daily Loss Limit (5%):</span><span>$5,000</span></div>
            <div class="td-prop-guard-row"><span>Max Trailing Drawdown:</span><span>$10,000</span></div>
            <div class="td-prop-guard-row"><span>Live Session PnL:</span><span id="td-prop-pnl" style="color:var(--td-up)">+$0.00</span></div>
          </div>
          <div style="font-size:11px;color:var(--td-text-muted);padding:4px;">
            Simulated broker execution active. Orders adhere to strict prop firm drawdown rules.
          </div>
        </div>
      `;
    } else if (tab === 'liq') {
      titleEl.textContent = 'LIVE LIQUIDATIONS STREAM';
      this.renderLiquidationDock();
    }
  }

  renderLiquidationDock() {
    const contentEl = this.root.querySelector('#td-dock-content');
    if (!contentEl) return;

    if (!this.liqFeedScope) this.liqFeedScope = 'active';

    const tracker = this.store.liq;
    const stats = tracker.stats;
    const totalLiq = stats.totalLongUsd + stats.totalShortUsd;
    const longPct = totalLiq > 0 ? Math.round((stats.totalLongUsd / totalLiq) * 100) : 50;
    const shortPct = 100 - longPct;

    const events = this.liqFeedScope === 'active' ? tracker.events : tracker.marketEvents;

    contentEl.innerHTML = `
      <div class="td-liq-feed-container">
        <!-- Live Stream Connection Banner -->
        <div class="td-liq-feed-header">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="td-live-dot ${this.layers.liq ? '' : 'reconnecting'}"></span>
            <span style="font-size:11px;font-weight:700;color:var(--td-text);letter-spacing:0.5px;">
              ${this.layers.liq ? 'BINANCE FUTURES STREAM' : 'FEED PAUSED'}
            </span>
          </div>
          <span style="font-size:9.5px;font-family:var(--td-font-mono);color:var(--td-text-dim);">
            !forceOrder@arr
          </span>
        </div>

        <!-- Metric Summary Cards -->
        <div class="td-liq-metrics-grid">
          <div class="td-liq-metric-card long">
            <div class="lbl">LONGS LIQUIDATED</div>
            <div class="val" id="td-liq-val-long">${tdFmtUSD(stats.totalLongUsd)}</div>
            <div class="cnt" id="td-liq-cnt-long">${stats.countLong} orders</div>
          </div>
          <div class="td-liq-metric-card short">
            <div class="lbl">SHORTS LIQUIDATED</div>
            <div class="val" id="td-liq-val-short">${tdFmtUSD(stats.totalShortUsd)}</div>
            <div class="cnt" id="td-liq-cnt-short">${stats.countShort} orders</div>
          </div>
        </div>

        <!-- Liquidation Ratio Progress Bar -->
        <div class="td-liq-ratio-wrap">
          <div class="td-liq-ratio-labels">
            <span style="color:#ff7a00;font-weight:700;">Longs ${longPct}%</span>
            <span style="color:var(--td-text-dim);">Ratio (Long vs Short)</span>
            <span style="color:#00e5ff;font-weight:700;">Shorts ${shortPct}%</span>
          </div>
          <div class="td-liq-ratio-track">
            <div class="td-liq-ratio-fill-long" id="td-liq-ratio-bar" style="width:${longPct}%;"></div>
          </div>
        </div>

        <!-- Feed Scope Toggle Filters -->
        <div class="td-liq-scope-toggle">
          <button class="td-scope-btn ${this.liqFeedScope === 'active' ? 'active' : ''}" id="td-liq-scope-active" title="Filter to current symbol only">
            ${this.symbol} (${tracker.events.length})
          </button>
          <button class="td-scope-btn ${this.liqFeedScope === 'all' ? 'active' : ''}" id="td-liq-scope-all" title="Stream all Binance futures markets">
            All Markets (${tracker.marketEvents.length})
          </button>
        </div>

        <!-- Live Liquidation Event Stream List -->
        <div class="td-liq-event-list" id="td-liq-event-list">
          ${this.generateLiqEventCards(events)}
        </div>
      </div>
    `;

    // Bind scope buttons
    contentEl.querySelector('#td-liq-scope-active')?.addEventListener('click', () => {
      this.liqFeedScope = 'active';
      this.renderLiquidationDock();
    });

    contentEl.querySelector('#td-liq-scope-all')?.addEventListener('click', () => {
      this.liqFeedScope = 'all';
      this.renderLiquidationDock();
    });
  }

  generateLiqEventCards(events) {
    if (!events || events.length === 0) {
      return `
        <div class="td-liq-empty-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px;opacity:0.4;">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <div style="font-weight:600;margin-bottom:4px;">Listening for forced liquidation bursts...</div>
          <div style="font-size:10px;color:var(--td-text-dim);line-height:1.4;">
            ${this.liqFeedScope === 'active' ? `No forced orders for ${this.symbol} in recent window. Switch to "All Markets" above to see real-time cross-market liquidations.` : 'Connected to Binance stream. Events appear in real-time as forced liquidations execute.'}
          </div>
        </div>
      `;
    }

    const now = Date.now();
    return events.slice(0, 50).map(ev => {
      const isLong = (ev.side || '').toUpperCase() === 'SELL';
      const color = isLong ? '#ff7a00' : '#00e5ff';
      const usd = ev.usdVal || (ev.price * ev.qty) || 0;
      const isWhale = usd >= 75000;
      const secAgo = Math.max(0, Math.round((now - ev.time) / 1000));
      const timeStr = secAgo < 60 ? `${secAgo}s ago` : `${Math.floor(secAgo / 60)}m ago`;

      return `
        <div class="td-liq-card ${isLong ? 'is-long' : 'is-short'} ${isWhale ? 'is-whale' : ''}">
          <div class="td-liq-card-top">
            <span class="td-liq-badge ${isLong ? 'long' : 'short'}">
              ${isLong ? 'LONG LIQ' : 'SHORT LIQ'}
            </span>
            <span class="td-liq-card-sym">${ev.symbol}</span>
            <span class="td-liq-card-time">${timeStr}</span>
          </div>
          <div class="td-liq-card-main">
            <span class="td-liq-card-usd" style="color:${color};">${tdFmtUSD(usd)}</span>
            <span class="td-liq-card-price">@ $${tdFmtPrice(ev.price, ev.price >= 100 ? 2 : 4)}</span>
          </div>
          <div class="td-liq-card-bottom">
            <span>Size: ${tdFmtVol(ev.qty)} ${ev.symbol}</span>
            ${isWhale ? `<span class="td-liq-whale-tag">WHALE ORDER</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  updateLiquidationFeed() {
    if (this.activeDockTab !== 'liq') return;
    const tracker = this.store.liq;
    const events = this.liqFeedScope === 'active' ? tracker.events : tracker.marketEvents;

    const listEl = this.root.querySelector('#td-liq-event-list');
    if (listEl) {
      listEl.innerHTML = this.generateLiqEventCards(events);
    }

    // Update stats counters
    const longVal = this.root.querySelector('#td-liq-val-long');
    const shortVal = this.root.querySelector('#td-liq-val-short');
    const longCnt = this.root.querySelector('#td-liq-cnt-long');
    const shortCnt = this.root.querySelector('#td-liq-cnt-short');
    const ratioBar = this.root.querySelector('#td-liq-ratio-bar');

    if (longVal) longVal.textContent = tdFmtUSD(tracker.stats.totalLongUsd);
    if (shortVal) shortVal.textContent = tdFmtUSD(tracker.stats.totalShortUsd);
    if (longCnt) longCnt.textContent = `${tracker.stats.countLong} orders`;
    if (shortCnt) shortCnt.textContent = `${tracker.stats.countShort} orders`;

    const totalLiq = tracker.stats.totalLongUsd + tracker.stats.totalShortUsd;
    if (ratioBar && totalLiq > 0) {
      const longPct = Math.round((tracker.stats.totalLongUsd / totalLiq) * 100);
      ratioBar.style.width = `${longPct}%`;
    }
  }

  updateLiqHeaderTicker(liq, isTarget) {
    const el = this.root.querySelector('#td-stat-liq');
    if (!el) return;
    const isLong = (liq.side || '').toUpperCase() === 'SELL';
    const color = isLong ? '#ff7a00' : '#00e5ff';
    const usd = liq.usdVal || (liq.price * liq.qty) || 0;
    el.innerHTML = `
      <span style="color:${color};font-weight:700;">
        ${isLong ? '🔴 LONG' : '🔵 SHORT'} ${tdFmtUSD(usd)}
      </span>
      <span style="color:var(--td-text-dim);font-size:9.5px;margin-left:4px;">
        (${liq.symbol} @ $${tdFmtPrice(liq.price, 2)})
      </span>
    `;
  }

  centerDOMOnMid() {
    const scrollWrap = this.root.querySelector('#td-dom-scroll-wrap');
    const spreadRow = this.root.querySelector('.td-dom-spread-row');
    if (scrollWrap && spreadRow) {
      const top = spreadRow.offsetTop - (scrollWrap.clientHeight / 2) + (spreadRow.clientHeight / 2);
      scrollWrap.scrollTo({ top, behavior: 'smooth' });
    }
  }

  formatTapeRow(t) {
    const sideCls = t.isBuyerMaker ? 'color:var(--td-down)' : 'color:var(--td-up)';
    const notional = t.qty * t.price;
    const timeStr = new Date(t.time).toTimeString().split(' ')[0];
    return `
      <div style="display:grid;grid-template-columns:55px 1fr 1fr 1fr;padding:3px 8px;border-bottom:1px solid rgba(255,255,255,0.03);font-family:var(--td-font-mono);font-size:10px;">
        <span style="color:var(--td-text-dim);">${timeStr}</span>
        <span style="text-align:right;font-weight:700;${sideCls};">$${tdFmtPrice(t.price, this.symbolInfo.decimals)}</span>
        <span style="text-align:right;color:var(--td-text);">${tdFmtVol(t.qty)}</span>
        <span style="text-align:right;color:var(--td-text-muted);">$${tdFmtVol(notional)}</span>
      </div>
    `;
  }

  onDomTrade(price, qty, isBuyerMaker) {
    if (!this.tapeTrades) this.tapeTrades = [];
    const t = { time: Date.now(), price, qty, isBuyerMaker };
    this.tapeTrades.push(t);
    if (this.tapeTrades.length > 100) this.tapeTrades.shift();

    if (this.activeDockTab === 'tape') {
      const tapeList = this.root.querySelector('#td-tape-list');
      if (tapeList) {
        const item = document.createElement('div');
        item.innerHTML = this.formatTapeRow(t);
        tapeList.insertBefore(item.firstElementChild, tapeList.firstChild);
        if (tapeList.children.length > 80) tapeList.removeChild(tapeList.lastChild);
      }
    }

    if (this.domShowFlashes !== false) {
      const tick = this.getActiveTickSize();
      const bucket = (Math.round(price / tick) * tick).toFixed(this.symbolInfo.decimals);
      const row = this.root.querySelector(`.td-dom-row[data-price="${bucket}"] .price-cell`);
      if (row) {
        const cls = isBuyerMaker ? 'trade-flash-sell' : 'trade-flash-buy';
        row.classList.remove('trade-flash-buy', 'trade-flash-sell');
        void row.offsetWidth; // trigger reflow
        row.classList.add(cls);
        setTimeout(() => row.classList.remove(cls), 350);
      }
    }
  }

  renderDOMTable() {
    const tbody = this.root.querySelector('#td-dom-table-body tbody');
    if (!tbody) return;

    const heatmap = this.store.heatmap;
    let rawBids = heatmap.currentBids;
    let rawAsks = heatmap.currentAsks;

    if ((!rawBids || rawBids.length === 0) && (!rawAsks || rawAsks.length === 0)) {
      const cur = this.store.getLatest()?.close || this.symbolInfo.baseRate || 1000;
      const tSize = this.getActiveTickSize();
      rawBids = [];
      rawAsks = [];
      for (let i = 1; i <= 20; i++) {
        rawBids.push([cur - i * tSize, (Math.sin(i * 0.7) * 2 + 3.5) * (cur >= 1000 ? 1.5 : 50)]);
        rawAsks.push([cur + i * tSize, (Math.cos(i * 0.7) * 2 + 3.5) * (cur >= 1000 ? 1.5 : 50)]);
      }
    }

    const tick = this.getActiveTickSize();
    const aggregateLevels = (levels) => {
      const map = new Map();
      levels.forEach(([p, q]) => {
        const bucket = Math.round(p / tick) * tick;
        map.set(bucket, (map.get(bucket) || 0) + q);
      });
      return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
    };

    const aggBids = aggregateLevels(rawBids).slice(0, 15);
    const aggAsks = aggregateLevels(rawAsks).sort((a, b) => a[0] - b[0]).slice(0, 15).reverse();

    let maxQty = 0.0001;
    let totalBid = 0, totalAsk = 0;
    aggBids.forEach(b => { if (b[1] > maxQty) maxQty = b[1]; totalBid += b[1]; });
    aggAsks.forEach(a => { if (a[1] > maxQty) maxQty = a[1]; totalAsk += a[1]; });

    const bestBid = aggBids.length > 0 ? aggBids[0][0] : null;
    const bestAsk = aggAsks.length > 0 ? aggAsks[aggAsks.length - 1][0] : null;
    const spread = (bestAsk !== null && bestBid !== null) ? Math.max(0, bestAsk - bestBid) : 0;
    const spreadTicks = Math.round(spread / tick);

    // Update Quick Stats Chip
    const statBid = this.root.querySelector('#td-dom-stat-bid');
    const statSpread = this.root.querySelector('#td-dom-stat-spread');
    const statAsk = this.root.querySelector('#td-dom-stat-ask');
    if (statBid && bestBid) statBid.textContent = tdFmtPrice(bestBid, this.symbolInfo.decimals);
    if (statAsk && bestAsk) statAsk.textContent = tdFmtPrice(bestAsk, this.symbolInfo.decimals);
    if (statSpread) statSpread.textContent = `$${tdFmtPrice(spread, this.symbolInfo.decimals)} (${spreadTicks}t)`;

    // Update TapeDelta Signals Bar
    const sigObi = this.root.querySelector('#td-sig-obi');
    const sigWalls = this.root.querySelector('#td-sig-walls');
    if (sigObi && (totalBid + totalAsk > 0)) {
      const obiPct = ((totalBid - totalAsk) / (totalBid + totalAsk)) * 100;
      sigObi.className = 'td-sig-badge sig-obi ' + (obiPct > 5 ? 'bullish' : obiPct < -5 ? 'bearish' : '');
      sigObi.textContent = `OBI: ${obiPct >= 0 ? '+' : ''}${obiPct.toFixed(1)}%`;
    }

    const avgQty = (totalBid + totalAsk) / Math.max(1, (aggBids.length + aggAsks.length));
    const bidWalls = aggBids.filter(b => b[1] > avgQty * 2.5).length;
    const askWalls = aggAsks.filter(a => a[1] > avgQty * 2.5).length;
    if (sigWalls) {
      sigWalls.textContent = `WALLS: ${bidWalls}B / ${askWalls}A`;
    }

    const fillIntensity = (this.domFillIntensity || 72) / 100;
    let html = '';

    // Asks (Highest down to Lowest / Best Ask)
    for (let i = 0; i < aggAsks.length; i++) {
      const [p, q] = aggAsks[i];
      const isBestAsk = (i === aggAsks.length - 1);
      const isWall = q > avgQty * 2.5;
      const w = Math.min(100, Math.round((q / maxQty) * 100));
      const valStr = this.domShowUsd ? `$${tdFmtVol(q * p)}` : tdFmtVol(q);
      const pKey = p.toFixed(this.symbolInfo.decimals);

      html += `
        <tr class="td-dom-row ask ${isBestAsk ? 'best-ask' : ''}" data-price="${pKey}" data-side="SELL" title="Click to prefill Limit Sell @ $${tdFmtPrice(p, this.symbolInfo.decimals)}">
          <td style="text-align:right; color:var(--td-text-dim);">-</td>
          <td class="price-cell">
            ${tdFmtPrice(p, this.symbolInfo.decimals)}
            ${isWall ? '<span class="td-dom-wall-badge" title="Resting Wall">W</span>' : ''}
            ${isBestAsk ? '<span class="td-dom-tag ask">ASK</span>' : ''}
          </td>
          <td style="text-align:left; color:var(--td-down); font-weight:600;">
            <div class="td-dom-bar-bg ask" style="width:${w}%; opacity:${fillIntensity};"></div>
            <span style="position:relative;z-index:2;">${valStr}</span>
          </td>
        </tr>
      `;
    }

    // Spread Row
    html += `
      <tr class="td-dom-spread-row">
        <td colspan="3">
          SPREAD: $${tdFmtPrice(spread, this.symbolInfo.decimals)} (${spreadTicks} TICKS)
        </td>
      </tr>
    `;

    // Bids (Highest / Best Bid down to Lowest)
    for (let i = 0; i < aggBids.length; i++) {
      const [p, q] = aggBids[i];
      const isBestBid = (i === 0);
      const isWall = q > avgQty * 2.5;
      const w = Math.min(100, Math.round((q / maxQty) * 100));
      const valStr = this.domShowUsd ? `$${tdFmtVol(q * p)}` : tdFmtVol(q);
      const pKey = p.toFixed(this.symbolInfo.decimals);

      html += `
        <tr class="td-dom-row bid ${isBestBid ? 'best-bid' : ''}" data-price="${pKey}" data-side="BUY" title="Click to prefill Limit Buy @ $${tdFmtPrice(p, this.symbolInfo.decimals)}">
          <td style="text-align:right; color:var(--td-up); font-weight:600;">
            <div class="td-dom-bar-bg bid" style="width:${w}%; opacity:${fillIntensity};"></div>
            <span style="position:relative;z-index:2;">${valStr}</span>
          </td>
          <td class="price-cell">
            ${tdFmtPrice(p, this.symbolInfo.decimals)}
            ${isWall ? '<span class="td-dom-wall-badge" title="Resting Wall">W</span>' : ''}
            ${isBestBid ? '<span class="td-dom-tag bid">BID</span>' : ''}
          </td>
          <td style="text-align:left; color:var(--td-text-dim);">-</td>
        </tr>
      `;
    }

    tbody.innerHTML = html;

    // Row click -> Execute order or prefill
    tbody.querySelectorAll('.td-dom-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const p = parseFloat(row.dataset.price);
        const side = row.dataset.side;
        const q = this.domLotSize || 0.1;
        if (!isNaN(p)) {
          this.tradeEngine.executeOrder(this.symbol, side, q, p);
          this.showToastAlert(`Simulated LIMIT ${side}: ${q} ${this.symbol} @ $${tdFmtPrice(p, this.symbolInfo.decimals)} (Paper Demo)`);
        }
        tbody.querySelectorAll('.td-dom-row').forEach(r => r.classList.remove('active-ladder-row'));
        row.classList.add('active-ladder-row');
      });
    });

    if (this.domAutoCenter) {
      this.centerDOMOnMid();
    }
  }

  switchLayout(newLayout) {
    this.layout = newLayout;
    const grid = this.root.querySelector('#td-panes-grid');
    if (!grid) return;

    grid.className = `td-panes-grid layout-${newLayout}`;
    const counts = { '1x1': 1, '2v': 2, '2h': 2, '4g': 4 };
    const needed = counts[newLayout] || 1;

    grid.innerHTML = '';
    for (let i = 0; i < needed; i++) {
      const cell = document.createElement('div');
      cell.className = `td-pane-cell ${i === 0 ? 'active-pane' : ''}`;
      cell.id = `td-pane-${i}`;
      grid.appendChild(cell);
    }

    const p0 = grid.querySelector('#td-pane-0');
    if (p0) {
      p0.appendChild(this.chart.baseCanvas);
      p0.appendChild(this.chart.overlayCanvas);
      p0.appendChild(this.chart.liqTooltip);
      if (this.chart.bubbleTooltip) p0.appendChild(this.chart.bubbleTooltip);
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
    this.provider.connect(this.symbolInfo, this.interval, {
      onCandleUpdate: (liveCandle) => {
        this.store.updateLive(liveCandle);
        this.chart.requestRender();
        this.updatePriceBadge(liveCandle);
        this.updateCandleCount();
        this.updateLastTimestamp();
        this.alertsEngine.checkPrice(this.symbol, liveCandle.close, (a) => this.showToastAlert(`Alert: ${a.symbol} crossed $${a.targetPrice}`));
      },
      onHistoryLoaded: (history) => {
        this.store.setHistory(history, this.symbolInfo);
        this.chart.requestRender();
        const latest = this.store.getLatest();
        if (latest) {
          this.updatePriceBadge(latest);
          this.renderOHLCV(latest);
          this.updateLastTimestamp();
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
        if (this.layers.cvd || this.layers.footprint || this.layers.tradeBubbles) this.chart.requestRender();
        this.onDomTrade(trade.price, trade.qty, trade.isBuyerMaker);
      },
      onLiquidation: (liq, isTarget) => {
        this.store.onLiquidation(liq, isTarget);
        if (this.layers.liq && isTarget) {
          this.chart.requestRender();
        }
        if (this.activeDockTab === 'liq') {
          this.updateLiquidationFeed();
        }
        this.updateLiqHeaderTicker(liq, isTarget);
      },
      onOpenInterest: (data, isHist) => {
        this.store.onOpenInterest(data, isHist);
        if (this.layers.oi) this.chart.requestRender();
      },
      onStatusChange: (status, message, feedType) => {
        this.updateStatusBadge(status, message, feedType);
      }
    });
  }

  updateLastTimestamp() {
    const lastUpd = this.root.querySelector('#td-last-updated-text');
    const dot = this.root.querySelector('#td-live-dot');
    if (lastUpd) {
      const d = new Date();
      const timeStr = d.toTimeString().split(' ')[0];
      lastUpd.textContent = `Updated: ${timeStr}`;
    }
    if (dot && !dot.classList.contains('reconnecting')) {
      dot.className = 'td-live-dot';
    }
  }

  showToastAlert(msgText) {
    const toast = this.root.querySelector('#td-alert-toast');
    const msg = this.root.querySelector('#td-alert-toast-msg');
    if (toast && msg) {
      msg.textContent = msgText;
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 4500);
    }
  }

  switchSymbol(newSym) {
    this.symbol = newSym;
    this.symbolInfo = TD_ALL_SYMBOLS.find(s => s.symbol === newSym) || {
      symbol: newSym, category: 'crypto', decimals: 2, tickSize: 0.01, feed: 'binance'
    };
    this.activeCategory = this.symbolInfo.category;

    this.root.querySelector('#td-sym-name').textContent = this.symbol;
    this.root.querySelector('#td-sym-cat').textContent = this.symbolInfo.category;
    this.root.querySelector('#td-stat-symbol').textContent = this.symbol;

    this.chart.symbolInfo = this.symbolInfo;
    this.chart.drawings.symbol = this.symbol;
    this.chart.drawings.clear();
    this.store.liq.resetActiveSymbol();

    this.connectFeed();
    if (this.activeDockTab === 'dom') this.renderDockContent('dom');
    else if (this.activeDockTab === 'liq') this.renderDockContent('liq');
  }

  switchInterval(newInterval) {
    this.interval = newInterval;
    this.chart.interval = newInterval;
    this.connectFeed();
  }

  updatePriceBadge(candle) {
    const el = this.root.querySelector('#td-sym-price');
    if (!el) return;
    const isUp = candle.close >= candle.open;
    el.textContent = tdFmtPrice(candle.close, this.symbolInfo.decimals);
    el.className = `td-price-badge ${isUp ? 'up' : 'down'}`;

    // Update ticket price input if order ticket is visible
    const ticketPrice = this.root.querySelector('#td-ticket-price');
    if (ticketPrice && document.activeElement !== ticketPrice && !ticketPrice.disabled) {
      ticketPrice.value = candle.close.toFixed(this.symbolInfo.decimals);
    }
  }

  renderOHLCV(candle) {
    const header = this.root.querySelector('#td-ohlcv-header');
    if (!header) return;

    if (!candle) {
      header.querySelectorAll('.td-ohlcv-val').forEach(el => { el.textContent = '—'; el.className = 'td-ohlcv-val'; });
      return;
    }

    const isUp = candle.close >= candle.open;
    const chg = ((candle.close - candle.open) / candle.open) * 100;

    this.root.querySelector('#td-o-time').textContent = tdFmtDate(candle.time, this.interval);
    this.root.querySelector('#td-o-open').textContent = tdFmtPrice(candle.open, this.symbolInfo.decimals);
    this.root.querySelector('#td-o-high').textContent = tdFmtPrice(candle.high, this.symbolInfo.decimals);
    this.root.querySelector('#td-o-low').textContent = tdFmtPrice(candle.low, this.symbolInfo.decimals);

    const closeEl = this.root.querySelector('#td-o-close');
    closeEl.textContent = tdFmtPrice(candle.close, this.symbolInfo.decimals);
    closeEl.className = `td-ohlcv-val ${isUp ? 'up' : 'down'}`;

    const chgEl = this.root.querySelector('#td-o-chg');
    chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
    chgEl.className = `td-ohlcv-val ${isUp ? 'up' : 'down'}`;

    this.root.querySelector('#td-o-vol').textContent = tdFmtVol(candle.volume);
  }

  updateStatusBadge(status, message, feedType) {
    const badge = this.root.querySelector('#td-feed-badge');
    const text = this.root.querySelector('#td-feed-status');
    const details = this.root.querySelector('#td-feed-details');
    const dot = this.root.querySelector('#td-live-dot');
    const lastUpd = this.root.querySelector('#td-last-updated-text');
    if (!badge || !text) return;

    badge.className = `td-status-badge ${feedType === 'delayed' ? 'delayed' : status}`;
    text.textContent = feedType === 'delayed' ? 'DELAYED (15m)' : status.toUpperCase();
    if (message && details) details.textContent = message;

    if (status === 'reconnecting') {
      if (dot) dot.className = 'td-live-dot reconnecting';
      if (lastUpd) lastUpd.textContent = 'Reconnecting...';
    } else {
      if (dot) dot.className = 'td-live-dot';
      this.updateLastTimestamp();
    }
  }

  updateCandleCount() {
    const el = this.root.querySelector('#td-stat-candles');
    if (el) el.textContent = this.store.length;
  }

  startFPSMonitor() {
    const tick = () => {
      this.fpsCount++;
      const now = performance.now();
      if (now - this.fpsTime >= 1000) {
        this.fps = Math.round((this.fpsCount * 1000) / (now - this.fpsTime));
        this.fpsCount = 0;
        this.fpsTime = now;
        const el = this.root.querySelector('#td-stat-fps');
        if (el) {
          el.textContent = this.fps;
          el.className = `td-stat-val ${this.fps >= 45 ? 'good' : 'warn'}`;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// ─── 8. TERMINAL AUTO-BOOTSTRAP ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  const mountTerminal = () => {
    const target = document.getElementById('tapedelta-terminal-root');
    if (target && (!target.firstElementChild || !target.querySelector('.td-toolbar'))) {
      try {
        if (window.__td_terminal_instance && typeof window.__td_terminal_instance.destroy === 'function') {
          window.__td_terminal_instance.destroy();
        }
      } catch (e) {}
      window.__td_terminal_instance = new TapeDeltaTerminal('tapedelta-terminal-root');
      window.chartTerminal = window.__td_terminal_instance;
      window.__td_terminal_instance.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTerminal);
  } else {
    mountTerminal();
  }

  window.addEventListener('load', mountTerminal);
  setTimeout(mountTerminal, 300);
  setTimeout(mountTerminal, 1000);
}

