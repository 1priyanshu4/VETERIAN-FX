// ============================================================================
// TAPEDELTA-STYLE INSTITUTIONAL ORDER-FLOW CHART TERMINAL (PHASE 1)
// Modular, 60fps Canvas 2D Candlestick & Volume Engine + Binance Live WS
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
  return vol.toFixed(2);
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

// ─── 2. MARKET DATA PROVIDER (Binance REST + WebSocket) ─────────────────────

class BinanceMarketDataProvider {
  constructor() {
    this.ws = null;
    this.activeSymbol = 'BTCUSDT';
    this.activeInterval = '5m';
    this.reconnectTimer = null;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.destroyed = false;
    this.onCandleUpdate = null;
    this.onHistoryLoaded = null;
    this.onStatusChange = null;
  }

  async connect(symbol, interval, onCandleUpdate, onHistoryLoaded, onStatusChange) {
    this.activeSymbol = symbol.toUpperCase();
    this.activeInterval = interval;
    this.onCandleUpdate = onCandleUpdate;
    this.onHistoryLoaded = onHistoryLoaded;
    this.onStatusChange = onStatusChange;
    this.destroyed = false;

    this.setStatus('connecting');

    // 1. Fetch historical candles via REST
    await this.fetchKlines(this.activeSymbol, this.activeInterval);

    // 2. Open live WebSocket stream
    this.openWebSocket();
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

  openWebSocket() {
    if (this.destroyed) return;
    this.closeWebSocket();

    const streamName = `${this.activeSymbol.toLowerCase()}@kline_${this.activeInterval}`;
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
        this.setStatus('live');
      };

      this.ws.onmessage = (event) => {
        try {
          if (this.destroyed) return;
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
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      this.ws.onerror = () => {
        // Will trigger onclose
      };

      this.ws.onclose = () => {
        if (!this.destroyed) {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.destroyed) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.openWebSocket();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  setStatus(status) {
    this.onStatusChange?.(status);
  }

  closeWebSocket() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
  }

  disconnect() {
    this.destroyed = true;
    clearTimeout(this.reconnectTimer);
    this.closeWebSocket();
    this.setStatus('disconnected');
  }
}

// ─── 3. CANDLE STORE ────────────────────────────────────────────────────────

class CandleStore {
  constructor() {
    this.candles = [];
    this.maxCandles = 600;
  }

  setHistory(history) {
    this.candles = history.slice(-this.maxCandles);
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
    }
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

// ─── 4. DUAL-CANVAS RENDERING ENGINE ────────────────────────────────────────

class DualCanvasChart {
  constructor(container, store, symbolInfo, interval) {
    this.container = container;
    this.store = store;
    this.symbolInfo = symbolInfo;
    this.interval = interval;

    // View state
    this.visibleCandles = 75;
    this.scrollOffset = 0; // 0 = rightmost, positive = panned into past
    this.priceAxisW = 74;
    this.timeAxisH = 24;
    this.volumePaneRatio = 0.20; // 20% of vertical height for volume

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

    // Listen for dark/light theme changes
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
    `;

    this.baseCanvas = this.container.querySelector('.td-canvas-base');
    this.overlayCanvas = this.container.querySelector('.td-canvas-overlay');
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

    // Scale canvas elements for sharp HiDPI rendering
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
    this.volH = Math.floor(this.chartH * this.volumePaneRatio);
    this.candleH = this.chartH - this.volH;
  }

  bindEvents() {
    const el = this.overlayCanvas;

    // Mouse Move -> Crosshair
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
    });

    // Mouse Leave
    el.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.crosshair = null;
      this.renderOverlay();
      this.onHoverCandle?.(null);
    });

    // Mouse Down -> Pan Start
    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartOffset = this.scrollOffset;
    });

    // Mouse Up -> Pan End
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch Support for Mobile / Tablet Panning
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
    }, { passive: false });

    // Double Click -> Reset View
    el.addEventListener('dblclick', () => {
      this.resetView();
    });
  }

  resetView() {
    this.visibleCandles = 75;
    this.scrollOffset = 0;
    this.requestRender();
    this.renderOverlay();
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
    if (visible.length === 0) return { min: 0, max: 1, range: 1 };

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

  // ─── Primary 2D Canvas Render ─────────────────────────────────────────────
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

    const { visible } = this.getVisibleRange();
    if (visible.length === 0) {
      ctx.fillStyle = this.colors.textAxis;
      ctx.font = '13px ' + (getComputedStyle(document.documentElement).getPropertyValue('--td-font-mono') || 'monospace');
      ctx.textAlign = 'center';
      ctx.fillText('Connecting to Binance live feed...', this.chartW / 2, this.chartH / 2);
      return;
    }

    const { min: pMin, max: pMax, range: pRange, maxVol } = this.getPriceBounds(visible);
    const candleW = this.chartW / this.visibleCandles;
    const bodyW = Math.max(1, candleW * 0.72);
    const gap = (candleW - bodyW) / 2;

    const toY = (price) => (1 - (price - pMin) / pRange) * this.candleH;
    const volToH = (vol) => (vol / maxVol) * (this.volH - 8);

    // 1. Grid
    this.drawGrid(ctx, pMin, pMax, toY);

    // 2. Candlesticks + Volume Bars
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = i * candleW;
      const isUp = c.close >= c.open;
      const color = isUp ? this.colors.up : this.colors.down;

      // Candle Wick
      const wickX = Math.round(x + candleW / 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wickX, Math.round(toY(c.high)));
      ctx.lineTo(wickX, Math.round(toY(c.low)));
      ctx.stroke();

      // Candle Body
      const topY = Math.round(toY(Math.max(c.open, c.close)));
      const botY = Math.round(toY(Math.min(c.open, c.close)));
      const bH = Math.max(1, botY - topY);

      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + gap), topY, Math.round(bodyW), bH);

      // Volume Bar (sub-pane)
      const vH = volToH(c.volume);
      const vY = this.chartH - vH;
      ctx.fillStyle = isUp ? this.colors.upDim : this.colors.downDim;
      ctx.fillRect(Math.round(x + gap), vY, Math.round(bodyW), vH);
    }

    // 3. Axes
    this.drawAxes(ctx, pMin, pMax, toY, visible, candleW);

    // 4. Current Price Tag
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

    // Horizontal separator between price pane & volume pane
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, this.candleH);
    ctx.lineTo(this.chartW, this.candleH);
    ctx.stroke();
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
      ctx.fillText(tdFmtPrice(p, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, y + 3.5);
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

    // Price Tag on Axis
    const { visible } = this.getVisibleRange();
    if (visible.length === 0) return;
    const { min: pMin, max: pMax, range: pRange } = this.getPriceBounds(visible);

    const price = pMin + (1 - y / this.candleH) * pRange;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(this.chartW, y - 9, this.priceAxisW, 18);
    ctx.fillStyle = this.colors.textAxisHighlight;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tdFmtPrice(price, this.symbolInfo.decimals), this.chartW + this.priceAxisW / 2, y + 4);

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

// ─── 5. TERMINAL UI CONTROLLER ──────────────────────────────────────────────

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
        <div class="td-stat"><span style="color:var(--td-text-dim)">Feed:</span> <span class="td-stat-val">Binance Spot / Futures WS</span></div>
        <div class="td-stat"><span style="color:var(--td-text-dim)">Pair:</span> <span class="td-stat-val">${this.symbol}</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">Candles:</span> <span class="td-stat-val" id="td-stat-candles">0</span></div>
        <div class="td-stat hide-mobile"><span style="color:var(--td-text-dim)">FPS:</span> <span class="td-stat-val good" id="td-stat-fps">60</span></div>
        <div class="td-stat" style="margin-left:auto"><span style="color:var(--td-text-dim)">Engine:</span> <span class="td-stat-val">TapeDelta Canvas v1.0</span></div>
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
    this.provider.connect(
      this.symbol,
      this.interval,
      (liveCandle, eventTime) => {
        this.store.updateLive(liveCandle);
        this.chart.requestRender();
        this.updatePriceBadge(liveCandle);
        this.updateCandleCount();
      },
      (history) => {
        this.store.setHistory(history);
        this.chart.requestRender();
        const latest = this.store.getLatest();
        if (latest) {
          this.updatePriceBadge(latest);
          this.renderOHLCV(latest);
        }
        this.updateCandleCount();
      },
      (status) => {
        this.updateStatusBadge(status);
      }
    );
  }

  switchSymbol(newSym) {
    this.symbol = newSym;
    this.symbolInfo = TD_SYMBOLS.find(s => s.symbol === newSym) || { symbol: newSym, decimals: 2 };
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

// ─── 6. AUTO-BOOTLOADER ─────────────────────────────────────────────────────

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
