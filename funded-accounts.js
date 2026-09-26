/**
 * VETERIAN-FX FUNDED ACCOUNTS CONTROLLER
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

  // Seeded accounts illustrating all 4 evaluation models requested
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

  function renderFundedAccounts() {
    const card = document.getElementById('funded-accounts-card');
    if (!card) return;

    const accounts = getAccounts();
    const activeIdx = getActiveIndex(accounts.length);
    const activeAcc = accounts[activeIdx] || accounts[0];

    // 1. Total Net Payout across all real funded accounts
    let totalTraderPayout = 0;
    accounts.forEach(acc => {
      if (acc.stage === 'real' && acc.profit > 0) {
        totalTraderPayout += acc.profit * 0.80;
      }
    });

    const headerPayoutEl = document.getElementById('fa-header-payout');
    if (headerPayoutEl) {
      headerPayoutEl.textContent = formatMoney(totalTraderPayout > 0 ? totalTraderPayout : (activeAcc.profit > 0 ? activeAcc.profit * 0.80 : 0));
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

      // Payout Calculation: Profit - 20% Firm Share = Profit * 0.80
      const traderPayout = profit > 0 ? (profit * 0.80) : 0;
      const firmShare = profit > 0 ? (profit * 0.20) : 0;

      // Metric 1: Equity
      const metricEquity = document.getElementById('fa-metric-equity');
      if (metricEquity) metricEquity.textContent = formatMoney(equity);

      const metricBalance = document.getElementById('fa-metric-balance');
      if (metricBalance) metricBalance.textContent = 'Initial Balance: ' + formatMoney(balance);

      // Metric 2: Current Profit
      const metricProfit = document.getElementById('fa-metric-profit');
      if (metricProfit) {
        metricProfit.textContent = (profit >= 0 ? '+' : '') + formatMoney(profit);
        metricProfit.className = 'text-xl font-bold tracking-tight ' + (profit >= 0 ? 'text-emerald-500' : 'text-rose-500');
      }

      const metricProfitPct = document.getElementById('fa-metric-profit-pct');
      if (metricProfitPct) {
        metricProfitPct.textContent = (profit >= 0 ? '+' : '') + profitPct + '% Return';
      }

      // Metric 3: Trader Net Payout (80%)
      const metricPayout = document.getElementById('fa-metric-payout');
      if (metricPayout) metricPayout.textContent = formatMoney(traderPayout);

      const metricFirmShare = document.getElementById('fa-metric-firm-share');
      if (metricFirmShare) metricFirmShare.textContent = 'Firm Share (20%): ' + formatMoney(firmShare);

      // Metric 4: Account Status
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

      // 4. Render Step Progression / Evaluation Path
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

  function initModalAndActions() {
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

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

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

    if (profitInput) profitInput.addEventListener('input', updateModalPreview);
    if (typeSelect) typeSelect.addEventListener('change', updateModalPreview);

    if (form) {
      form.addEventListener('submit', (e) => {
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
      });
    }

    const deleteBtn = document.getElementById('fa-delete-account-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
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
      });
    }
  }

  // Initialize
  function setup() {
    renderFundedAccounts();
    initModalAndActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // Also expose globally if needed
  window.renderFundedAccounts = renderFundedAccounts;
})();
