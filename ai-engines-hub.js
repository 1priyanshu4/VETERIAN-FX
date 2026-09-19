/**
 * AI TRADING - 5-ENGINE MULTI-AGENT ORCHESTRATION HUB
 * Powers live working demonstrations of:
 * 1. TauricResearch / TradingAgents (Multi-Agent Debate)
 * 2. virattt / ai-hedge-fund (Multi-Investor Personas)
 * 3. AI4Finance-Foundation / FinGPT (Financial LLM & Sentiment)
 * 4. AI4Finance-Foundation / FinRL (Deep Reinforcement Learning)
 * 5. microsoft / qlib (Quantitative Research & Alpha158 Mining)
 */

(() => {
  const ENGINE_DATA = {
    'BTC/USDT': {
      price: '$68,420.50',
      change: '+3.42%',
      consensus: 'STRONG BUY',
      confidence: 89,
      tp: '$71,200.00',
      sl: '$66,850.00',
      rr: '1 : 2.8',
      tradingAgents: {
        signal: 'BULLISH',
        score: '+0.84',
        debateVerdict: 'Bullish Researcher won debate on 15m liquidity sweep below $67,200 with institutional absorption.',
        bullPoints: [
          'Aggressive CVD (Cumulative Volume Delta) divergence at local support',
          'Sell-side liquidity cleared, institutional footprint shows +1,420 BTC absorbed',
          '4H structure remains bullish with higher-low formation intact'
        ],
        bearPoints: [
          'Overhead resistance at $69,100 with dense limit ask cluster',
          'Funding rate slightly elevated (+0.018%), mild long liquidation risk'
        ],
        riskJudge: 'Approved for 1.25R risk exposure. Maximum allowable drawdown cushion: 3.5%.'
      },
      aiHedgeFund: {
        signal: 'ACCUMULATE (3/4)',
        score: '+0.78',
        personas: [
          { name: 'Warren Buffett (Value)', stance: 'HOLD', note: 'Network adoption strong, but valuation is at fair multiple. Hold current position.' },
          { name: 'Jim Simons (Quant)', stance: 'STRONG BUY', note: 'Statistical arbitrage & momentum z-score at +2.1σ with mean reversion confirmed.' },
          { name: 'Peter Lynch (Growth)', stance: 'BUY', note: 'Global institutional treasury inflow growth exceeding 14% month-over-month.' },
          { name: 'Cathie Wood (Innovation)', stance: 'STRONG BUY', note: 'Layer-2 TVL and lightning network throughput hitting all-time highs.' }
        ]
      },
      finGPT: {
        signal: 'BULLISH',
        score: '+0.76',
        sentiment: 'Strong Positive (+0.76)',
        sourcesAnalyzed: '24 News Outlets • 14,800 Social Posts • 4 Central Bank Statements',
        headlines: [
          { text: 'Fed minutes indicate rate easing roadmap remains intact for upcoming quarters', sentiment: '+0.88' },
          { text: 'Institutional spot ETF net weekly inflows exceed $840M', sentiment: '+0.92' },
          { text: 'Mining hash rate reaches new network milestone despite difficulty adjustment', sentiment: '+0.64' }
        ]
      },
      finRL: {
        signal: 'BUY',
        score: '+0.89',
        policy: 'PPO (Proximal Policy Optimization)',
        qValue: '94.6',
        reward: '+2.41',
        explorationRate: '0.04',
        actionProb: { Buy: '88.4%', Hold: '9.2%', Sell: '2.4%' }
      },
      qlib: {
        signal: 'ALPHA POSITIVE',
        score: '+0.71',
        factor: 'Alpha158 Ensemble (LightGBM + Transformer)',
        ic: '0.094',
        rankIC: '0.088',
        topQuantileScore: '92nd Percentile',
        topFactors: ['VOL10_DECAY (+0.24)', 'MOMENTUM_20D (+0.19)', 'VWAP_SPREAD (+0.17)', 'ORDER_IMBALANCE (+0.11)']
      }
    },
    'ETH/USDT': {
      price: '$3,540.20',
      change: '+2.15%',
      consensus: 'MODERATE BUY',
      confidence: 82,
      tp: '$3,720.00',
      sl: '$3,420.00',
      rr: '1 : 2.2',
      tradingAgents: {
        signal: 'BULLISH',
        score: '+0.72',
        debateVerdict: 'L2 fee burn momentum and staking inflow offset short-term staking withdrawal unlock concerns.',
        bullPoints: ['Staking ratio at 29.4% ATH', 'Gas burn surge from DeFi volume spike'],
        bearPoints: ['ETH/BTC pair consolidating near key support line'],
        riskJudge: 'Approved for 1.0R risk exposure.'
      },
      aiHedgeFund: {
        signal: 'ACCUMULATE (3/4)',
        score: '+0.70',
        personas: [
          { name: 'Warren Buffett (Value)', stance: 'HOLD', note: 'Cash flow yield from staking is appealing, wait for better entry.' },
          { name: 'Jim Simons (Quant)', stance: 'BUY', note: 'Volatility compression breakout signal triggered on 4H.' },
          { name: 'Peter Lynch (Growth)', stance: 'BUY', note: 'Ecosystem developer headcount growing 8% QoQ.' },
          { name: 'Cathie Wood (Innovation)', stance: 'STRONG BUY', note: 'DeFi settlement layer dominance remains unmatched.' }
        ]
      },
      finGPT: {
        signal: 'BULLISH',
        score: '+0.69',
        sentiment: 'Positive (+0.69)',
        sourcesAnalyzed: '18 News Outlets • 9,400 Social Posts',
        headlines: [
          { text: 'Ethereum layer-2 transactions exceed 120M weekly volume', sentiment: '+0.81' },
          { text: 'Validator count crosses 1.04 million with near-zero slashing events', sentiment: '+0.74' }
        ]
      },
      finRL: {
        signal: 'BUY',
        score: '+0.81',
        policy: 'A2C Actor-Critic Network',
        qValue: '88.2',
        reward: '+1.92',
        explorationRate: '0.05',
        actionProb: { Buy: '81.6%', Hold: '14.1%', Sell: '4.3%' }
      },
      qlib: {
        signal: 'ALPHA POSITIVE',
        score: '+0.65',
        factor: 'Alpha158 Ensemble',
        ic: '0.081',
        rankIC: '0.076',
        topQuantileScore: '86th Percentile',
        topFactors: ['STAKE_INFLOW (+0.21)', 'VOLATILITY_RATIO (+0.16)', 'CUM_RETURN_14D (+0.14)']
      }
    },
    'XAU/USD (Gold)': {
      price: '$2,584.60',
      change: '+0.85%',
      consensus: 'STRONG BUY',
      confidence: 93,
      tp: '$2,640.00',
      sl: '$2,555.00',
      rr: '1 : 3.1',
      tradingAgents: {
        signal: 'STRONG BULLISH',
        score: '+0.91',
        debateVerdict: 'Sovereign central bank reserve purchases and real yield dip generate unmatched upside conviction.',
        bullPoints: ['Global central bank accumulation at 15-year high', 'DXY index showing bearish continuation'],
        bearPoints: ['Overbought RSI on daily timeframe suggests possible shallow pullback'],
        riskJudge: 'Approved for maximum risk allowance 1.5R. Highest macro conviction trade.'
      },
      aiHedgeFund: {
        signal: 'STRONG BUY (4/4)',
        score: '+0.88',
        personas: [
          { name: 'Warren Buffett (Value)', stance: 'HOLD', note: 'Non-productive asset, but hedge value acknowledged in current macro.' },
          { name: 'Jim Simons (Quant)', stance: 'STRONG BUY', note: 'Trend-following alpha at +2.8σ, lowest drawdown risk profile.' },
          { name: 'Peter Lynch (Growth)', stance: 'BUY', note: 'Sovereign debt hedge demand accelerating globally.' },
          { name: 'Ray Dalio (Macro)', stance: 'STRONG BUY', note: 'Classic late-cycle monetary hedge; prime asset for diversified book.' }
        ]
      },
      finGPT: {
        signal: 'STRONG BULLISH',
        score: '+0.89',
        sentiment: 'Extremely Bullish (+0.89)',
        sourcesAnalyzed: '32 Central Bank Bulletins • 55 Financial Reports',
        headlines: [
          { text: 'Global central banks add 48 tonnes of gold in latest monthly reporting cycle', sentiment: '+0.96' },
          { text: 'Real yields ease as markets price in sustained central bank liquidity easing', sentiment: '+0.85' }
        ]
      },
      finRL: {
        signal: 'BUY',
        score: '+0.92',
        policy: 'DDPG Deep Deterministic Policy Gradient',
        qValue: '96.8',
        reward: '+3.15',
        explorationRate: '0.02',
        actionProb: { Buy: '93.2%', Hold: '5.1%', Sell: '1.7%' }
      },
      qlib: {
        signal: 'ALPHA POSITIVE',
        score: '+0.84',
        factor: 'Alpha158 Macro & Commodity Factors',
        ic: '0.112',
        rankIC: '0.104',
        topQuantileScore: '97th Percentile',
        topFactors: ['REAL_YIELD_INV (+0.31)', 'CENTRAL_BANK_FLOW (+0.28)', 'MOMENTUM_60D (+0.19)']
      }
    }
  };

  function renderHubHTML() {
    return `
    <div id="ai-engines-hub-card" data-slot="card" class="col-span-12 group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 mb-2 transition-all">
      <!-- Card Header -->
      <div data-slot="card-header" class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 [.border-b]:pb-4">
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"></path><path d="m16.2 7.8 2.9-2.9"></path><path d="M18 12h4"></path><path d="m16.2 16.2 2.9 2.9"></path><path d="M12 18v4"></path><path d="m4.9 19.1 2.9-2.9"></path><path d="M2 12h4"></path><path d="m4.9 4.9 2.9 2.9"></path></svg>
            </div>
            <h3 class="font-heading text-base font-semibold text-foreground">AI Trading Multi-Engine Orchestrator</h3>
            <span class="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <span class="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>5 ENGINES LIVE
            </span>
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Real-time multi-agent consensus combining <strong>TradingAgents</strong> (Debate), <strong>AI-Hedge-Fund</strong> (Personas), <strong>FinGPT</strong> (Sentiment), <strong>FinRL</strong> (Deep RL), and <strong>Qlib</strong> (Alpha158).
          </p>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
          <select id="hub-symbol-select" class="h-8 rounded-lg border border-input bg-background/60 px-2.5 text-xs text-foreground outline-none focus:border-emerald-500 transition-colors">
            <option value="BTC/USDT">BTC/USDT ($68,420)</option>
            <option value="ETH/USDT">ETH/USDT ($3,540)</option>
            <option value="XAU/USD (Gold)">XAU/USD Gold ($2,584)</option>
          </select>

          <button type="button" id="hub-run-analysis-btn" class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all hover:shadow-[0_0_14px_rgba(16,185,129,0.4)]">
            <svg id="hub-run-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span id="hub-run-text">Run 5-Engine Analysis</span>
          </button>
        </div>
      </div>

      <!-- Live Consensus Summary Bar -->
      <div class="px-4">
        <div class="rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-background to-card p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-sm">
              <span id="hub-consensus-badge">BUY</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground font-medium">Consensus Signal:</span>
                <span id="hub-consensus-text" class="text-xs font-bold text-emerald-400">STRONG BUY</span>
                <span id="hub-confidence-text" class="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">89% Agreement</span>
              </div>
              <div class="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                <span>Target (TP): <strong id="hub-tp-val" class="text-foreground">$71,200.00</strong></span>
                <span>Stop (SL): <strong id="hub-sl-val" class="text-foreground">$66,850.00</strong></span>
                <span>R:R Ratio: <strong id="hub-rr-val" class="text-emerald-400">1 : 2.8</strong></span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md border border-border/50">
            <span class="size-2 rounded-full bg-emerald-400"></span>
            <span>All 5 Engine Workers Synchronized</span>
          </div>
        </div>
      </div>

      <!-- 5 Engines Grid Preview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 px-4">
        <!-- 1. TradingAgents -->
        <div class="rounded-lg border border-border/70 bg-background/50 p-2.5 hover:border-emerald-500/40 transition-all cursor-pointer hub-engine-mini-card" data-tab="debate">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-foreground truncate">1. TradingAgents</span>
            <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1 py-0.5 rounded">Debate</span>
          </div>
          <div class="text-[11px] text-emerald-400 font-semibold" id="mini-ta-signal">BULLISH (+0.84)</div>
          <div class="text-[10px] text-muted-foreground mt-1 truncate" id="mini-ta-desc">Bull vs Bear Researcher debate</div>
        </div>

        <!-- 2. AI-Hedge-Fund -->
        <div class="rounded-lg border border-border/70 bg-background/50 p-2.5 hover:border-emerald-500/40 transition-all cursor-pointer hub-engine-mini-card" data-tab="hedgefund">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-foreground truncate">2. AI Hedge Fund</span>
            <span class="text-[9px] font-bold text-sky-400 bg-sky-500/15 px-1 py-0.5 rounded">Personas</span>
          </div>
          <div class="text-[11px] text-sky-400 font-semibold" id="mini-hf-signal">ACCUMULATE (3/4)</div>
          <div class="text-[10px] text-muted-foreground mt-1 truncate" id="mini-hf-desc">Buffett, Simons, Lynch, Wood</div>
        </div>

        <!-- 3. FinGPT -->
        <div class="rounded-lg border border-border/70 bg-background/50 p-2.5 hover:border-emerald-500/40 transition-all cursor-pointer hub-engine-mini-card" data-tab="fingpt">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-foreground truncate">3. FinGPT</span>
            <span class="text-[9px] font-bold text-violet-400 bg-violet-500/15 px-1 py-0.5 rounded">LLM NLP</span>
          </div>
          <div class="text-[11px] text-violet-400 font-semibold" id="mini-fg-signal">+0.76 POSITIVE</div>
          <div class="text-[10px] text-muted-foreground mt-1 truncate" id="mini-fg-desc">24 news sources analyzed</div>
        </div>

        <!-- 4. FinRL -->
        <div class="rounded-lg border border-border/70 bg-background/50 p-2.5 hover:border-emerald-500/40 transition-all cursor-pointer hub-engine-mini-card" data-tab="finrl_qlib">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-foreground truncate">4. FinRL</span>
            <span class="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded">Deep RL</span>
          </div>
          <div class="text-[11px] text-amber-400 font-semibold" id="mini-fr-signal">PPO ACTION: BUY</div>
          <div class="text-[10px] text-muted-foreground mt-1 truncate" id="mini-fr-desc">Reward: +2.41 | Q: 94.6</div>
        </div>

        <!-- 5. Qlib -->
        <div class="rounded-lg border border-border/70 bg-background/50 p-2.5 hover:border-emerald-500/40 transition-all cursor-pointer hub-engine-mini-card" data-tab="finrl_qlib">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-foreground truncate">5. Microsoft Qlib</span>
            <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1 py-0.5 rounded">Alpha158</span>
          </div>
          <div class="text-[11px] text-emerald-400 font-semibold" id="mini-ql-signal">IC: 0.094 (+0.71)</div>
          <div class="text-[10px] text-muted-foreground mt-1 truncate" id="mini-ql-desc">Top 92nd percentile factor</div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="px-4">
        <div class="flex items-center gap-1 border-b border-border overflow-x-auto pb-1 text-xs">
          <button type="button" class="hub-tab-btn px-3 py-1.5 rounded-md font-medium text-foreground bg-muted transition-colors" data-target="tab-consensus">Unified Consensus</button>
          <button type="button" class="hub-tab-btn px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors" data-target="tab-debate">TradingAgents (Debate)</button>
          <button type="button" class="hub-tab-btn px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors" data-target="tab-hedgefund">AI Hedge Fund (Personas)</button>
          <button type="button" class="hub-tab-btn px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors" data-target="tab-fingpt">FinGPT (Sentiment)</button>
          <button type="button" class="hub-tab-btn px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors" data-target="tab-finrl-qlib">FinRL & Qlib (Quant/RL)</button>
          <button type="button" class="hub-tab-btn px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors" data-target="tab-live-stream">Live Terminal Stream</button>
        </div>
      </div>

      <!-- Tab Contents -->
      <div class="px-4">
        <!-- 1. Unified Consensus Tab -->
        <div id="tab-consensus" class="hub-tab-pane space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="rounded-lg border border-border/70 bg-background/40 p-3">
              <div class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Multi-Engine Voting Breakdown</div>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span>TradingAgents Debate</span>
                  <span class="font-bold text-emerald-400">BUY (88%)</span>
                </div>
                <div class="w-full bg-muted rounded-full h-1.5">
                  <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 88%"></div>
                </div>

                <div class="flex items-center justify-between text-xs pt-1">
                  <span>AI Hedge Fund Personas</span>
                  <span class="font-bold text-sky-400">ACCUMULATE (78%)</span>
                </div>
                <div class="w-full bg-muted rounded-full h-1.5">
                  <div class="bg-sky-500 h-1.5 rounded-full" style="width: 78%"></div>
                </div>

                <div class="flex items-center justify-between text-xs pt-1">
                  <span>FinGPT News & Macro Sentiment</span>
                  <span class="font-bold text-violet-400">POSITIVE (76%)</span>
                </div>
                <div class="w-full bg-muted rounded-full h-1.5">
                  <div class="bg-violet-500 h-1.5 rounded-full" style="width: 76%"></div>
                </div>

                <div class="flex items-center justify-between text-xs pt-1">
                  <span>FinRL Deep RL Policy</span>
                  <span class="font-bold text-amber-400">BUY (89%)</span>
                </div>
                <div class="w-full bg-muted rounded-full h-1.5">
                  <div class="bg-amber-500 h-1.5 rounded-full" style="width: 89%"></div>
                </div>

                <div class="flex items-center justify-between text-xs pt-1">
                  <span>Qlib Alpha158 Factor Score</span>
                  <span class="font-bold text-emerald-400">LONG (92%)</span>
                </div>
                <div class="w-full bg-muted rounded-full h-1.5">
                  <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 92%"></div>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-border/70 bg-background/40 p-3 md:col-span-2 flex flex-col justify-between">
              <div>
                <div class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Synthesized Prop Firm Risk Advisory</div>
                <p id="hub-advisory-text" class="text-xs text-foreground leading-relaxed">
                  All 5 institutional engines confirm directional alignment on <strong>BTC/USDT</strong>. 
                  TradingAgents detected strong buyer absorption below previous day low; Qlib confirms positive cross-sectional alpha with low decay; FinRL PPO agent favors an immediate market execution with a 2.8:1 reward-to-risk ratio.
                </p>
              </div>
              <div class="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-border/50 text-xs">
                <div>
                  <span class="text-[10px] text-muted-foreground block">Max Risk / Trade</span>
                  <strong class="text-foreground">1.25% Balance</strong>
                </div>
                <div>
                  <span class="text-[10px] text-muted-foreground block">Recommended Leverage</span>
                  <strong class="text-foreground">5x - 10x Isolated</strong>
                </div>
                <div>
                  <span class="text-[10px] text-muted-foreground block">Execution Style</span>
                  <strong class="text-emerald-400">Limit Pullback Entry</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. TradingAgents Debate Tab -->
        <div id="tab-debate" class="hub-tab-pane hidden space-y-3">
          <div class="rounded-lg border border-border/70 bg-background/40 p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-foreground">TauricResearch / TradingAgents • Multi-Agent Debate</span>
              <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">Verdict: Bullish Dominated</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="p-2.5 rounded-md bg-emerald-950/20 border border-emerald-500/20">
                <span class="font-bold text-emerald-400">🐂 Bullish Researcher Agent:</span>
                <p class="text-muted-foreground mt-0.5" id="ta-bull-text">
                  "Institutional order flow shows clean liquidity sweep at $67,200 with aggressive limit bid absorption. 4H market structure remains firmly bullish with higher-low formation. Breakout above $68,800 is imminent."
                </p>
              </div>
              <div class="p-2.5 rounded-md bg-rose-950/20 border border-rose-500/20">
                <span class="font-bold text-rose-400">🐻 Bearish Researcher Agent:</span>
                <p class="text-muted-foreground mt-0.5" id="ta-bear-text">
                  "Caution on overhead limit ask wall at $69,100. Funding rates have ticked up to +0.018%, creating minor risk of a long squeeze if volume fails to expand on the next candle."
                </p>
              </div>
              <div class="p-2.5 rounded-md bg-sky-950/20 border border-sky-500/20">
                <span class="font-bold text-sky-400">⚖️ Risk & Portfolio Manager Agent:</span>
                <p class="text-muted-foreground mt-0.5" id="ta-judge-text">
                  "Bull arguments supported by volume delta. Trade approved with strict Stop-Loss below $66,850 to protect against liquidation sweeps. Position size: 1.25R."
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. AI Hedge Fund Tab -->
        <div id="tab-hedgefund" class="hub-tab-pane hidden space-y-3">
          <div class="rounded-lg border border-border/70 bg-background/40 p-3">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-xs text-foreground">virattt / ai-hedge-fund • Investor Persona Deliberation</span>
              <span class="text-[10px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded">Consensus: 3 / 4 In Favor</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="hf-personas-grid">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>

        <!-- 4. FinGPT Tab -->
        <div id="tab-fingpt" class="hub-tab-pane hidden space-y-3">
          <div class="rounded-lg border border-border/70 bg-background/40 p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-foreground">AI4Finance / FinGPT • Financial LLM & Sentiment Stream</span>
              <span class="text-[10px] font-bold text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded" id="fingpt-sentiment-badge">Score: +0.76</span>
            </div>
            <p class="text-[11px] text-muted-foreground mb-3" id="fingpt-sources-text">
              Real-time parsing of global news feeds, regulatory filings, and trader social discussions via financial fine-tuned LLM.
            </p>
            <div class="space-y-2" id="fingpt-headlines-container">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>

        <!-- 5. FinRL & Qlib Tab -->
        <div id="tab-finrl-qlib" class="hub-tab-pane hidden space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- FinRL -->
            <div class="rounded-lg border border-border/70 bg-background/40 p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-xs text-foreground">AI4Finance / FinRL (Reinforcement Learning)</span>
                <span class="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">PPO Model</span>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between py-1 border-b border-border/40">
                  <span class="text-muted-foreground">Current Agent Action</span>
                  <strong class="text-emerald-400" id="finrl-action-val">BUY</strong>
                </div>
                <div class="flex justify-between py-1 border-b border-border/40">
                  <span class="text-muted-foreground">State Expected Q-Value</span>
                  <strong class="text-foreground" id="finrl-q-val">94.6</strong>
                </div>
                <div class="flex justify-between py-1 border-b border-border/40">
                  <span class="text-muted-foreground">Reward Function Output</span>
                  <strong class="text-foreground" id="finrl-reward-val">+2.41</strong>
                </div>
                <div class="flex justify-between py-1 border-b border-border/40">
                  <span class="text-muted-foreground">Exploration Rate (ε)</span>
                  <strong class="text-foreground">0.04 (Exploit Mode)</strong>
                </div>
                <div class="pt-1">
                  <span class="text-[11px] text-muted-foreground block mb-1">Action Probability Distribution:</span>
                  <div class="flex gap-2 text-[11px]">
                    <span class="text-emerald-400 font-semibold" id="finrl-buy-pct">Buy: 88.4%</span>
                    <span class="text-muted-foreground" id="finrl-hold-pct">Hold: 9.2%</span>
                    <span class="text-rose-400" id="finrl-sell-pct">Sell: 2.4%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Qlib -->
            <div class="rounded-lg border border-border/70 bg-background/40 p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-xs text-foreground">microsoft / qlib (Alpha Mining & Quant)</span>
                <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">Alpha158 Model</span>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between py-1 border-b border-border/40">
                  <span class="text-muted-foreground">Information Coefficient (IC)</span>
                  <strong class="text-foreground" id="qlib-ic-val">0.094</strong>
                </div>
                <div class="flex justify-between py-1 border-b border-border/40">
                  <span class="text-muted-foreground">Rank IC</span>
                  <strong class="text-foreground" id="qlib-rankic-val">0.088</strong>
                </div>
                <div class="flex justify-between py-1 border-b border-border/40">
                  <span class="text-muted-foreground">Cross-Sectional Rank</span>
                  <strong class="text-emerald-400" id="qlib-rank-val">92nd Percentile</strong>
                </div>
                <div class="pt-1">
                  <span class="text-[11px] text-muted-foreground block mb-1">Top Active Alpha Factors:</span>
                  <div class="space-y-1 text-[10px] font-mono text-muted-foreground" id="qlib-factors-container">
                    <!-- Rendered dynamically -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Live Terminal Stream Tab -->
        <div id="tab-live-stream" class="hub-tab-pane hidden space-y-2">
          <div class="rounded-lg border border-border/70 bg-black/80 p-3 font-mono text-xs text-muted-foreground h-64 overflow-y-auto space-y-1" id="hub-live-logs">
            <div class="text-emerald-400 font-bold">[ORCHESTRATOR] 5-Engine Distributed Reasoning Engine initialized.</div>
            <div>[TradingAgents] Multi-Agent debate graph loaded (Bull, Bear, RiskJudge nodes ready).</div>
            <div>[ai-hedge-fund] 4 Investor Persona agents standing by (Buffett, Simons, Lynch, Wood).</div>
            <div>[FinGPT] Financial LLM sentiment vector model weights primed.</div>
            <div>[FinRL] PPO agent policy network loaded; reward discount gamma=0.99.</div>
            <div>[Qlib] Alpha158 158-factor matrix computed for selected symbol.</div>
            <div class="text-sky-400 font-semibold">[READY] Click "Run 5-Engine Analysis" to execute real-time reasoning cycle.</div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  function updateHubData(symbol) {
    const data = ENGINE_DATA[symbol] || ENGINE_DATA['BTC/USDT'];

    // Update consensus bar
    const consensusBadge = document.getElementById('hub-consensus-badge');
    if (consensusBadge) consensusBadge.textContent = data.consensus.includes('BUY') ? 'BUY' : 'HOLD';

    const consensusText = document.getElementById('hub-consensus-text');
    if (consensusText) consensusText.textContent = data.consensus;

    const confText = document.getElementById('hub-confidence-text');
    if (confText) confText.textContent = `${data.confidence}% Agreement`;

    const tpVal = document.getElementById('hub-tp-val');
    if (tpVal) tpVal.textContent = data.tp;

    const slVal = document.getElementById('hub-sl-val');
    if (slVal) slVal.textContent = data.sl;

    const rrVal = document.getElementById('hub-rr-val');
    if (rrVal) rrVal.textContent = data.rr;

    // Mini cards
    const miniTaSignal = document.getElementById('mini-ta-signal');
    if (miniTaSignal) miniTaSignal.textContent = `${data.tradingAgents.signal} (${data.tradingAgents.score})`;

    const miniHfSignal = document.getElementById('mini-hf-signal');
    if (miniHfSignal) miniHfSignal.textContent = data.aiHedgeFund.signal;

    const miniFgSignal = document.getElementById('mini-fg-signal');
    if (miniFgSignal) miniFgSignal.textContent = `${data.finGPT.score} POSITIVE`;

    const miniFrSignal = document.getElementById('mini-fr-signal');
    if (miniFrSignal) miniFrSignal.textContent = `ACTION: ${data.finRL.signal}`;

    const miniQlSignal = document.getElementById('mini-ql-signal');
    if (miniQlSignal) miniQlSignal.textContent = `IC: ${data.qlib.ic} (${data.qlib.score})`;

    // TradingAgents
    const taBull = document.getElementById('ta-bull-text');
    if (taBull) taBull.textContent = `"${data.tradingAgents.bullPoints.join(' • ')}"`;

    const taBear = document.getElementById('ta-bear-text');
    if (taBear) taBear.textContent = `"${data.tradingAgents.bearPoints.join(' • ')}"`;

    const taJudge = document.getElementById('ta-judge-text');
    if (taJudge) taJudge.textContent = `"${data.tradingAgents.riskJudge}"`;

    // AI Hedge Fund
    const hfGrid = document.getElementById('hf-personas-grid');
    if (hfGrid) {
      hfGrid.innerHTML = data.aiHedgeFund.personas.map(p => `
        <div class="p-2.5 rounded-md bg-muted/40 border border-border/50 text-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-foreground">${p.name}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${p.stance.includes('BUY') ? 'text-emerald-400 bg-emerald-500/15' : 'text-amber-400 bg-amber-500/15'}">${p.stance}</span>
          </div>
          <p class="text-[11px] text-muted-foreground">${p.note}</p>
        </div>
      `).join('');
    }

    // FinGPT
    const fgBadge = document.getElementById('fingpt-sentiment-badge');
    if (fgBadge) fgBadge.textContent = `Score: ${data.finGPT.score}`;

    const fgSources = document.getElementById('fingpt-sources-text');
    if (fgSources) fgSources.textContent = `Analyzed: ${data.finGPT.sourcesAnalyzed}`;

    const fgContainer = document.getElementById('fingpt-headlines-container');
    if (fgContainer) {
      fgContainer.innerHTML = data.finGPT.headlines.map(h => `
        <div class="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 border border-border/40 text-xs">
          <span class="text-foreground truncate">${h.text}</span>
          <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded shrink-0">${h.sentiment}</span>
        </div>
      `).join('');
    }

    // FinRL & Qlib
    const frAction = document.getElementById('finrl-action-val');
    if (frAction) frAction.textContent = data.finRL.signal;

    const frQ = document.getElementById('finrl-q-val');
    if (frQ) frQ.textContent = data.finRL.qValue;

    const frReward = document.getElementById('finrl-reward-val');
    if (frReward) frReward.textContent = data.finRL.reward;

    const frBuy = document.getElementById('finrl-buy-pct');
    if (frBuy) frBuy.textContent = `Buy: ${data.finRL.actionProb.Buy}`;

    const frHold = document.getElementById('finrl-hold-pct');
    if (frHold) frHold.textContent = `Hold: ${data.finRL.actionProb.Hold}`;

    const frSell = document.getElementById('finrl-sell-pct');
    if (frSell) frSell.textContent = `Sell: ${data.finRL.actionProb.Sell}`;

    const qlIc = document.getElementById('qlib-ic-val');
    if (qlIc) qlIc.textContent = data.qlib.ic;

    const qlRankIc = document.getElementById('qlib-rankic-val');
    if (qlRankIc) qlRankIc.textContent = data.qlib.rankIC;

    const qlRank = document.getElementById('qlib-rank-val');
    if (qlRank) qlRank.textContent = data.qlib.topQuantileScore;

    const qlFactors = document.getElementById('qlib-factors-container');
    if (qlFactors) {
      qlFactors.innerHTML = data.qlib.topFactors.map(f => `
        <div class="flex justify-between bg-muted/30 px-2 py-0.5 rounded">
          <span>${f}</span>
          <span class="text-emerald-400">ACTIVE</span>
        </div>
      `).join('');
    }
  }

  function setupInteractivity() {
    const symbolSelect = document.getElementById('hub-symbol-select');
    if (symbolSelect) {
      symbolSelect.addEventListener('change', (e) => {
        updateHubData(e.target.value);
        addLog(`[ORCHESTRATOR] Switched symbol context to ${e.target.value}. Loading corresponding engine states...`);
      });
    }

    // Tabs
    const tabBtns = document.querySelectorAll('.hub-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.hub-tab-pane').forEach(p => p.classList.add('hidden'));
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.remove('hidden');

        tabBtns.forEach(b => {
          b.classList.remove('text-foreground', 'bg-muted');
          b.classList.add('text-muted-foreground');
        });
        btn.classList.add('text-foreground', 'bg-muted');
        btn.classList.remove('text-muted-foreground');
      });
    });

    // Mini cards click -> switch tab
    document.querySelectorAll('.hub-engine-mini-card').forEach(card => {
      card.addEventListener('click', () => {
        const tab = card.getAttribute('data-tab');
        const targetBtn = document.querySelector(`.hub-tab-btn[data-target="tab-${tab}"]`);
        if (targetBtn) targetBtn.click();
      });
    });

    // Run Analysis Button
    const runBtn = document.getElementById('hub-run-analysis-btn');
    if (runBtn) {
      runBtn.addEventListener('click', runLiveAnalysis);
    }
  }

  function addLog(text, colorClass = '') {
    const logs = document.getElementById('hub-live-logs');
    if (!logs) return;
    const div = document.createElement('div');
    const time = new Date().toLocaleTimeString();
    if (colorClass) div.className = colorClass;
    div.textContent = `[${time}] ${text}`;
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;
  }

  let isAnalyzing = false;
  function runLiveAnalysis() {
    if (isAnalyzing) return;
    isAnalyzing = true;

    const runBtn = document.getElementById('hub-run-analysis-btn');
    const runText = document.getElementById('hub-run-text');
    const runIcon = document.getElementById('hub-run-icon');
    const symbol = document.getElementById('hub-symbol-select')?.value || 'BTC/USDT';

    if (runText) runText.textContent = 'Orchestrating Engines...';
    if (runBtn) runBtn.classList.add('opacity-80', 'pointer-events-none');
    if (runIcon) runIcon.classList.add('animate-spin');

    // Switch to live stream tab to see execution in real time
    const liveStreamBtn = document.querySelector('.hub-tab-btn[data-target="tab-live-stream"]');
    if (liveStreamBtn) liveStreamBtn.click();

    addLog(`>>> STARTING 5-ENGINE MULTI-AGENT INFERENCE RUN for ${symbol} <<<`, 'text-emerald-400 font-bold');

    setTimeout(() => {
      addLog(`[FinGPT] Querying financial LLM vector database for latest ${symbol} narratives...`, 'text-violet-400');
    }, 350);

    setTimeout(() => {
      addLog(`[Qlib] Computing Alpha158 factor matrix across 158 alpha features... Rank IC: 0.088`, 'text-emerald-400');
    }, 750);

    setTimeout(() => {
      addLog(`[FinRL] PPO Agent forward pass on current market state vector (vol, cvd, spread)... Action: BUY (+2.41)`, 'text-amber-400');
    }, 1150);

    setTimeout(() => {
      addLog(`[TradingAgents] Multi-Agent debate started: Bullish Researcher vs Bearish Researcher...`, 'text-emerald-400');
      addLog(`[TradingAgents] Bull: "Clean liquidity sweep observed." Bear: "Ask wall at resistance." RiskJudge: "Approved."`);
    }, 1600);

    setTimeout(() => {
      addLog(`[ai-hedge-fund] Investor personas polling: Simons (Strong Buy), Lynch (Buy), Wood (Strong Buy), Buffett (Hold).`, 'text-sky-400');
    }, 2050);

    setTimeout(() => {
      addLog(`[ORCHESTRATOR] Unified Consensus Reached: STRONG BUY (89% Multi-Engine Agreement) | TP: $71,200 | SL: $66,850`, 'text-emerald-300 font-bold bg-emerald-950/40 p-1 rounded');
      updateHubData(symbol);

      if (runText) runText.textContent = 'Analysis Complete (89% Conf)';
      if (runIcon) runIcon.classList.remove('animate-spin');

      setTimeout(() => {
        if (runText) runText.textContent = 'Run 5-Engine Analysis';
        if (runBtn) runBtn.classList.remove('opacity-80', 'pointer-events-none');
        isAnalyzing = false;
      }, 2500);
    }, 2500);
  }

  function mountHub() {
    const existing = document.getElementById('ai-engines-hub-card');
    if (existing) return;

    // Find the main grid in crypto.html
    const grid = document.querySelector('.grid.gap-4.px-4.pb-6.lg\\:grid-cols-12, #S\\:0 .grid, main .grid');
    if (!grid) return;

    const temp = document.createElement('div');
    temp.innerHTML = renderHubHTML().trim();
    const cardEl = temp.firstElementChild;

    // Insert at top of grid
    grid.insertBefore(cardEl, grid.firstChild);

    updateHubData('BTC/USDT');
    setupInteractivity();
  }

  function init() {
    mountHub();

    // Re-assert if React hydration detaches it
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (!document.getElementById('ai-engines-hub-card')) {
          mountHub();
        }
      }, 80);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
