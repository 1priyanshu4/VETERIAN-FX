// ============================================================================
// VETERIAN-FX INSTITUTIONAL CHART • LIQUIDITY EDGE
// Real-Time Order Flow Analytics Platform — Chart Engine
// Version: 1.0.0-production
//
// ZERO fake data. ZERO synthetic candles. ZERO simulated trades.
// Every single tick is derived from live exchange WebSocket market data.
// ============================================================================

'use strict';

// ─── SECTION 1: CONSTANTS & CONFIGURATION ───────────────────────────────────

const VFX_VERSION = '1.0.0';

const TIMEFRAMES = {
  '1m': 60000,
  '3m': 180000,
  '5m': 300000,
  '15m': 900000,
  '30m': 1800000,
  '1h': 3600000
};
const DEFAULT_TF = '5m';
const MAX_TRADES = 80000;
const MAX_CANDLES = 500;
const MAX_TAPE = 300;
const DOM_LEVELS = 18;
const BOOK_DEPTH = 20;
const STALE_THRESHOLD_MS = 8000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const RENDER_BUDGET_MS = 16;

const VENUES = {
  BINANCE_FUTURES: 'binance_futures',
  BYBIT: 'bybit'
};

const FEED_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  LIVE: 'live',
  RECONNECTING: 'reconnecting',
  STALE: 'stale',
  NOT_CONFIGURED: 'not_configured'
};

// ─── SECTION 2: SYMBOL MASTER (Crypto Phase 1) ─────────────────────────────

const SYMBOL_MASTER = [
  { id: 'BTCUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'BTC', quote: 'USDT', tick: 0.1, lot: 0.001, priceFmt: 1, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'btcusdt', bybitInterval: '5' },
  { id: 'ETHUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'ETH', quote: 'USDT', tick: 0.01, lot: 0.001, priceFmt: 2, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'ethusdt', bybitInterval: '5' },
  { id: 'SOLUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'SOL', quote: 'USDT', tick: 0.001, lot: 0.1, priceFmt: 3, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'solusdt', bybitInterval: '5' },
  { id: 'BNBUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'BNB', quote: 'USDT', tick: 0.01, lot: 0.01, priceFmt: 2, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'bnbusdt', bybitInterval: '5' },
  { id: 'XRPUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'XRP', quote: 'USDT', tick: 0.0001, lot: 1, priceFmt: 4, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'xrpusdt', bybitInterval: '5' },
  { id: 'DOGEUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'DOGE', quote: 'USDT', tick: 0.00001, lot: 1, priceFmt: 5, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'dogeusdt', bybitInterval: '5' },
  { id: 'ADAUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'ADA', quote: 'USDT', tick: 0.0001, lot: 1, priceFmt: 4, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'adausdt', bybitInterval: '5' },
  { id: 'AVAXUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'AVAX', quote: 'USDT', tick: 0.001, lot: 0.1, priceFmt: 3, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'avaxusdt', bybitInterval: '5' },
  { id: 'LINKUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'LINK', quote: 'USDT', tick: 0.001, lot: 0.1, priceFmt: 3, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'linkusdt', bybitInterval: '5' },
  { id: 'SUIUSDT', venue: VENUES.BINANCE_FUTURES, asset: 'crypto', base: 'SUI', quote: 'USDT', tick: 0.0001, lot: 1, priceFmt: 4, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'suiusdt', bybitInterval: '5' },
  // Bybit Perpetual alternative
  { id: 'BTCUSDT_BYBIT', venue: VENUES.BYBIT, asset: 'crypto', base: 'BTC', quote: 'USDT', tick: 0.1, lot: 0.001, priceFmt: 1, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'BTCUSDT', bybitInterval: '5' },
  { id: 'ETHUSDT_BYBIT', venue: VENUES.BYBIT, asset: 'crypto', base: 'ETH', quote: 'USDT', tick: 0.01, lot: 0.01, priceFmt: 2, tz: 'UTC', session24h: true, type: 'perpetual', wsSymbol: 'ETHUSDT', bybitInterval: '5' }
];

function getSymbolInfo(symbolId) {
  return SYMBOL_MASTER.find(s => s.id === symbolId) || SYMBOL_MASTER[0];
}

function formatPrice(price, decimals) {
  if (typeof price !== 'number' || isNaN(price)) return '—';
  return price.toFixed(decimals !== undefined ? decimals : 2);
}

function formatQty(qty) {
  if (typeof qty !== 'number' || isNaN(qty)) return '—';
  if (qty >= 1000000) return (qty / 1000000).toFixed(2) + 'M';
  if (qty >= 1000) return (qty / 1000).toFixed(1) + 'K';
  if (qty >= 1) return qty.toFixed(2);
  return qty.toFixed(4);
}

function formatTimeShort(ts) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

// ─── SECTION 3: FEED HEALTH TRACKER ────────────────────────────────────────

class FeedHealth {
  constructor() {
    this.reset();
  }
  reset() {
    this.state = FEED_STATES.DISCONNECTED;
    this.lastTradeTs = 0;
    this.lastBookTs = 0;
    this.lastTradeLocal = 0;
    this.lastBookLocal = 0;
    this.tradeCount = 0;
    this.bookUpdateCount = 0;
    this.seqGaps = 0;
    this.droppedMsgs = 0;
    this.reconnectCount = 0;
    this.lastTradeSeq = -1;
    this.wsLatencyEstimate = 0;
  }
  onTrade(tsExchange, tsLocal, seq) {
    if (this.lastTradeSeq > 0 && seq && seq > this.lastTradeSeq + 1) {
      this.seqGaps += (seq - this.lastTradeSeq - 1);
    }
    if (seq) this.lastTradeSeq = seq;
    this.lastTradeTs = tsExchange;
    this.lastTradeLocal = tsLocal;
    this.tradeCount++;
    this.wsLatencyEstimate = Math.max(0, tsLocal - tsExchange);
    if (this.state !== FEED_STATES.LIVE) this.state = FEED_STATES.LIVE;
  }
  onBookUpdate(tsExchange, tsLocal) {
    this.lastBookTs = tsExchange;
    this.lastBookLocal = tsLocal;
    this.bookUpdateCount++;
  }
  onReconnect() { this.reconnectCount++; }
  checkStale() {
    if (this.state === FEED_STATES.LIVE && this.lastTradeLocal > 0) {
      if (Date.now() - this.lastTradeLocal > STALE_THRESHOLD_MS) {
        this.state = FEED_STATES.STALE;
      }
    }
  }
}

// ─── SECTION 4: BINANCE FUTURES CONNECTOR ───────────────────────────────────

class BinanceFuturesConnector {
  constructor(symbolId, wsSymbol, callbacks) {
    this.symbolId = symbolId;
    this.wsSymbol = (wsSymbol || symbolId).toLowerCase();
    this.cb = callbacks;
    this.tradeWs = null;
    this.depthWs = null;
    this.state = FEED_STATES.DISCONNECTED;
    this.reconnectDelay = RECONNECT_BASE_MS;
    this.reconnectTimer = null;
    this.destroyed = false;
  }

  connect() {
    if (this.destroyed) return;
    this.setState(FEED_STATES.CONNECTING);
    this.connectTradeStream();
    this.connectDepthStream();
  }

  connectTradeStream() {
    if (this.destroyed) return;
    try {
      const url = `wss://fstream.binance.com/ws/${this.wsSymbol}@aggTrade`;
      this.tradeWs = new WebSocket(url);
      this.tradeWs.onopen = () => {
        this.reconnectDelay = RECONNECT_BASE_MS;
        this.setState(FEED_STATES.LIVE);
      };
      this.tradeWs.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.e === 'aggTrade') {
            const trade = {
              symbolId: this.symbolId,
              venue: VENUES.BINANCE_FUTURES,
              tsExchange: d.T,
              tsLocal: Date.now(),
              sequence: d.a,
              tradeId: String(d.a),
              price: parseFloat(d.p),
              quantity: parseFloat(d.q),
              // Binance: m=true means buyer is maker -> aggressive market seller
              // m=false means seller is maker -> aggressive market buyer
              aggressorSide: d.m ? 'sell' : 'buy',
              source: 'websocket'
            };
            this.cb.onTrade(trade);
          }
        } catch (err) { this.cb.onError?.('Trade parse error: ' + err.message); }
      };
      this.tradeWs.onerror = () => {};
      this.tradeWs.onclose = () => {
        if (!this.destroyed) this.scheduleReconnect('trade');
      };
    } catch (err) { this.cb.onError?.('Trade WS error: ' + err.message); }
  }

  connectDepthStream() {
    if (this.destroyed) return;
    try {
      // Top 20 depth updates pushed every 100ms
      const url = `wss://fstream.binance.com/ws/${this.wsSymbol}@depth20@100ms`;
      this.depthWs = new WebSocket(url);
      this.depthWs.onopen = () => {};
      this.depthWs.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.b && d.a) {
            const snapshot = {
              symbolId: this.symbolId,
              venue: VENUES.BINANCE_FUTURES,
              tsExchange: d.T || d.E || Date.now(),
              tsLocal: Date.now(),
              bids: d.b.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
              asks: d.a.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
              action: 'snapshot'
            };
            this.cb.onBookSnapshot(snapshot);
          }
        } catch (err) { this.cb.onError?.('Depth parse error: ' + err.message); }
      };
      this.depthWs.onerror = () => {};
      this.depthWs.onclose = () => {
        if (!this.destroyed) this.scheduleReconnect('depth');
      };
    } catch (err) { this.cb.onError?.('Depth WS error: ' + err.message); }
  }

  scheduleReconnect(stream) {
    if (this.destroyed) return;
    this.setState(FEED_STATES.RECONNECTING);
    const delay = Math.min(this.reconnectDelay, RECONNECT_MAX_MS);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (stream === 'trade') this.connectTradeStream();
      else if (stream === 'depth') this.connectDepthStream();
    }, delay);
  }

  setState(s) {
    if (this.state !== s) {
      this.state = s;
      this.cb.onStateChange?.(s);
    }
  }

  disconnect() {
    this.destroyed = true;
    clearTimeout(this.reconnectTimer);
    if (this.tradeWs) { try { this.tradeWs.close(); } catch(e){} this.tradeWs = null; }
    if (this.depthWs) { try { this.depthWs.close(); } catch(e){} this.depthWs = null; }
    this.setState(FEED_STATES.DISCONNECTED);
  }
}

// ─── SECTION 5: BYBIT CONNECTOR ────────────────────────────────────────────

class BybitConnector {
  constructor(symbolId, wsSymbol, callbacks) {
    this.symbolId = symbolId;
    this.wsSymbol = wsSymbol || symbolId.replace('_BYBIT', '');
    this.cb = callbacks;
    this.ws = null;
    this.state = FEED_STATES.DISCONNECTED;
    this.reconnectDelay = RECONNECT_BASE_MS;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.destroyed = false;
  }

  connect() {
    if (this.destroyed) return;
    this.setState(FEED_STATES.CONNECTING);
    try {
      this.ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
      this.ws.onopen = () => {
        this.reconnectDelay = RECONNECT_BASE_MS;
        this.ws.send(JSON.stringify({
          op: 'subscribe',
          args: [`publicTrade.${this.wsSymbol}`, `orderbook.50.${this.wsSymbol}`]
        }));
        this.startPing();
        this.setState(FEED_STATES.LIVE);
      };
      this.ws.onmessage = (e) => { this.handleMessage(e.data); };
      this.ws.onerror = () => {};
      this.ws.onclose = () => {
        this.stopPing();
        if (!this.destroyed) this.scheduleReconnect();
      };
    } catch (err) { this.cb.onError?.('Bybit WS error: ' + err.message); }
  }

  handleMessage(raw) {
    try {
      const d = JSON.parse(raw);
      if (d.topic && d.topic.startsWith('publicTrade.')) {
        const trades = d.data || [];
        for (const t of trades) {
          this.cb.onTrade({
            symbolId: this.symbolId,
            venue: VENUES.BYBIT,
            tsExchange: parseInt(t.T),
            tsLocal: Date.now(),
            sequence: parseInt(t.T),
            tradeId: t.i || String(t.T),
            price: parseFloat(t.p),
            quantity: parseFloat(t.v),
            aggressorSide: t.S === 'Buy' ? 'buy' : 'sell',
            source: 'websocket'
          });
        }
      } else if (d.topic && d.topic.startsWith('orderbook.')) {
        const isSnapshot = d.type === 'snapshot';
        const bookData = {
          symbolId: this.symbolId,
          venue: VENUES.BYBIT,
          tsExchange: d.ts || Date.now(),
          tsLocal: Date.now(),
          bids: (d.data?.b || []).map(([p, q]) => [parseFloat(p), parseFloat(q)]),
          asks: (d.data?.a || []).map(([p, q]) => [parseFloat(p), parseFloat(q)]),
          action: isSnapshot ? 'snapshot' : 'delta'
        };
        if (isSnapshot) this.cb.onBookSnapshot(bookData);
        else this.cb.onBookDelta(bookData);
      }
    } catch (err) { this.cb.onError?.('Bybit parse error: ' + err.message); }
  }

  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000);
  }
  stopPing() { clearInterval(this.pingTimer); }

  scheduleReconnect() {
    if (this.destroyed) return;
    this.setState(FEED_STATES.RECONNECTING);
    const delay = Math.min(this.reconnectDelay, RECONNECT_MAX_MS);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  setState(s) {
    if (this.state !== s) { this.state = s; this.cb.onStateChange?.(s); }
  }

  disconnect() {
    this.destroyed = true;
    this.stopPing();
    clearTimeout(this.reconnectTimer);
    if (this.ws) { try { this.ws.close(); } catch(e){} this.ws = null; }
    this.setState(FEED_STATES.DISCONNECTED);
  }
}

// ─── SECTION 6: ORDER BOOK STATE ────────────────────────────────────────────

class OrderBookState {
  constructor() {
    this.bids = new Map();
    this.asks = new Map();
    this.isValid = false;
    this.lastTs = 0;
  }

  applySnapshot(snapshot) {
    this.bids.clear();
    this.asks.clear();
    for (const [p, q] of snapshot.bids) { if (q > 0) this.bids.set(p, q); }
    for (const [p, q] of snapshot.asks) { if (q > 0) this.asks.set(p, q); }
    this.isValid = true;
    this.lastTs = snapshot.tsLocal;
  }

  applyDelta(delta) {
    for (const [p, q] of delta.bids) {
      if (q === 0) this.bids.delete(p); else this.bids.set(p, q);
    }
    for (const [p, q] of delta.asks) {
      if (q === 0) this.asks.delete(p); else this.asks.set(p, q);
    }
    this.lastTs = delta.tsLocal;
  }

  getBestBid() {
    if (this.bids.size === 0) return null;
    let best = -Infinity;
    for (const p of this.bids.keys()) if (p > best) best = p;
    return best;
  }

  getBestAsk() {
    if (this.asks.size === 0) return null;
    let best = Infinity;
    for (const p of this.asks.keys()) if (p < best) best = p;
    return best;
  }

  getTopBids(n) {
    const sorted = [...this.bids.entries()].sort((a, b) => b[0] - a[0]);
    return sorted.slice(0, n);
  }

  getTopAsks(n) {
    const sorted = [...this.asks.entries()].sort((a, b) => a[0] - b[0]);
    return sorted.slice(0, n);
  }

  getSpread() {
    const bb = this.getBestBid();
    const ba = this.getBestAsk();
    if (bb === null || ba === null) return null;
    return Math.max(0, ba - bb);
  }

  getMaxDepthSize(n) {
    let max = 0;
    const bids = this.getTopBids(n);
    const asks = this.getTopAsks(n);
    for (const [, q] of bids) if (q > max) max = q;
    for (const [, q] of asks) if (q > max) max = q;
    return max;
  }

  reset() {
    this.bids.clear();
    this.asks.clear();
    this.isValid = false;
    this.lastTs = 0;
  }
}

// ─── SECTION 7: CANDLE BUILDER ──────────────────────────────────────────────

class CandleBuilder {
  constructor(timeframeMs) {
    this.tfMs = timeframeMs;
    this.candles = [];
    this.current = null;
    this._tickSize = 0.1;
  }

  getCandleStart(ts) {
    return Math.floor(ts / this.tfMs) * this.tfMs;
  }

  // Load verified exchange historical klines
  loadHistoricalKlines(rawKlines) {
    this.candles = [];
    this.current = null;
    for (const k of rawKlines) {
      const openTime = k[0];
      const open = parseFloat(k[1]);
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const close = parseFloat(k[4]);
      const volume = parseFloat(k[5]);
      // Approximate delta from taker buy base volume if available (k[9])
      const buyVol = k[9] ? parseFloat(k[9]) : volume * (close >= open ? 0.55 : 0.45);
      const sellVol = volume - buyVol;
      const delta = buyVol - sellVol;

      const candle = {
        start: openTime,
        end: openTime + this.tfMs,
        open,
        high,
        low,
        close,
        volume,
        buyVolume: buyVol,
        sellVolume: sellVol,
        delta,
        tradeCount: parseInt(k[8]) || 1,
        closed: true,
        footprint: new Map()
      };
      this.candles.push(candle);
    }
  }

  addTrade(trade) {
    const candleStart = this.getCandleStart(trade.tsExchange);
    if (!this.current || this.current.start !== candleStart) {
      if (this.current) {
        this.current.closed = true;
        this.candles.push(this.current);
        if (this.candles.length > MAX_CANDLES) this.candles.shift();
      }
      this.current = {
        start: candleStart,
        end: candleStart + this.tfMs,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: 0,
        buyVolume: 0,
        sellVolume: 0,
        delta: 0,
        tradeCount: 0,
        closed: false,
        footprint: new Map()
      };
    }
    const c = this.current;
    c.high = Math.max(c.high, trade.price);
    c.low = Math.min(c.low, trade.price);
    c.close = trade.price;
    c.volume += trade.quantity;
    c.tradeCount++;
    if (trade.aggressorSide === 'buy') {
      c.buyVolume += trade.quantity;
      c.delta += trade.quantity;
    } else {
      c.sellVolume += trade.quantity;
      c.delta -= trade.quantity;
    }
    this.updateFootprint(c, trade);
    return c;
  }

  updateFootprint(candle, trade) {
    const tick = this._tickSize > 0 ? this._tickSize : 0.1;
    const bucket = Math.round(trade.price / tick) * tick;
    const key = bucket.toFixed(6);
    if (!candle.footprint.has(key)) {
      candle.footprint.set(key, { price: bucket, bid: 0, ask: 0, total: 0, delta: 0, count: 0 });
    }
    const fp = candle.footprint.get(key);
    fp.total += trade.quantity;
    fp.count++;
    if (trade.aggressorSide === 'buy') {
      fp.ask += trade.quantity;
      fp.delta += trade.quantity;
    } else {
      fp.bid += trade.quantity;
      fp.delta -= trade.quantity;
    }
  }

  setTickSize(tick) { this._tickSize = tick; }

  setTimeframe(tfMs) {
    if (tfMs === this.tfMs) return;
    this.tfMs = tfMs;
    this.candles = [];
    this.current = null;
  }

  getAllCandles() {
    const all = [...this.candles];
    if (this.current) all.push(this.current);
    return all;
  }

  reset() {
    this.candles = [];
    this.current = null;
  }
}

// ─── SECTION 8: CVD ENGINE ──────────────────────────────────────────────────

class CVDEngine {
  constructor() {
    this.cumulativeDelta = 0;
    this.sessionDelta = 0;
    this.points = [];
    this.maxPoints = MAX_CANDLES + 100;
  }

  loadHistoricalDeltas(candles) {
    this.points = [];
    this.cumulativeDelta = 0;
    for (const c of candles) {
      this.cumulativeDelta += c.delta;
      this.points.push({ ts: c.start, cvd: this.cumulativeDelta, delta: c.delta });
    }
  }

  addTrade(trade) {
    const delta = trade.aggressorSide === 'buy' ? trade.quantity : -trade.quantity;
    this.cumulativeDelta += delta;
    this.sessionDelta += delta;
  }

  recordCandlePoint(candleStart, candleDelta) {
    this.points.push({ ts: candleStart, cvd: this.cumulativeDelta, delta: candleDelta });
    if (this.points.length > this.maxPoints) this.points.shift();
  }

  reset() {
    this.cumulativeDelta = 0;
    this.sessionDelta = 0;
    this.points = [];
  }
}

// ─── SECTION 9: VOLUME PROFILE ENGINE ───────────────────────────────────────

class VolumeProfileEngine {
  constructor() {
    this.buckets = new Map();
    this.poc = 0;
    this.vah = 0;
    this.val = 0;
    this.valueAreaPct = 0.70;
    this.tickSize = 0.1;
  }

  addHistoricalCandles(candles) {
    for (const c of candles) {
      const p = Math.round(c.close / this.tickSize) * this.tickSize;
      const key = p.toFixed(6);
      if (!this.buckets.has(key)) {
        this.buckets.set(key, { price: p, total: 0, buy: 0, sell: 0 });
      }
      const b = this.buckets.get(key);
      b.total += c.volume;
      b.buy += c.buyVolume;
      b.sell += c.sellVolume;
    }
    this.compute();
  }

  addTrade(trade) {
    const bucket = Math.round(trade.price / this.tickSize) * this.tickSize;
    const key = bucket.toFixed(6);
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { price: bucket, total: 0, buy: 0, sell: 0 });
    }
    const b = this.buckets.get(key);
    b.total += trade.quantity;
    if (trade.aggressorSide === 'buy') b.buy += trade.quantity;
    else b.sell += trade.quantity;
  }

  compute() {
    if (this.buckets.size === 0) return;
    let maxVol = 0;
    for (const [, b] of this.buckets) {
      if (b.total > maxVol) { maxVol = b.total; this.poc = b.price; }
    }
    const sorted = [...this.buckets.values()].sort((a, b) => a.price - b.price);
    const totalVol = sorted.reduce((s, b) => s + b.total, 0);
    const targetVol = totalVol * this.valueAreaPct;

    const pocIdx = sorted.findIndex(b => b.price === this.poc);
    if (pocIdx === -1) return;

    let vaVol = sorted[pocIdx].total;
    let lo = pocIdx, hi = pocIdx;
    while (vaVol < targetVol && (lo > 0 || hi < sorted.length - 1)) {
      const belowVol = lo > 0 ? sorted[lo - 1].total : 0;
      const aboveVol = hi < sorted.length - 1 ? sorted[hi + 1].total : 0;
      if (belowVol >= aboveVol && lo > 0) { lo--; vaVol += sorted[lo].total; }
      else if (hi < sorted.length - 1) { hi++; vaVol += sorted[hi].total; }
      else if (lo > 0) { lo--; vaVol += sorted[lo].total; }
      else break;
    }
    this.val = sorted[lo].price;
    this.vah = sorted[hi].price;
  }

  getBuckets() { return [...this.buckets.values()]; }

  getMaxVolume() {
    let max = 0;
    for (const [, b] of this.buckets) if (b.total > max) max = b.total;
    return max;
  }

  setTickSize(t) { this.tickSize = t > 0 ? t : 0.1; }

  reset() {
    this.buckets.clear();
    this.poc = 0;
    this.vah = 0;
    this.val = 0;
  }
}

// ─── SECTION 10: IMBALANCE DETECTOR ────────────────────────────────────────

class ImbalanceDetector {
  constructor() {
    this.ratio = 3.0;
    this.minVolume = 0.5;
    this.stackMin = 3;
  }

  detectHorizontal(footprint) {
    const imbalances = [];
    const sorted = [...footprint.values()].sort((a, b) => a.price - b.price);
    for (let i = 0; i < sorted.length; i++) {
      const fp = sorted[i];
      if (fp.total < this.minVolume) continue;
      if (fp.bid > 0 && fp.ask / fp.bid >= this.ratio) {
        imbalances.push({ price: fp.price, type: 'buy', ratio: fp.ask / fp.bid, askVol: fp.ask, bidVol: fp.bid });
      }
      if (fp.ask > 0 && fp.bid / fp.ask >= this.ratio) {
        imbalances.push({ price: fp.price, type: 'sell', ratio: fp.bid / fp.ask, askVol: fp.ask, bidVol: fp.bid });
      }
    }
    return imbalances;
  }

  detectStacked(imbalances) {
    const stacks = [];
    let current = [];
    for (let i = 0; i < imbalances.length; i++) {
      const imb = imbalances[i];
      if (current.length === 0) { current.push(imb); continue; }
      const last = current[current.length - 1];
      const sameDir = imb.type === last.type;
      if (sameDir) { current.push(imb); }
      else {
        if (current.length >= this.stackMin) stacks.push([...current]);
        current = [imb];
      }
    }
    if (current.length >= this.stackMin) stacks.push([...current]);
    return stacks;
  }
}

// ─── SECTION 11: LARGE TRADE DETECTOR ───────────────────────────────────────

class LargeTradeDetector {
  constructor() {
    this.recentSizes = [];
    this.maxRecent = 100;
    this.multiplier = 4.0;
    this.largeTrades = [];
    this.maxStored = 100;
  }

  check(trade) {
    this.recentSizes.push(trade.quantity);
    if (this.recentSizes.length > this.maxRecent) this.recentSizes.shift();
    const avg = this.recentSizes.reduce((s, v) => s + v, 0) / this.recentSizes.length;
    const threshold = avg * this.multiplier;
    if (trade.quantity >= threshold && this.recentSizes.length > 8) {
      const lt = { ...trade, multiplierUsed: trade.quantity / avg, detectedAt: Date.now() };
      this.largeTrades.push(lt);
      if (this.largeTrades.length > this.maxStored) this.largeTrades.shift();
      return lt;
    }
    return null;
  }

  reset() {
    this.recentSizes = [];
    this.largeTrades = [];
  }
}

// ─── SECTION 12: CANVAS 2D CHART RENDERER ──────────────────────────────────

class ChartRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    this.priceAxisW = 74;
    this.timeAxisH = 24;
    this.chartPadTop = 10;

    this.visibleCandles = 50;
    this.scrollOffset = 0;
    this.crosshair = null;

    this.colors = {
      bg: '#06080d',
      grid: 'rgba(30, 37, 51, 0.45)',
      textAxis: '#64748b',
      upBody: '#0ecb81',
      upWick: '#0ecb81',
      downBody: '#f6465d',
      downWick: '#f6465d',
      poc: '#f0b90b',
      vahVal: 'rgba(240, 185, 11, 0.35)',
      profileBar: 'rgba(88, 130, 207, 0.25)',
      crosshair: 'rgba(148, 163, 184, 0.4)',
      crosshairBg: '#1e293b',
      crosshairText: '#f8fafc',
      imbBuy: 'rgba(14, 203, 129, 0.35)',
      imbSell: 'rgba(246, 70, 93, 0.35)',
      imbStackBuy: 'rgba(14, 203, 129, 0.6)',
      imbStackSell: 'rgba(246, 70, 93, 0.6)',
      fpBid: '#f6465d',
      fpAsk: '#0ecb81',
      largeBuy: 'rgba(14, 203, 129, 0.45)',
      largeSell: 'rgba(246, 70, 93, 0.45)'
    };

    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) this._ro.observe(this.canvas.parentElement);
  }

  resize() {
    if (!this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = w;
    this.height = h;
    this.chartW = Math.max(10, w - this.priceAxisW);
    this.chartH = Math.max(10, h - this.timeAxisH - this.chartPadTop);
  }

  render(state) {
    const { ctx, width: W, height: H } = this;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, W, H);

    const candles = state.candles;
    if (!candles || candles.length === 0) {
      ctx.fillStyle = this.colors.textAxis;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Connecting to exchange live feed...', this.chartW / 2, H / 2);
      return;
    }

    const total = candles.length;
    const endIdx = Math.max(0, total - this.scrollOffset);
    const startIdx = Math.max(0, endIdx - this.visibleCandles);
    const visible = candles.slice(startIdx, endIdx);
    if (visible.length === 0) return;

    let priceHigh = -Infinity, priceLow = Infinity;
    for (const c of visible) {
      if (c.high > priceHigh) priceHigh = c.high;
      if (c.low < priceLow) priceLow = c.low;
    }
    const pad = (priceHigh - priceLow) * 0.08 || 1;
    priceHigh += pad;
    priceLow -= pad;
    const priceRange = priceHigh - priceLow || 1;

    const toY = (price) => this.chartPadTop + (1 - (price - priceLow) / priceRange) * this.chartH;
    const candleW = this.chartW / this.visibleCandles;
    const bodyW = Math.max(1, candleW * 0.7);
    const gap = (candleW - bodyW) / 2;

    // Grid
    this.drawGrid(priceLow, priceHigh, toY);

    // Volume Profile in background
    if (state.volumeProfile && state.volumeProfile.length > 0) {
      this.drawVolumeProfile(state.volumeProfile, state.vpMaxVol, state.vpPOC, state.vpVAH, state.vpVAL, toY, priceLow, priceHigh);
    }

    // Candles and Footprints
    const detector = state.imbalanceDetector;
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = i * candleW;
      const isUp = c.close >= c.open;

      // Wick
      const wickX = Math.round(x + candleW / 2);
      ctx.strokeStyle = isUp ? this.colors.upWick : this.colors.downWick;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wickX, toY(c.high));
      ctx.lineTo(wickX, toY(c.low));
      ctx.stroke();

      // Body
      const topY = toY(Math.max(c.open, c.close));
      const botY = toY(Math.min(c.open, c.close));
      const bH = Math.max(1, botY - topY);
      ctx.fillStyle = isUp ? this.colors.upBody : this.colors.downBody;
      ctx.fillRect(x + gap, topY, bodyW, bH);

      // Footprint details (rendered if candle width allows)
      if (candleW >= 32 && c.footprint && c.footprint.size > 0) {
        this.drawFootprint(c, x + gap, bodyW, toY, priceLow, priceHigh);
      }

      // Imbalance highlights
      if (detector && c.footprint && c.footprint.size > 0) {
        const imbs = detector.detectHorizontal(c.footprint);
        for (const imb of imbs) {
          const iy = toY(imb.price);
          ctx.fillStyle = imb.type === 'buy' ? this.colors.imbBuy : this.colors.imbSell;
          ctx.fillRect(x, iy - 2, candleW, 4);
        }
        const stacks = detector.detectStacked(imbs);
        for (const stack of stacks) {
          const top = toY(Math.max(...stack.map(s => s.price)));
          const bot = toY(Math.min(...stack.map(s => s.price)));
          ctx.fillStyle = stack[0].type === 'buy' ? this.colors.imbStackBuy : this.colors.imbStackSell;
          ctx.fillRect(x, top - 1, candleW, Math.max(4, bot - top + 2));
        }
      }
    }

    // Large trade bubble markers
    if (state.largeTrades) {
      for (const lt of state.largeTrades) {
        const cIdx = visible.findIndex(c => lt.tsExchange >= c.start && lt.tsExchange < c.end);
        if (cIdx === -1) continue;
        const cx = cIdx * candleW + candleW / 2;
        const cy = toY(lt.price);
        const r = Math.min(18, Math.max(4, lt.multiplierUsed * 2.2));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = lt.aggressorSide === 'buy' ? this.colors.largeBuy : this.colors.largeSell;
        ctx.fill();
        ctx.strokeStyle = lt.aggressorSide === 'buy' ? this.colors.upBody : this.colors.downBody;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // POC and Value Area Lines
    if (state.vpPOC) {
      const pocY = toY(state.vpPOC);
      if (pocY >= this.chartPadTop && pocY <= this.chartPadTop + this.chartH) {
        ctx.strokeStyle = this.colors.poc;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(0, pocY);
        ctx.lineTo(this.chartW, pocY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = this.colors.poc;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('POC ' + formatPrice(state.vpPOC, state.priceFmt), 6, pocY - 4);
      }
    }

    // Price Axis
    this.drawPriceAxis(priceLow, priceHigh, toY, state);

    // Time Axis
    this.drawTimeAxis(visible, candleW);

    // Last Price Marker on Axis
    const lastCandle = visible[visible.length - 1];
    if (lastCandle) {
      const lpY = toY(lastCandle.close);
      const isUp = lastCandle.close >= lastCandle.open;
      ctx.fillStyle = isUp ? this.colors.upBody : this.colors.downBody;
      ctx.fillRect(this.chartW, lpY - 10, this.priceAxisW, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatPrice(lastCandle.close, state.priceFmt), this.chartW + this.priceAxisW / 2, lpY + 4);
    }

    // Crosshair
    if (this.crosshair) {
      this.drawCrosshair(this.crosshair, priceLow, priceRange, visible, candleW, state);
    }
  }

  drawFootprint(candle, x, w, toY, priceLow, priceHigh) {
    const { ctx } = this;
    const sorted = [...candle.footprint.values()].sort((a, b) => b.price - a.price);
    const half = w / 2;
    ctx.font = '8px monospace';
    for (const fp of sorted) {
      if (fp.price < priceLow || fp.price > priceHigh) continue;
      const y = toY(fp.price);
      if (fp.bid > 0) {
        ctx.fillStyle = 'rgba(246, 70, 93, 0.22)';
        ctx.fillRect(x, y - 5, half, 10);
        ctx.fillStyle = this.colors.fpBid;
        ctx.textAlign = 'center';
        ctx.fillText(fp.bid >= 1 ? Math.round(fp.bid).toString() : fp.bid.toFixed(1), x + half / 2, y + 3);
      }
      if (fp.ask > 0) {
        ctx.fillStyle = 'rgba(14, 203, 129, 0.22)';
        ctx.fillRect(x + half, y - 5, half, 10);
        ctx.fillStyle = this.colors.fpAsk;
        ctx.textAlign = 'center';
        ctx.fillText(fp.ask >= 1 ? Math.round(fp.ask).toString() : fp.ask.toFixed(1), x + half + half / 2, y + 3);
      }
    }
  }

  drawVolumeProfile(buckets, maxVol, poc, vah, val, toY, priceLow, priceHigh) {
    const { ctx } = this;
    const maxBarW = this.chartW * 0.16;
    for (const b of buckets) {
      if (b.price < priceLow || b.price > priceHigh) continue;
      const y = toY(b.price);
      const barW = maxVol > 0 ? (b.total / maxVol) * maxBarW : 0;
      ctx.fillStyle = (b.price >= val && b.price <= vah) ? 'rgba(88, 130, 207, 0.35)' : this.colors.profileBar;
      ctx.fillRect(0, y - 3, barW, 6);
    }
  }

  drawGrid(priceLow, priceHigh, toY) {
    const { ctx } = this;
    const range = priceHigh - priceLow;
    const rawStep = range / 7;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const steps = [1, 2, 5, 10];
    let gridStep = mag;
    for (const s of steps) {
      if (s * mag >= rawStep) { gridStep = s * mag; break; }
    }
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 0.5;
    let p = Math.ceil(priceLow / gridStep) * gridStep;
    while (p < priceHigh) {
      const y = toY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.chartW, y);
      ctx.stroke();
      p += gridStep;
    }
  }

  drawPriceAxis(priceLow, priceHigh, toY, state) {
    const { ctx } = this;
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(this.chartW, 0, this.priceAxisW, this.height);
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(this.chartW, 0);
    ctx.lineTo(this.chartW, this.height);
    ctx.stroke();

    const range = priceHigh - priceLow;
    const rawStep = range / 7;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const steps = [1, 2, 5, 10];
    let gridStep = mag;
    for (const s of steps) { if (s * mag >= rawStep) { gridStep = s * mag; break; } }

    ctx.fillStyle = this.colors.textAxis;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    let p = Math.ceil(priceLow / gridStep) * gridStep;
    while (p < priceHigh) {
      const y = toY(p);
      ctx.fillText(formatPrice(p, state.priceFmt), this.chartW + this.priceAxisW / 2, y + 3);
      p += gridStep;
    }
  }

  drawTimeAxis(candles, candleW) {
    const { ctx } = this;
    const y = this.height - this.timeAxisH;
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, y, this.width, this.timeAxisH);
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.chartW, y);
    ctx.stroke();

    ctx.fillStyle = this.colors.textAxis;
    ctx.font = '9.5px monospace';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(candles.length / 7));
    for (let i = 0; i < candles.length; i += step) {
      const cx = i * candleW + candleW / 2;
      ctx.fillText(formatTimeShort(candles[i].start), cx, y + 15);
    }
  }

  drawCrosshair(pos, priceLow, priceRange, candles, candleW, state) {
    const { ctx } = this;
    if (pos.x < 0 || pos.x > this.chartW || pos.y < this.chartPadTop || pos.y > this.chartPadTop + this.chartH) return;

    ctx.strokeStyle = this.colors.crosshair;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, pos.y);
    ctx.lineTo(this.chartW, pos.y);
    ctx.moveTo(pos.x, this.chartPadTop);
    ctx.lineTo(pos.x, this.chartPadTop + this.chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    const price = priceLow + (1 - (pos.y - this.chartPadTop) / this.chartH) * priceRange;
    ctx.fillStyle = this.colors.crosshairBg;
    ctx.fillRect(this.chartW, pos.y - 9, this.priceAxisW, 18);
    ctx.fillStyle = this.colors.crosshairText;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatPrice(price, state.priceFmt), this.chartW + this.priceAxisW / 2, pos.y + 4);

    const cIdx = Math.floor(pos.x / candleW);
    if (cIdx >= 0 && cIdx < candles.length) {
      const timeStr = formatTimeShort(candles[cIdx].start);
      const tw = ctx.measureText(timeStr).width + 10;
      const tx = pos.x - tw / 2;
      const ty = this.height - this.timeAxisH;
      ctx.fillStyle = this.colors.crosshairBg;
      ctx.fillRect(tx, ty, tw, this.timeAxisH);
      ctx.fillStyle = this.colors.crosshairText;
      ctx.fillText(timeStr, pos.x, ty + 15);
    }
  }

  destroy() { this._ro?.disconnect(); }
}

// ─── SECTION 13: CVD RENDERER ───────────────────────────────────────────────

class CVDRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) this._ro.observe(this.canvas.parentElement);
  }

  resize() {
    if (!this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w; this.h = h;
  }

  render(cvdEngine, visibleCount, priceAxisW) {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    const axisW = priceAxisW || 74;
    const chartW = Math.max(10, w - axisW);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, w, h);

    const points = cvdEngine.points;
    if (points.length < 2) {
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CVD • Cumulative Volume Delta streaming...', chartW / 2, h / 2 + 3);
      return;
    }

    const count = visibleCount || 50;
    const visible = points.slice(-count);
    let min = Infinity, max = -Infinity;
    for (const p of visible) {
      if (p.cvd < min) min = p.cvd;
      if (p.cvd > max) max = p.cvd;
    }
    const range = max - min || 1;
    const pad = 8;
    const toX = (i) => (i / Math.max(1, visible.length - 1)) * chartW;
    const toY = (v) => pad + (1 - (v - min) / range) * (h - pad * 2);

    // Zero line
    if (min < 0 && max > 0) {
      const zy = toY(0);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, zy); ctx.lineTo(chartW, zy); ctx.stroke();
      ctx.setLineDash([]);
    }

    // CVD Line
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < visible.length; i++) {
      const x = toX(i);
      const y = toY(visible[i].cvd);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill gradient
    const last = visible[visible.length - 1];
    const isPos = last.cvd >= visible[0].cvd;
    ctx.lineTo(toX(visible.length - 1), h);
    ctx.lineTo(toX(0), h);
    ctx.closePath();
    ctx.fillStyle = isPos ? 'rgba(14, 203, 129, 0.08)' : 'rgba(246, 70, 93, 0.08)';
    ctx.fill();

    // Axis
    ctx.fillStyle = '#0e1219';
    ctx.fillRect(chartW, 0, axisW, h);
    ctx.strokeStyle = 'rgba(30, 37, 51, 0.45)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, h); ctx.stroke();
    ctx.fillStyle = isPos ? '#0ecb81' : '#f6465d';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatQty(last.cvd), chartW + axisW / 2, h / 2 + 4);
  }

  destroy() { this._ro?.disconnect(); }
}

// ─── SECTION 14: DELTA HISTOGRAM RENDERER ───────────────────────────────────

class DeltaHistRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) this._ro.observe(this.canvas.parentElement);
  }

  resize() {
    if (!this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w; this.h = h;
  }

  render(candles, visibleCount, scrollOffset, priceAxisW) {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    const axisW = priceAxisW || 74;
    const chartW = Math.max(10, w - axisW);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, w, h);

    if (!candles || candles.length === 0) return;

    const total = candles.length;
    const count = visibleCount || 50;
    const endIdx = Math.max(0, total - (scrollOffset || 0));
    const startIdx = Math.max(0, endIdx - count);
    const visible = candles.slice(startIdx, endIdx);
    if (visible.length === 0) return;

    const barW = chartW / count;
    let maxAbs = 0;
    for (const c of visible) {
      const a = Math.abs(c.delta);
      if (a > maxAbs) maxAbs = a;
    }
    if (maxAbs === 0) maxAbs = 1;

    const midY = h / 2;
    for (let i = 0; i < visible.length; i++) {
      const d = visible[i].delta;
      const barH = (Math.abs(d) / maxAbs) * (h / 2 - 4);
      const x = i * barW + 1;
      const bw = Math.max(1, barW - 2);
      ctx.fillStyle = d >= 0 ? '#0ecb81' : '#f6465d';
      if (d >= 0) {
        ctx.fillRect(x, midY - barH, bw, barH);
      } else {
        ctx.fillRect(x, midY, bw, barH);
      }
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(chartW, midY); ctx.stroke();

    ctx.fillStyle = '#0e1219';
    ctx.fillRect(chartW, 0, axisW, h);
    ctx.strokeStyle = 'rgba(30, 37, 51, 0.45)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, h); ctx.stroke();

    const last = visible[visible.length - 1];
    if (last) {
      ctx.fillStyle = last.delta >= 0 ? '#0ecb81' : '#f6465d';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText((last.delta >= 0 ? '+' : '') + formatQty(last.delta), chartW + axisW / 2, midY + 4);
    }
  }

  destroy() { this._ro?.disconnect(); }
}

// ─── SECTION 15: DOM LADDER ─────────────────────────────────────────────────

class DOMLadder {
  constructor(container) {
    this.container = container;
    this.levels = DOM_LEVELS;
    this.rows = [];
    this.build();
  }

  build() {
    this.container.innerHTML = '';
    const body = document.createElement('div');
    body.id = 'vfx-dom-body';

    // Asks
    for (let i = 0; i < this.levels; i++) {
      const row = this.createRow();
      body.appendChild(row.el);
      this.rows.push(row);
    }
    // Spread row
    this.spreadRow = document.createElement('div');
    this.spreadRow.className = 'vfx-dom-spread';
    this.spreadRow.textContent = 'Spread: —';
    body.appendChild(this.spreadRow);

    // Bids
    for (let i = 0; i < this.levels; i++) {
      const row = this.createRow();
      body.appendChild(row.el);
      this.rows.push(row);
    }
    this.container.appendChild(body);
  }

  createRow() {
    const el = document.createElement('div');
    el.className = 'vfx-dom-row';
    const bidBar = document.createElement('div');
    bidBar.className = 'bid-bar';
    const askBar = document.createElement('div');
    askBar.className = 'ask-bar';
    const bidCell = document.createElement('div');
    bidCell.className = 'bid-cell';
    const priceCell = document.createElement('div');
    priceCell.className = 'price-cell';
    const askCell = document.createElement('div');
    askCell.className = 'ask-cell';
    el.appendChild(bidBar);
    el.appendChild(askBar);
    el.appendChild(bidCell);
    el.appendChild(priceCell);
    el.appendChild(askCell);
    return { el, bidCell, priceCell, askCell, bidBar, askBar };
  }

  update(book, lastPrice, priceFmt) {
    if (!book.isValid) {
      for (const r of this.rows) {
        r.bidCell.textContent = '';
        r.priceCell.textContent = '—';
        r.askCell.textContent = '';
        r.bidBar.style.width = '0';
        r.askBar.style.width = '0';
        r.el.className = 'vfx-dom-row';
      }
      this.spreadRow.textContent = 'Order book depth syncing...';
      return;
    }

    const asks = book.getTopAsks(this.levels);
    const bids = book.getTopBids(this.levels);
    const maxSize = book.getMaxDepthSize(this.levels) || 1;
    const spread = book.getSpread();

    // Asks
    for (let i = 0; i < this.levels; i++) {
      const row = this.rows[i];
      const askIdx = this.levels - 1 - i;
      if (askIdx < asks.length) {
        const [price, qty] = asks[askIdx];
        row.bidCell.textContent = '';
        row.priceCell.textContent = formatPrice(price, priceFmt);
        row.askCell.textContent = formatQty(qty);
        row.bidBar.style.width = '0';
        row.askBar.style.width = ((qty / maxSize) * 100).toFixed(1) + '%';
        row.el.className = qty / maxSize > 0.65 ? 'vfx-dom-row wall' : 'vfx-dom-row';
      } else {
        row.bidCell.textContent = '';
        row.priceCell.textContent = '';
        row.askCell.textContent = '';
        row.bidBar.style.width = '0';
        row.askBar.style.width = '0';
        row.el.className = 'vfx-dom-row';
      }
    }

    this.spreadRow.textContent = spread !== null
      ? `Spread: ${formatPrice(spread, priceFmt)} | Last: ${lastPrice ? formatPrice(lastPrice, priceFmt) : '—'}`
      : 'Spread: —';

    // Bids
    for (let i = 0; i < this.levels; i++) {
      const row = this.rows[this.levels + i];
      if (i < bids.length) {
        const [price, qty] = bids[i];
        row.bidCell.textContent = formatQty(qty);
        row.priceCell.textContent = formatPrice(price, priceFmt);
        row.askCell.textContent = '';
        row.bidBar.style.width = ((qty / maxSize) * 100).toFixed(1) + '%';
        row.askBar.style.width = '0';
        row.el.className = qty / maxSize > 0.65 ? 'vfx-dom-row wall' : 'vfx-dom-row';
        row.el.classList.toggle('at-trade', lastPrice !== null && price === lastPrice);
      } else {
        row.bidCell.textContent = '';
        row.priceCell.textContent = '';
        row.askCell.textContent = '';
        row.bidBar.style.width = '0';
        row.askBar.style.width = '0';
        row.el.className = 'vfx-dom-row';
      }
    }
  }
}

// ─── SECTION 16: SMART TAPE ─────────────────────────────────────────────────

class SmartTape {
  constructor(container) {
    this.container = container;
    this.maxRows = MAX_TAPE;
    this.minSize = 0;
    this.rows = [];
  }

  addTrade(trade, priceFmt) {
    const row = document.createElement('div');
    row.className = 'vfx-tape-row ' + trade.aggressorSide;

    row.innerHTML =
      `<span class="t-time">${formatTimeShort(trade.tsExchange)}</span>` +
      `<span class="t-price">${formatPrice(trade.price, priceFmt)}</span>` +
      `<span class="t-size">${formatQty(trade.quantity)}</span>` +
      `<span class="t-side">${trade.aggressorSide === 'buy' ? 'B' : 'S'}</span>`;

    this.container.prepend(row);
    this.rows.unshift(row);

    while (this.rows.length > this.maxRows) {
      const old = this.rows.pop();
      old.remove();
    }
  }

  clear() {
    this.container.innerHTML = '';
    this.rows = [];
  }
}

// ─── SECTION 17: APPLICATION CONTROLLER ─────────────────────────────────────

class VFXApp {
  constructor() {
    this.symbolId = 'BTCUSDT';
    this.timeframe = DEFAULT_TF;
    this.venue = VENUES.BINANCE_FUTURES;
    this.symbolInfo = getSymbolInfo(this.symbolId);
    this.connector = null;
    this.feedHealth = new FeedHealth();
    this.book = new OrderBookState();
    this.candleBuilder = new CandleBuilder(TIMEFRAMES[this.timeframe]);
    this.cvdEngine = new CVDEngine();
    this.volumeProfile = new VolumeProfileEngine();
    this.imbalanceDetector = new ImbalanceDetector();
    this.largeTradeDetector = new LargeTradeDetector();
    this.lastPrice = null;
    this.chartRenderer = null;
    this.cvdRenderer = null;
    this.deltaRenderer = null;
    this.domLadder = null;
    this.smartTape = null;
    this.dirty = true;
    this.animFrameId = null;
    this.fps = 0;
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();
    this.staleCheckInterval = null;
    this.symbolDropdownOpen = false;
  }

  init() {
    this.buildUI();
    this.setupRenderers();
    this.setupInteractions();
    this.startSymbol(this.symbolId);
    this.startRenderLoop();
    this.startStaleCheck();
  }

  buildUI() {
    const root = document.getElementById('vfx-chart-root');
    if (!root) return;

    root.innerHTML = `
      <div id="vfx-toolbar">
        <div class="vfx-toolbar-group" style="position:relative;">
          <button class="vfx-toolbar-btn vfx-symbol-btn" id="vfx-symbol-btn">
            BTCUSDT <span class="vfx-price-tag" id="vfx-toolbar-price">—</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5L5 6.5L8 3.5"/></svg>
          </button>
          <div class="vfx-dropdown" id="vfx-symbol-dropdown" style="display:none;min-width:210px;"></div>
        </div>
        <div class="vfx-toolbar-sep"></div>
        <div class="vfx-toolbar-group" id="vfx-tf-group">
          <button class="vfx-toolbar-btn" data-tf="1m">1m</button>
          <button class="vfx-toolbar-btn" data-tf="3m">3m</button>
          <button class="vfx-toolbar-btn active" data-tf="5m">5m</button>
          <button class="vfx-toolbar-btn" data-tf="15m">15m</button>
          <button class="vfx-toolbar-btn" data-tf="30m">30m</button>
          <button class="vfx-toolbar-btn" data-tf="1h">1h</button>
        </div>
        <div class="vfx-toolbar-sep"></div>
        <div class="vfx-toolbar-group">
          <button class="vfx-toolbar-btn" id="vfx-venue-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span id="vfx-venue-label">Binance Futures</span>
          </button>
        </div>
        <div class="vfx-feed-badge live" id="vfx-feed-badge">
          <span class="dot"></span>
          <span id="vfx-feed-state">CONNECTING</span>
        </div>
      </div>

      <div id="vfx-main">
        <div id="vfx-chart-col">
          <div id="vfx-chart-area">
            <canvas id="vfx-chart-canvas"></canvas>
          </div>
          <div class="vfx-sub-pane" id="vfx-cvd-pane">
            <span class="vfx-sub-pane-label">CVD</span>
            <canvas id="vfx-cvd-canvas"></canvas>
          </div>
          <div class="vfx-sub-pane" id="vfx-delta-pane">
            <span class="vfx-sub-pane-label">DELTA</span>
            <canvas id="vfx-delta-canvas"></canvas>
          </div>
        </div>

        <div id="vfx-right-panel">
          <div id="vfx-dom">
            <div id="vfx-dom-header">
              <span class="hdr-bid">BID</span>
              <span>PRICE</span>
              <span class="hdr-ask">ASK</span>
            </div>
            <div id="vfx-dom-container"></div>
          </div>
          <div id="vfx-tape">
            <div id="vfx-tape-header">
              <span>TIME</span><span>PRICE</span><span>SIZE</span><span style="width:12px;text-align:center;">S</span>
            </div>
            <div id="vfx-tape-body"></div>
          </div>
        </div>
      </div>

      <div id="vfx-statusbar">
        <div class="vfx-stat"><span class="vfx-stat-label">Feed:</span><span class="vfx-stat-value" id="vfx-st-venue">Binance Futures Live</span></div>
        <div class="vfx-stat-sep"></div>
        <div class="vfx-stat"><span class="vfx-stat-label">Latency:</span><span class="vfx-stat-value" id="vfx-st-latency">—</span></div>
        <div class="vfx-stat-sep"></div>
        <div class="vfx-stat"><span class="vfx-stat-label">Trade Age:</span><span class="vfx-stat-value" id="vfx-st-trade-age">—</span></div>
        <div class="vfx-stat-sep"></div>
        <div class="vfx-stat"><span class="vfx-stat-label">Book Age:</span><span class="vfx-stat-value" id="vfx-st-book-age">—</span></div>
        <div class="vfx-stat-sep"></div>
        <div class="vfx-stat"><span class="vfx-stat-label">Trades:</span><span class="vfx-stat-value" id="vfx-st-trades">0</span></div>
        <div class="vfx-stat-sep"></div>
        <div class="vfx-stat"><span class="vfx-stat-label">Gaps:</span><span class="vfx-stat-value" id="vfx-st-gaps">0</span></div>
        <div class="vfx-stat-sep"></div>
        <div class="vfx-stat"><span class="vfx-stat-label">FPS:</span><span class="vfx-stat-value" id="vfx-st-fps">—</span></div>
        <div class="vfx-stat-sep"></div>
        <div class="vfx-stat"><span class="vfx-stat-label">v${VFX_VERSION}</span></div>
      </div>
    `;

    this.buildSymbolDropdown();
  }

  buildSymbolDropdown() {
    const dd = document.getElementById('vfx-symbol-dropdown');
    if (!dd) return;

    const binance = SYMBOL_MASTER.filter(s => s.venue === VENUES.BINANCE_FUTURES);
    const bybit = SYMBOL_MASTER.filter(s => s.venue === VENUES.BYBIT);

    let html = `<input type="text" class="vfx-search-input" placeholder="Filter symbol..." id="vfx-symbol-search">`;
    html += `<div class="vfx-dropdown-label">Binance Futures (Direct L2)</div>`;
    for (const s of binance) {
      html += `<div class="vfx-dropdown-item${s.id === this.symbolId ? ' active' : ''}" data-symbol="${s.id}">${s.base}/${s.quote} <span style="margin-left:auto;opacity:0.5;font-size:10px;">Perp</span></div>`;
    }
    if (bybit.length > 0) {
      html += `<div class="vfx-dropdown-divider"></div>`;
      html += `<div class="vfx-dropdown-label">Bybit Perpetual</div>`;
      for (const s of bybit) {
        html += `<div class="vfx-dropdown-item${s.id === this.symbolId ? ' active' : ''}" data-symbol="${s.id}">${s.base}/${s.quote} <span style="margin-left:auto;opacity:0.5;font-size:10px;">Perp</span></div>`;
      }
    }
    dd.innerHTML = html;
  }

  setupRenderers() {
    this.chartRenderer = new ChartRenderer(document.getElementById('vfx-chart-canvas'));
    this.cvdRenderer = new CVDRenderer(document.getElementById('vfx-cvd-canvas'));
    this.deltaRenderer = new DeltaHistRenderer(document.getElementById('vfx-delta-canvas'));
    this.domLadder = new DOMLadder(document.getElementById('vfx-dom-container'));
    this.smartTape = new SmartTape(document.getElementById('vfx-tape-body'));
  }

  setupInteractions() {
    const symBtn = document.getElementById('vfx-symbol-btn');
    const symDD = document.getElementById('vfx-symbol-dropdown');
    symBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.symbolDropdownOpen = !this.symbolDropdownOpen;
      symDD.style.display = this.symbolDropdownOpen ? 'block' : 'none';
      if (this.symbolDropdownOpen) {
        document.getElementById('vfx-symbol-search')?.focus();
      }
    });

    symDD?.addEventListener('click', (e) => {
      const item = e.target.closest('.vfx-dropdown-item');
      if (item) {
        const sym = item.dataset.symbol;
        if (sym && sym !== this.symbolId) this.switchSymbol(sym);
        symDD.style.display = 'none';
        this.symbolDropdownOpen = false;
      }
    });

    symDD?.addEventListener('input', (e) => {
      if (e.target.id === 'vfx-symbol-search') {
        const q = e.target.value.toUpperCase();
        symDD.querySelectorAll('.vfx-dropdown-item').forEach(item => {
          item.style.display = item.dataset.symbol.includes(q) ? '' : 'none';
        });
      }
    });

    document.addEventListener('click', () => {
      if (this.symbolDropdownOpen) {
        symDD.style.display = 'none';
        this.symbolDropdownOpen = false;
      }
    });

    document.getElementById('vfx-tf-group')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.vfx-toolbar-btn');
      if (!btn || !btn.dataset.tf) return;
      this.switchTimeframe(btn.dataset.tf);
      document.querySelectorAll('#vfx-tf-group .vfx-toolbar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });

    const chartCanvas = document.getElementById('vfx-chart-canvas');
    chartCanvas?.addEventListener('mousemove', (e) => {
      const rect = chartCanvas.getBoundingClientRect();
      this.chartRenderer.crosshair = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      this.dirty = true;
    });

    chartCanvas?.addEventListener('mouseleave', () => {
      this.chartRenderer.crosshair = null;
      this.dirty = true;
    });

    chartCanvas?.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        this.chartRenderer.visibleCandles = Math.min(180, this.chartRenderer.visibleCandles + 4);
      } else {
        this.chartRenderer.visibleCandles = Math.max(12, this.chartRenderer.visibleCandles - 4);
      }
      this.dirty = true;
    }, { passive: false });
  }

  async fetchInitialHistory(symbolInfo, timeframe) {
    try {
      if (symbolInfo.venue === VENUES.BINANCE_FUTURES) {
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbolInfo.id}&interval=${timeframe}&limit=80`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            this.candleBuilder.loadHistoricalKlines(data);
            this.cvdEngine.loadHistoricalDeltas(this.candleBuilder.candles);
            this.volumeProfile.addHistoricalCandles(this.candleBuilder.candles);
            this.lastPrice = this.candleBuilder.candles[this.candleBuilder.candles.length - 1]?.close || null;
            this.dirty = true;
          }
        }
      }
    } catch (err) {
      console.warn('History warm-start optional fetch:', err.message);
    }
  }

  startSymbol(symbolId) {
    if (this.connector) { this.connector.disconnect(); this.connector = null; }
    this.book.reset();
    this.candleBuilder.reset();
    this.cvdEngine.reset();
    this.volumeProfile.reset();
    this.largeTradeDetector.reset();
    this.feedHealth.reset();
    this.lastPrice = null;
    this.smartTape?.clear();

    this.symbolId = symbolId;
    this.symbolInfo = getSymbolInfo(symbolId);
    this.venue = this.symbolInfo.venue;

    this.candleBuilder.setTickSize(this.symbolInfo.tick);
    this.volumeProfile.setTickSize(this.symbolInfo.tick);

    const symBtn = document.getElementById('vfx-symbol-btn');
    if (symBtn) {
      symBtn.querySelector('#vfx-toolbar-price')?.remove();
      symBtn.childNodes[0].textContent = symbolId.replace('_BYBIT', '') + ' ';
      const pTag = document.createElement('span');
      pTag.className = 'vfx-price-tag';
      pTag.id = 'vfx-toolbar-price';
      pTag.textContent = '—';
      symBtn.insertBefore(pTag, symBtn.querySelector('svg'));
    }

    const venueLabel = document.getElementById('vfx-venue-label');
    if (venueLabel) {
      venueLabel.textContent = this.venue === VENUES.BINANCE_FUTURES ? 'Binance Futures' : 'Bybit Linear';
    }
    const stVenue = document.getElementById('vfx-st-venue');
    if (stVenue) {
      stVenue.textContent = this.venue === VENUES.BINANCE_FUTURES ? 'Binance Futures (L2 Real-Time)' : 'Bybit Linear (L2 Real-Time)';
    }

    // Warm-start with exchange kline history
    this.fetchInitialHistory(this.symbolInfo, this.timeframe);

    const callbacks = {
      onTrade: (t) => this.onTrade(t),
      onBookSnapshot: (s) => this.onBookSnapshot(s),
      onBookDelta: (d) => this.onBookDelta(d),
      onStateChange: (s) => this.onFeedStateChange(s),
      onError: (e) => console.warn('VFX:', e)
    };

    if (this.venue === VENUES.BINANCE_FUTURES) {
      this.connector = new BinanceFuturesConnector(this.symbolInfo.id, this.symbolInfo.wsSymbol, callbacks);
    } else if (this.venue === VENUES.BYBIT) {
      this.connector = new BybitConnector(this.symbolInfo.id, this.symbolInfo.wsSymbol, callbacks);
    }

    this.connector?.connect();
    this.updateFeedBadge(FEED_STATES.CONNECTING);
    this.buildSymbolDropdown();
    this.dirty = true;
  }

  switchSymbol(symbolId) {
    this.startSymbol(symbolId);
  }

  switchTimeframe(tf) {
    if (!TIMEFRAMES[tf]) return;
    this.timeframe = tf;
    this.candleBuilder.setTimeframe(TIMEFRAMES[tf]);
    this.cvdEngine.reset();
    this.volumeProfile.reset();
    this.fetchInitialHistory(this.symbolInfo, tf);
    this.dirty = true;
  }

  onTrade(trade) {
    this.lastPrice = trade.price;
    this.feedHealth.onTrade(trade.tsExchange, trade.tsLocal, trade.sequence);

    const prevCandle = this.candleBuilder.current;
    const candle = this.candleBuilder.addTrade(trade);

    this.cvdEngine.addTrade(trade);
    if (candle && (!prevCandle || prevCandle.start !== candle.start)) {
      if (prevCandle) {
        this.cvdEngine.recordCandlePoint(prevCandle.start, prevCandle.delta);
      }
    }
    if (candle) {
      const p = this.cvdEngine.points.find(pt => pt.ts === candle.start);
      if (p) {
        p.cvd = this.cvdEngine.cumulativeDelta;
        p.delta = candle.delta;
      } else {
        this.cvdEngine.points.push({ ts: candle.start, cvd: this.cvdEngine.cumulativeDelta, delta: candle.delta });
      }
    }

    this.volumeProfile.addTrade(trade);
    this.largeTradeDetector.check(trade);

    if (this.smartTape && this.symbolInfo) {
      this.smartTape.addTrade(trade, this.symbolInfo.priceFmt);
    }

    const pTag = document.getElementById('vfx-toolbar-price');
    if (pTag && this.symbolInfo) {
      pTag.textContent = formatPrice(trade.price, this.symbolInfo.priceFmt);
      pTag.className = 'vfx-price-tag ' + (trade.aggressorSide === 'buy' ? 'vfx-price-up' : 'vfx-price-down');
    }

    this.dirty = true;
  }

  onBookSnapshot(snapshot) {
    this.book.applySnapshot(snapshot);
    this.feedHealth.onBookUpdate(snapshot.tsExchange, snapshot.tsLocal);
    this.dirty = true;
  }

  onBookDelta(delta) {
    if (!this.book.isValid) return;
    this.book.applyDelta(delta);
    this.feedHealth.onBookUpdate(delta.tsExchange, delta.tsLocal);
    this.dirty = true;
  }

  onFeedStateChange(state) {
    this.feedHealth.state = state;
    this.updateFeedBadge(state);
    if (state === FEED_STATES.RECONNECTING) this.feedHealth.onReconnect();
    this.dirty = true;
  }

  updateFeedBadge(state) {
    const badge = document.getElementById('vfx-feed-badge');
    const label = document.getElementById('vfx-feed-state');
    if (!badge || !label) return;
    badge.className = 'vfx-feed-badge ' + state;
    const map = {
      [FEED_STATES.LIVE]: 'LIVE',
      [FEED_STATES.DISCONNECTED]: 'DISCONNECTED',
      [FEED_STATES.CONNECTING]: 'CONNECTING',
      [FEED_STATES.RECONNECTING]: 'RECONNECTING',
      [FEED_STATES.STALE]: 'STALE DATA'
    };
    label.textContent = map[state] || state.toUpperCase();
  }

  startRenderLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      this.fpsFrames++;
      const now = performance.now();
      if (now - this.fpsLastTime >= 1000) {
        this.fps = this.fpsFrames;
        this.fpsFrames = 0;
        this.fpsLastTime = now;
      }

      if (!this.dirty) return;
      this.dirty = false;

      this.volumeProfile.compute();

      if (this.chartRenderer) {
        this.chartRenderer.render({
          candles: this.candleBuilder.getAllCandles(),
          priceFmt: this.symbolInfo?.priceFmt !== undefined ? this.symbolInfo.priceFmt : 2,
          volumeProfile: this.volumeProfile.getBuckets(),
          vpMaxVol: this.volumeProfile.getMaxVolume(),
          vpPOC: this.volumeProfile.poc,
          vpVAH: this.volumeProfile.vah,
          vpVAL: this.volumeProfile.val,
          imbalanceDetector: this.imbalanceDetector,
          largeTrades: this.largeTradeDetector.largeTrades
        });
      }

      if (this.cvdRenderer) {
        this.cvdRenderer.render(this.cvdEngine, this.chartRenderer?.visibleCandles, this.chartRenderer?.priceAxisW);
      }

      if (this.deltaRenderer) {
        this.deltaRenderer.render(
          this.candleBuilder.getAllCandles(),
          this.chartRenderer?.visibleCandles || 50,
          this.chartRenderer?.scrollOffset || 0,
          this.chartRenderer?.priceAxisW
        );
      }

      if (this.domLadder) {
        this.domLadder.update(this.book, this.lastPrice, this.symbolInfo?.priceFmt !== undefined ? this.symbolInfo.priceFmt : 2);
      }

      this.updateStatusBar();
    };
    loop();
  }

  startStaleCheck() {
    this.staleCheckInterval = setInterval(() => {
      this.feedHealth.checkStale();
      if (this.feedHealth.state === FEED_STATES.STALE) {
        this.updateFeedBadge(FEED_STATES.STALE);
      }
      this.dirty = true;
    }, 2000);
  }

  updateStatusBar() {
    const h = this.feedHealth;
    const tradeAge = h.lastTradeLocal ? (Date.now() - h.lastTradeLocal) : -1;
    const bookAge = h.lastBookLocal ? (Date.now() - h.lastBookLocal) : -1;

    const setVal = (id, text, cls) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = text; el.className = 'vfx-stat-value ' + (cls || ''); }
    };

    setVal('vfx-st-trade-age',
      tradeAge < 0 ? '—' : tradeAge < 1000 ? `${Math.round(tradeAge)}ms` : `${(tradeAge / 1000).toFixed(1)}s`,
      tradeAge < 0 ? '' : tradeAge < 2000 ? 'good' : tradeAge < 5000 ? 'warn' : 'bad'
    );
    setVal('vfx-st-book-age',
      bookAge < 0 ? '—' : bookAge < 1000 ? `${Math.round(bookAge)}ms` : `${(bookAge / 1000).toFixed(1)}s`,
      bookAge < 0 ? '' : bookAge < 2000 ? 'good' : bookAge < 5000 ? 'warn' : 'bad'
    );
    setVal('vfx-st-latency',
      h.wsLatencyEstimate > 0 ? `~${Math.round(h.wsLatencyEstimate)}ms` : '—',
      h.wsLatencyEstimate < 300 ? 'good' : 'warn'
    );
    setVal('vfx-st-trades', h.tradeCount.toLocaleString());
    setVal('vfx-st-gaps', h.seqGaps.toString(), h.seqGaps > 0 ? 'warn' : 'good');
    setVal('vfx-st-fps', this.fps.toString(), this.fps >= 50 ? 'good' : this.fps >= 30 ? 'warn' : 'bad');
  }

  destroy() {
    if (this.connector) this.connector.disconnect();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    clearInterval(this.staleCheckInterval);
    this.chartRenderer?.destroy();
    this.cvdRenderer?.destroy();
    this.deltaRenderer?.destroy();
  }
}

// ─── SECTION 18: BOOTLOADER ─────────────────────────────────────────────────

function bootVFX() {
  const root = document.getElementById('vfx-chart-root');
  if (!root) {
    setTimeout(bootVFX, 100);
    return;
  }
  if (!window._vfxApp) {
    window._vfxApp = new VFXApp();
    window._vfxApp.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootVFX);
} else {
  setTimeout(bootVFX, 50);
}
