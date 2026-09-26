/**
 * VETERIAN-FX PLATFORM FUNDED ACCOUNTS CONTROLLER
 * Supports:
 * - 1-Step Evaluation (1 Demo Step -> Real Funded Account with 80% split)
 * - 2-Step Evaluation (Stage 1 Demo -> Stage 2 Demo -> Real Funded Account with 80% split)
 * - 3-Step Evaluation (Stage 1 Demo -> Stage 2 Demo -> Stage 3 Demo -> Real Funded Account with 80% split)
 * - Instant Funded Evaluation (Direct Real Funded Account with 80% split from day 1)
 *
 * Payout Calculation:
 * Trader Net Payout = Profit - 20% Firm Share = Profit * 0.80
 * Example: Equity $5,000, Profit $127 -> Net Payout = $101.60
 */

(() => {
  const STORAGE_KEY = 'veterian_funded_accounts_list_v1';
  const ACTIVE_INDEX_KEY = 'veterian_funded_accounts_active_v1';

  // Seeded default accounts demonstrating each model
  const DEFAULT_ACCOUNTS = [
    {
      id: 'acc_instant_5k',
      name: 'Apex $5,000 (Instant)',
      type: 'instant', // 'instant' | '1-step' | '2-step' | '3-step'
      stage: 'real',   // 'real' | 'step-1' | 'step-2' | 'step-3'
      balance: 5000,
      profit: 127.00,
      targetPct: 10
    },
    {
      id: 'acc_ftmo_100k',
      name: 'FTMO $100,000 (2-Step)',
      type: '2-step',
      stage: 'step-2', // Stage 1 Demo passed -> Stage 2 Demo active
      balance: 100000,
      profit: 3450.00,
      targetPct: 5
    },
    {
      id: 'acc_alpha_50k',
      name: 'Alpha $50,000 (1-Step)',
      type: '1-step',
      stage: 'real',   // Step 1 Demo completed -> Real Funded Account
      balance: 50000,
      profit: 4200.00,
      targetPct: 10
    },
    {
      id: 'acc_pips_25k',
      name: 'Funding Pips $25,000 (3-Step)',
      type: '3-step',
      stage: 'step-1', // Stage 1 Demo active
      balance: 25000,
      profit: 1100.00,
      targetPct: 8
    }
  ];

  function getAccounts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }

  function saveAccounts(accounts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {}
  }

  function getActiveIndex(maxLen) {
    try {
      const saved = localStorage.getItem(ACTIVE_INDEX_KEY);
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < maxLen) return idx;
    } catch (e) {}
    return 0;
  }

  function setActiveIndex(idx) {
    try {
      localStorage.setItem(ACTIVE_INDEX_KEY, idx.toString());
    } catch (e) {}
  }

  function formatMoney(num) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  const CARD_TEMPLATE = `
    <!-- Card Header -->
    <div data-slot="card-header" class="group/card-header @container/card-header auto-rows-min items-start rounded-t-xl px-4 group-data-[size=sm]/card:px-3 flex flex-col gap-3 space-y-0 pb-3 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <div data-slot="card-title" class="font-heading group-data-[size=sm]/card:text-sm text-base font-semibold">Funded Accounts</div>
          <span id="fa-account-count-badge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">4 Accounts</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span class="flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-primary"></span>
            Trader Net Payout (80% Split): <span class="font-semibold text-foreground" id="fa-header-payout">$101.60</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-muted-foreground/40"></span>
            Evaluation Models: <span class="font-medium text-foreground">1-Step • 2-Step • 3-Step • Instant</span>
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" id="fa-open-add-modal-btn" class="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium px-3 h-8 gap-1.5 transition-colors cursor-pointer text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
          Add Account
        </button>
      </div>
    </div>

    <!-- Card Content -->
    <div data-slot="card-content" class="px-4 group-data-[size=sm]/card:px-3 pt-3 flex flex-col gap-4">
      <!-- Account Selector Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border/30" id="fa-tabs-container"></div>

      <!-- Active Account Details Grid -->
      <div id="fa-active-account-details" class="flex flex-col gap-4">
        <!-- 4 Key Metrics -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-lg border border-border/50 bg-muted/20 p-3 flex flex-col gap-1">
            <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Account Equity</span>
            <div class="text-xl font-bold tracking-tight text-foreground" id="fa-metric-equity">$5,127.00</div>
            <span class="text-xs text-muted-foreground" id="fa-metric-balance">Initial Balance: $5,000.00</span>
          </div>

          <div class="rounded-lg border border-border/50 bg-muted/20 p-3 flex flex-col gap-1">
            <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Current Profit</span>
            <div class="text-xl font-bold tracking-tight text-emerald-500" id="fa-metric-profit">+$127.00</div>
            <span class="text-xs text-muted-foreground" id="fa-metric-profit-pct">+2.54% Return</span>
          </div>

          <div class="rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col gap-1 ring-1 ring-primary/20">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-primary uppercase tracking-wider">Trader Payout (80%)</span>
              <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/20 text-primary">80% Split</span>
            </div>
            <div class="text-xl font-bold tracking-tight text-primary" id="fa-metric-payout">$101.60</div>
            <span class="text-xs text-muted-foreground" id="fa-metric-firm-share">Firm Share (20%): $25.40</span>
          </div>

          <div class="rounded-lg border border-border/50 bg-muted/20 p-3 flex flex-col gap-1">
            <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Account Status</span>
            <div class="text-base font-semibold tracking-tight text-foreground flex items-center gap-1.5" id="fa-metric-status">
              <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Real Funded
            </div>
            <span class="text-xs text-muted-foreground" id="fa-metric-eval-type">Instant Funded Evaluation (Direct Real)</span>
          </div>
        </div>

        <!-- Evaluation Journey / Step Progression -->
        <div class="rounded-lg border border-border/40 bg-muted/10 p-3.5 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-git-branch"><line x1="6" x2="6" y1="3" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
              Evaluation Path &amp; Profit Split Progression
            </span>
            <span class="text-xs text-muted-foreground" id="fa-stage-desc">Direct Real Account (No Demo Challenge Steps)</span>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto py-1" id="fa-journey-steps"></div>
        </div>

        <!-- Logic & Payout Formula Note -->
        <div class="rounded-lg border border-border/30 bg-muted/5 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calculator text-primary shrink-0"><rect width="16" height="20" x="4" y="2" rx="2"></rect><line x1="8" x2="16" y1="6" y2="6"></line><line x1="16" x2="16" y1="14" y2="14"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>
            <span>Calculation Formula: <strong class="text-foreground">Profit - 20% Firm Share = Trader Net Payout (80%)</strong>. E.g. $127.00 - 20% = <strong class="text-primary font-semibold">$101.60</strong></span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" id="fa-delete-account-btn" class="text-xs text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer">Remove Account</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Account Modal -->
    <div id="fa-add-modal" class="fixed inset-0 z-50 hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="w-full max-w-md rounded-xl bg-card border border-border shadow-xl p-5 flex flex-col gap-4 text-card-foreground">
        <div class="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h3 class="font-heading text-base font-semibold">Add Funded Account</h3>
            <p class="text-xs text-muted-foreground">Add a 1-Step, 2-Step, 3-Step, or Instant Funded evaluation account.</p>
          </div>
          <button type="button" id="fa-close-modal-btn" class="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer">&times;</button>
        </div>

        <form id="fa-add-form" class="flex flex-col gap-3.5 text-xs">
          <div class="flex flex-col gap-1.5">
            <label class="font-medium text-foreground">Account Name / Prop Firm</label>
            <input type="text" id="fa-input-name" required placeholder="e.g. Apex Instant $5K, FTMO 2-Step $100K" class="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-foreground">Evaluation Model</label>
              <select id="fa-input-type" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="instant">Instant Funded (Direct Real)</option>
                <option value="1-step">1-Step Evaluation (1 Demo)</option>
                <option value="2-step">2-Step Evaluation (2 Demos)</option>
                <option value="3-step">3-Step Evaluation (3 Demos)</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-foreground">Current Stage</label>
              <select id="fa-input-stage" class="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="real">Real Funded (80% Split)</option>
                <option value="step-1">Demo Stage 1</option>
                <option value="step-2">Demo Stage 2</option>
                <option value="step-3">Demo Stage 3</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-foreground">Account Size / Balance ($)</label>
              <input type="number" id="fa-input-balance" step="100" value="5000" class="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-foreground">Current Profit ($)</label>
              <input type="number" id="fa-input-profit" step="0.01" value="127" class="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <!-- Live Calculation Preview -->
          <div class="rounded-lg border border-border/40 bg-muted/20 p-2.5 flex items-center justify-between">
            <span class="text-muted-foreground">Net Trader Payout (80%):</span>
            <span class="font-bold text-primary" id="fa-modal-payout-preview">$101.60</span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <button type="button" id="fa-cancel-modal-btn" class="h-8 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer">Cancel</button>
            <button type="submit" class="h-8 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer">Save Account</button>
          </div>
        </form>
      </div>
    </div>
  `;

  function findTargetCard() {
    // 1. By ID
    let card = document.getElementById('funded-accounts-card');
    if (card) return card;

    // 2. Search card titles for "Funded Accounts" or "Financial Overview"
    const titles = document.querySelectorAll('[data-slot="card-title"]');
    for (const title of titles) {
      const txt = (title.textContent || '').trim();
      if (txt === 'Funded Accounts' || txt === 'Financial Overview') {
        card = title.closest('[data-slot="card"]');
        if (card) {
          card.id = 'funded-accounts-card';
          return card;
        }
      }
    }

    // 3. First card inside the 8-column span
    const mainCols = document.querySelectorAll('.col-span-12.lg\\:col-span-8, [class*="lg:col-span-8"]');
    for (const col of mainCols) {
      card = col.querySelector('[data-slot="card"]');
      if (card) {
        card.id = 'funded-accounts-card';
        return card;
      }
    }

    return null;
  }

  function mountFundedAccountsCard() {
    const card = findTargetCard();
    if (!card) return;

    // Check if card needs mounting or re-mounting
    const isAlreadyMounted = card.getAttribute('data-funded-mounted') === 'true' && card.querySelector('#fa-tabs-container');
    const hasOldContent = card.textContent.includes('Current Year') || card.textContent.includes('1,170,273') || card.textContent.includes('Financial Overview');

    if (!isAlreadyMounted || hasOldContent) {
      card.id = 'funded-accounts-card';
      card.setAttribute('data-funded-mounted', 'true');
      card.innerHTML = CARD_TEMPLATE;
      bindModalEvents();
    }

    renderFundedAccounts();
  }

  function renderFundedAccounts() {
    const card = document.getElementById('funded-accounts-card');
    if (!card) return;

    const accounts = getAccounts();
    const activeIdx = getActiveIndex(accounts.length);
    const activeAcc = accounts[activeIdx] || accounts[0];

    // 1. Header payout summary
    let totalTraderPayout = 0;
    accounts.forEach(acc => {
      if (acc.stage === 'real' && acc.profit > 0) {
        totalTraderPayout += acc.profit * 0.80;
      }
    });

    const headerPayoutEl = document.getElementById('fa-header-payout');
    if (headerPayoutEl) {
      headerPayoutEl.textContent = formatMoney(totalTraderPayout > 0 ? totalTraderPayout : (activeAcc && activeAcc.profit > 0 ? activeAcc.profit * 0.80 : 0));
    }

    const countBadgeEl = document.getElementById('fa-account-count-badge');
    if (countBadgeEl) {
      countBadgeEl.textContent = accounts.length + ' ' + (accounts.length === 1 ? 'Account' : 'Accounts');
    }

    // 2. Render Tabs
    const tabsContainer = document.getElementById('fa-tabs-container');
    if (tabsContainer) {
      tabsContainer.innerHTML = accounts.map((acc, index) => {
        const isActive = index === activeIdx;
        const typeLabel = acc.type === 'instant' ? 'Instant' : (acc.type === '1-step' ? '1-Step' : (acc.type === '2-step' ? '2-Step' : '3-Step'));
        const stageLabel = acc.stage === 'real' ? 'Real' : 'Demo';

        return `
          <button type="button" data-account-idx="${index}" class="fa-tab-btn shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
            isActive
              ? 'bg-muted text-foreground border-border font-semibold shadow-xs ring-1 ring-border'
              : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/40 hover:text-foreground'
          }">
            <span class="size-1.5 rounded-full ${acc.stage === 'real' ? 'bg-emerald-500' : 'bg-primary'}"></span>
            <span>${escapeHTML(acc.name)}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded ${acc.stage === 'real' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted-foreground/10 text-muted-foreground border border-border/40'}">${typeLabel} • ${stageLabel}</span>
          </button>
        `;
      }).join('');

      tabsContainer.querySelectorAll('.fa-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-account-idx'), 10);
          setActiveIndex(idx);
          renderFundedAccounts();
        });
      });
    }

    // 3. Render Active Account Metrics
    if (activeAcc) {
      const balance = activeAcc.balance || 0;
      const profit = activeAcc.profit || 0;
      const equity = balance + profit;
      const profitPct = balance > 0 ? ((profit / balance) * 100).toFixed(2) : '0.00';

      // 80% Payout = Profit - 20% Firm Share
      const traderPayout = profit > 0 ? (profit * 0.80) : 0;
      const firmShare = profit > 0 ? (profit * 0.20) : 0;

      const metricEquity = document.getElementById('fa-metric-equity');
      if (metricEquity) metricEquity.textContent = formatMoney(equity);

      const metricBalance = document.getElementById('fa-metric-balance');
      if (metricBalance) metricBalance.textContent = 'Initial Balance: ' + formatMoney(balance);

      const metricProfit = document.getElementById('fa-metric-profit');
      if (metricProfit) {
        metricProfit.textContent = (profit >= 0 ? '+' : '') + formatMoney(profit);
        metricProfit.className = 'text-xl font-bold tracking-tight ' + (profit >= 0 ? 'text-emerald-500' : 'text-rose-500');
      }

      const metricProfitPct = document.getElementById('fa-metric-profit-pct');
      if (metricProfitPct) {
        metricProfitPct.textContent = (profit >= 0 ? '+' : '') + profitPct + '% Return';
      }

      const metricPayout = document.getElementById('fa-metric-payout');
      if (metricPayout) metricPayout.textContent = formatMoney(traderPayout);

      const metricFirmShare = document.getElementById('fa-metric-firm-share');
      if (metricFirmShare) metricFirmShare.textContent = 'Firm Share (20%): ' + formatMoney(firmShare);

      const metricStatus = document.getElementById('fa-metric-status');
      if (metricStatus) {
        if (activeAcc.stage === 'real') {
          metricStatus.innerHTML = '<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span> Real Funded';
        } else {
          const stepNum = activeAcc.stage.replace('step-', '');
          metricStatus.innerHTML = `<span class="size-2 rounded-full bg-primary"></span> Stage ${stepNum} Demo`;
        }
      }

      const metricEvalType = document.getElementById('fa-metric-eval-type');
      if (metricEvalType) {
        const evalLabels = {
          'instant': 'Instant Funded Evaluation (Direct Real)',
          '1-step': '1-Step Evaluation (1 Demo Phase)',
          '2-step': '2-Step Evaluation (2 Demo Phases)',
          '3-step': '3-Step Evaluation (3 Demo Phases)'
        };
        metricEvalType.textContent = evalLabels[activeAcc.type] || 'Funded Evaluation';
      }

      renderJourney(activeAcc);
    }
  }

  function renderJourney(acc) {
    const container = document.getElementById('fa-journey-steps');
    const descEl = document.getElementById('fa-stage-desc');
    if (!container) return;

    let steps = [];
    if (acc.type === 'instant') {
      if (descEl) descEl.textContent = 'Direct Real Account (No Demo Challenge Steps)';
      steps = [
        {
          name: 'Direct Real Funded Account',
          sub: 'Active • 80% Profit Split From Day 1',
          state: 'active-real'
        }
      ];
    } else if (acc.type === '1-step') {
      const isReal = acc.stage === 'real';
      if (descEl) descEl.textContent = isReal ? 'Evaluation Complete • Real Account Active' : 'Step 1 Demo Active';
      steps = [
        {
          name: 'Step 1: Demo Goal',
          sub: isReal ? 'Passed (Profit Target Achieved)' : 'In Progress (Profit Target: 10%)',
          state: isReal ? 'completed' : 'active'
        },
        {
          name: 'Real Funded Account',
          sub: isReal ? 'Active • 80% Profit Split' : 'Unlocks on Target Completion',
          state: isReal ? 'active-real' : 'locked'
        }
      ];
    } else if (acc.type === '2-step') {
      const isStep1 = acc.stage === 'step-1';
      const isStep2 = acc.stage === 'step-2';
      const isReal = acc.stage === 'real';
      if (descEl) descEl.textContent = isReal ? 'All Phases Passed • Real Account Active' : (isStep2 ? 'Step 1 Passed • Step 2 Demo Active' : 'Step 1 Demo Active');

      steps = [
        {
          name: 'Step 1: Demo Goal',
          sub: isStep1 ? 'In Progress (Target: 8%)' : 'Passed (Phase 1)',
          state: isStep1 ? 'active' : 'completed'
        },
        {
          name: 'Step 2: Demo Goal',
          sub: isStep1 ? 'Locked (Phase 2)' : (isStep2 ? 'In Progress (Target: 5%)' : 'Passed (Phase 2)'),
          state: isStep1 ? 'locked' : (isStep2 ? 'active' : 'completed')
        },
        {
          name: 'Real Funded Account',
          sub: isReal ? 'Active • 80% Profit Split' : 'Unlocks After Step 2',
          state: isReal ? 'active-real' : 'locked'
        }
      ];
    } else if (acc.type === '3-step') {
      const isStep1 = acc.stage === 'step-1';
      const isStep2 = acc.stage === 'step-2';
      const isStep3 = acc.stage === 'step-3';
      const isReal = acc.stage === 'real';
      if (descEl) descEl.textContent = isReal ? 'All 3 Steps Passed • Real Account Active' : `Step ${acc.stage.replace('step-', '')} Demo Active`;

      steps = [
        {
          name: 'Step 1: Demo Goal',
          sub: isStep1 ? 'In Progress' : 'Passed',
          state: isStep1 ? 'active' : 'completed'
        },
        {
          name: 'Step 2: Demo Goal',
          sub: isStep1 ? 'Locked' : (isStep2 ? 'In Progress' : 'Passed'),
          state: isStep1 ? 'locked' : (isStep2 ? 'active' : 'completed')
        },
        {
          name: 'Step 3: Demo Goal',
          sub: (isStep1 || isStep2) ? 'Locked' : (isStep3 ? 'In Progress' : 'Passed'),
          state: (isStep1 || isStep2) ? 'locked' : (isStep3 ? 'active' : 'completed')
        },
        {
          name: 'Real Funded Account',
          sub: isReal ? 'Active • 80% Profit Split' : 'Unlocks After Step 3',
          state: isReal ? 'active-real' : 'locked'
        }
      ];
    }

    container.innerHTML = steps.map((step, idx) => {
      let badgeStyle = 'border-border/60 bg-background text-muted-foreground opacity-60';
      let icon = `<span class="size-4 rounded-full border border-border flex items-center justify-center text-[10px]">${idx + 1}</span>`;

      if (step.state === 'completed') {
        badgeStyle = 'border-primary/40 bg-primary/10 text-primary font-medium';
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else if (step.state === 'active') {
        badgeStyle = 'border-primary bg-primary/15 text-foreground font-semibold ring-1 ring-primary/40';
        icon = `<span class="size-2 rounded-full bg-primary animate-ping"></span>`;
      } else if (step.state === 'active-real') {
        badgeStyle = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-semibold ring-1 ring-emerald-500/30';
        icon = `<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>`;
      }

      const connector = idx < steps.length - 1
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right text-muted-foreground/40 shrink-0"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`
        : '';

      return `
        <div class="flex items-center gap-2 shrink-0">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${badgeStyle}">
            ${icon}
            <div class="flex flex-col">
              <span class="font-medium">${escapeHTML(step.name)}</span>
              <span class="text-[10px] text-muted-foreground">${escapeHTML(step.sub)}</span>
            </div>
          </div>
          ${connector}
        </div>
      `;
    }).join('');
  }

  function bindModalEvents() {
    const modal = document.getElementById('fa-add-modal');
    const openBtn = document.getElementById('fa-open-add-modal-btn');
    const closeBtn = document.getElementById('fa-close-modal-btn');
    const cancelBtn = document.getElementById('fa-cancel-modal-btn');
    const form = document.getElementById('fa-add-form');

    if (!modal) return;

    function openModal() {
      modal.classList.remove('hidden');
      updateModalPreview();
    }

    function closeModal() {
      modal.classList.add('hidden');
    }

    if (openBtn) openBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const profitInput = document.getElementById('fa-input-profit');
    const typeSelect = document.getElementById('fa-input-type');
    const stageSelect = document.getElementById('fa-input-stage');

    function updateModalPreview() {
      const profit = parseFloat(profitInput?.value || 0);
      const previewEl = document.getElementById('fa-modal-payout-preview');
      if (previewEl) {
        const payout = profit > 0 ? (profit * 0.80) : 0;
        previewEl.textContent = formatMoney(payout);
      }

      if (typeSelect && stageSelect) {
        if (typeSelect.value === 'instant') {
          stageSelect.value = 'real';
        }
      }
    }

    if (profitInput) profitInput.oninput = updateModalPreview;
    if (typeSelect) typeSelect.onchange = updateModalPreview;

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('fa-input-name')?.value?.trim() || 'Funded Account';
        const type = document.getElementById('fa-input-type')?.value || 'instant';
        const stage = document.getElementById('fa-input-stage')?.value || 'real';
        const balance = parseFloat(document.getElementById('fa-input-balance')?.value || 5000);
        const profit = parseFloat(document.getElementById('fa-input-profit')?.value || 0);

        const newAccount = {
          id: 'acc_' + Date.now(),
          name,
          type,
          stage,
          balance,
          profit,
          targetPct: 10
        };

        const accounts = getAccounts();
        accounts.push(newAccount);
        saveAccounts(accounts);
        setActiveIndex(accounts.length - 1);
        closeModal();
        renderFundedAccounts();
      };
    }

    const deleteBtn = document.getElementById('fa-delete-account-btn');
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        const accounts = getAccounts();
        if (accounts.length <= 1) {
          alert('You must keep at least one funded account in the overview.');
          return;
        }
        const activeIdx = getActiveIndex(accounts.length);
        if (confirm(`Remove account "${accounts[activeIdx]?.name}"?`)) {
          accounts.splice(activeIdx, 1);
          saveAccounts(accounts);
          setActiveIndex(Math.max(0, activeIdx - 1));
          renderFundedAccounts();
        }
      };
    }
  }

  // Setup Observer & Auto-Mount
  function init() {
    mountFundedAccountsCard();

    // Observe DOM mutations to re-mount if React re-hydrates or changes the card
    try {
      const observer = new MutationObserver(() => {
        const card = document.getElementById('funded-accounts-card');
        const needsMount = !card || !card.querySelector('#fa-tabs-container') || card.textContent.includes('Current Year') || card.textContent.includes('1,170,273');
        if (needsMount) {
          mountFundedAccountsCard();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}

    // Fallback polling for hydration timing
    [40, 100, 250, 500, 1000, 2000, 4000].forEach(delay => {
      setTimeout(mountFundedAccountsCard, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.renderFundedAccounts = renderFundedAccounts;
  window.mountFundedAccountsCard = mountFundedAccountsCard;
})();
