// ===== Categories =====
const CATEGORIES = {
    expense: [
        { value: 'food', label: 'Food & Dining', emoji: '🍕' },
        { value: 'groceries', label: 'Groceries', emoji: '🛒' },
        { value: 'transport', label: 'Transport', emoji: '🚗' },
        { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
        { value: 'bills', label: 'Bills & Utilities', emoji: '💡' },
        { value: 'health', label: 'Health', emoji: '🏥' },
        { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
        { value: 'education', label: 'Education', emoji: '📚' },
        { value: 'rent', label: 'Rent', emoji: '🏠' },
        { value: 'travel', label: 'Travel', emoji: '✈️' },
        { value: 'subscriptions', label: 'Subscriptions', emoji: '📱' },
        { value: 'personal', label: 'Personal Care', emoji: '💇' },
        { value: 'gifts', label: 'Gifts', emoji: '🎁' },
        { value: 'other_expense', label: 'Other', emoji: '📦' }
    ],
    income: [
        { value: 'salary', label: 'Salary', emoji: '💰' },
        { value: 'freelance', label: 'Freelance', emoji: '💻' },
        { value: 'investment', label: 'Investment', emoji: '📈' },
        { value: 'business', label: 'Business', emoji: '🏢' },
        { value: 'rental', label: 'Rental Income', emoji: '🏘️' },
        { value: 'refund', label: 'Refund', emoji: '↩️' },
        { value: 'other_income', label: 'Other', emoji: '💵' }
    ]
};

const CATEGORY_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4','#84cc16','#e11d48','#a855f7','#22c55e'];

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
const CURRENCY_RATES = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095 };

// ===== State =====
let transactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
let budgets = JSON.parse(localStorage.getItem('fintrack_budgets') || '[]');
let goals = JSON.parse(localStorage.getItem('fintrack_goals') || '[]');
let recurring = JSON.parse(localStorage.getItem('fintrack_recurring') || '[]');
let currency = localStorage.getItem('fintrack_currency') || 'INR';
let currentType = 'expense';
let editingId = null;
let deleteId = null;
let lastDeleted = null;
let quickCategory = null;
let quickType = 'expense';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    processRecurring();
    initTheme();
    initNavigation();
    initModal();
    initDailyView();
    initMonthlyView();
    initFilters();
    initBudgets();
    initGoals();
    initRecurring();
    initSettings();
    initFAB();
    initSplitToggle();
    setDashboardDate();
    setGreeting();
    setCurrency(currency);
    renderAll();
});

// ===== Helpers =====
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function today() { return new Date().toISOString().split('T')[0]; }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function getCategoryLabel(type, val) { return CATEGORIES[type]?.find(c => c.value === val)?.label || val; }
function getCategoryEmoji(type, val) { return CATEGORIES[type]?.find(c => c.value === val)?.emoji || '📦'; }

function formatCurrency(amount) {
    const sym = CURRENCY_SYMBOLS[currency];
    const converted = amount * (CURRENCY_RATES[currency] / CURRENCY_RATES.INR);
    return sym + Math.round(converted).toLocaleString('en-IN');
}

function formatDate(ds) { return new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }

function getMonthTx(y, m) { return transactions.filter(t => { const d = new Date(t.date + 'T00:00:00'); return d.getFullYear() === y && d.getMonth() === m; }); }
function getDayTx(ds) { return transactions.filter(t => t.date === ds); }

function animateCounter(el, target, prefix, suffix) {
    if (!el) return;
    prefix = prefix ?? CURRENCY_SYMBOLS[currency];
    suffix = suffix ?? '';
    const dur = 800, start = performance.now();
    function upd(now) {
        const p = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        const v = Math.round(target * e);
        if (suffix === '%') el.textContent = v + '%';
        else {
            const conv = Math.round(v * (CURRENCY_RATES[currency] / CURRENCY_RATES.INR));
            el.textContent = prefix + conv.toLocaleString('en-IN');
        }
        if (p < 1) requestAnimationFrame(upd);
    }
    requestAnimationFrame(upd);
}

// ===== Toast =====
function showToast(msg, type = 'success', undoFn = null) {
    const c = $('#toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${undoFn ? 'undo' : type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', undo: '↩' };
    t.innerHTML = `${icons[undoFn ? 'undo' : type] || ''} ${msg}`;
    if (undoFn) {
        const btn = document.createElement('button');
        btn.className = 'undo-btn';
        btn.textContent = 'Undo';
        btn.onclick = (e) => { e.stopPropagation(); undoFn(); t.remove(); };
        t.appendChild(btn);
    }
    c.appendChild(t);
    setTimeout(() => t.remove(), undoFn ? 5000 : 3000);
}

// ===== Confetti =====
function fireConfetti() {
    const canvas = $('#confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = [];
    const colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444'];
    for (let i = 0; i < 100; i++) {
        pieces.push({ x: Math.random() * canvas.width, y: -20, r: Math.random() * 6 + 4, color: colors[Math.floor(Math.random() * colors.length)], vx: (Math.random() - 0.5) * 8, vy: Math.random() * 4 + 3, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 10 });
    }
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.rot += p.vr;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
            ctx.restore();
        });
        frame++;
        if (frame < 120) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
}

// ===== Greeting =====
function setGreeting() {
    const h = new Date().getHours();
    const el = $('#greeting');
    if (el) el.textContent = (h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening') + ' 👋';
}

function setDashboardDate() {
    $('#dashboardDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== Theme =====
function initTheme() {
    if (localStorage.getItem('fintrack_theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    $('#themeToggle').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('fintrack_theme', isDark ? 'light' : 'dark');
        renderAll();
    });
}

// ===== Currency =====
function setCurrency(c) {
    currency = c;
    localStorage.setItem('fintrack_currency', c);
    if ($('#currencySelect')) $('#currencySelect').value = c;
    if ($('#settingsCurrency')) $('#settingsCurrency').value = c;
    if ($('#amountPrefix')) $('#amountPrefix').textContent = CURRENCY_SYMBOLS[c];
}

// ===== Navigation =====
function initNavigation() {
    $$('.nav-item').forEach(i => i.addEventListener('click', e => { e.preventDefault(); navigateTo(i.dataset.page); }));
    $$('.view-all').forEach(l => l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.dataset.page); }));
    $('#menuBtn').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#sidebarOverlay').classList.add('active'); });
    $('#sidebarOverlay').addEventListener('click', closeSidebar);
    $('#addBtnMobile').addEventListener('click', openModal);
    $$('.nav-item').forEach(i => i.addEventListener('click', closeSidebar));
    $('#currencySelect')?.addEventListener('change', e => { setCurrency(e.target.value); renderAll(); });
    $('#settingsCurrency')?.addEventListener('change', e => { setCurrency(e.target.value); renderAll(); });
}

function closeSidebar() { $('#sidebar').classList.remove('open'); $('#sidebarOverlay').classList.remove('active'); }

function navigateTo(page) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $(`#page-${page}`).classList.add('active');
    $(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    if (page === 'daily') renderDailyView();
    if (page === 'monthly') renderMonthlyView();
    if (page === 'transactions') renderAllTransactions();
    if (page === 'dashboard') renderAll();
    if (page === 'budgets') renderBudgets();
    if (page === 'goals') renderGoals();
    if (page === 'settings') renderSettings();
    $$(`#page-${page} .animate-in`).forEach(el => { el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; });
}

// ===== Modal =====
function initModal() {
    $('#addTransactionBtn').addEventListener('click', openModal);
    $('#addTransactionBtn2').addEventListener('click', openModal);
    $('#modalClose').addEventListener('click', closeModal);
    $('#cancelBtn').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    $('#typeExpense').addEventListener('click', () => setType('expense'));
    $('#typeIncome').addEventListener('click', () => setType('income'));
    $('#transactionForm').addEventListener('submit', handleSubmit);
    $('#cancelDelete').addEventListener('click', () => $('#deleteModalOverlay').classList.remove('active'));
    $('#deleteModalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) $('#deleteModalOverlay').classList.remove('active'); });
    $('#confirmDelete').addEventListener('click', handleDelete);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#deleteModalOverlay').classList.remove('active'); } });
}

function openModal(editTx = null) {
    editingId = null;
    $('#transactionForm').reset();
    $('#date').value = today();
    $('#tags').value = '';
    $('#splitToggle').checked = false;
    $('#splitFields').style.display = 'none';
    $('#splitFields').innerHTML = '';
    if (editTx && typeof editTx === 'object' && editTx.id) {
        editingId = editTx.id;
        $('#modalTitle').textContent = 'Edit Transaction';
        setType(editTx.type);
        $('#amount').value = editTx.amount;
        $('#category').value = editTx.category;
        $('#description').value = editTx.description;
        $('#date').value = editTx.date;
        $('#tags').value = (editTx.tags || []).join(', ');
    } else {
        $('#modalTitle').textContent = 'Add Transaction';
        setType('expense');
    }
    $('#modalOverlay').classList.add('active');
    setTimeout(() => $('#amount').focus(), 200);
}

function closeModal() { $('#modalOverlay').classList.remove('active'); editingId = null; }
function setType(t) { currentType = t; $('#typeExpense').classList.toggle('active', t === 'expense'); $('#typeIncome').classList.toggle('active', t === 'income'); populateCategories(t, '#category'); }

function populateCategories(type, sel) {
    const s = $(sel);
    if (!s) return;
    const cv = s.value;
    s.innerHTML = '<option value="">Select category</option>';
    CATEGORIES[type].forEach(c => { const o = document.createElement('option'); o.value = c.value; o.textContent = `${c.emoji} ${c.label}`; s.appendChild(o); });
    s.value = cv;
}

function handleSubmit(e) {
    e.preventDefault();
    const tagsStr = $('#tags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean) : [];

    // Split transaction support
    if ($('#splitToggle').checked) {
        const splits = $$('.split-row');
        splits.forEach(row => {
            const cat = row.querySelector('.split-cat').value;
            const amt = parseFloat(row.querySelector('.split-amt').value);
            if (cat && amt > 0) {
                transactions.push({
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    type: currentType, amount: amt, category: cat,
                    description: ($('#description').value || getCategoryLabel(currentType, cat)) + ' (split)',
                    date: $('#date').value, tags, starred: false, createdAt: Date.now()
                });
            }
        });
        showToast('Split transactions added!', 'success');
    } else {
        const tx = {
            id: editingId || Date.now().toString(36) + Math.random().toString(36).substr(2),
            type: currentType, amount: parseFloat($('#amount').value), category: $('#category').value,
            description: $('#description').value || getCategoryLabel(currentType, $('#category').value),
            date: $('#date').value, tags, starred: editingId ? (transactions.find(t => t.id === editingId)?.starred || false) : false,
            createdAt: editingId ? transactions.find(t => t.id === editingId)?.createdAt : Date.now()
        };
        if (editingId) { const idx = transactions.findIndex(t => t.id === editingId); if (idx !== -1) transactions[idx] = tx; showToast('Transaction updated!'); }
        else { transactions.push(tx); showToast(`${currentType === 'income' ? 'Income' : 'Expense'} added: ${formatCurrency(tx.amount)}`); }
    }
    save('fintrack_transactions', transactions);
    closeModal();
    renderAll();
}

function handleDelete() {
    if (!deleteId) return;
    const deleted = transactions.find(t => t.id === deleteId);
    lastDeleted = deleted;
    transactions = transactions.filter(t => t.id !== deleteId);
    save('fintrack_transactions', transactions);
    renderAll();
    deleteId = null;
    $('#deleteModalOverlay').classList.remove('active');
    showToast('Transaction deleted', 'error', () => {
        if (lastDeleted) { transactions.push(lastDeleted); save('fintrack_transactions', transactions); renderAll(); showToast('Transaction restored!', 'success'); lastDeleted = null; }
    });
}

// ===== Split Toggle =====
function initSplitToggle() {
    $('#splitToggle').addEventListener('change', e => {
        const sf = $('#splitFields');
        if (e.target.checked) {
            sf.style.display = 'block';
            addSplitRow();
            addSplitRow();
        } else { sf.style.display = 'none'; sf.innerHTML = ''; }
    });
}

function addSplitRow() {
    const sf = $('#splitFields');
    const row = document.createElement('div');
    row.className = 'split-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
    row.innerHTML = `<select class="split-cat" style="flex:1;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-family:inherit;" required></select><input class="split-amt" type="number" placeholder="Amount" min="0" step="0.01" style="width:100px;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-family:inherit;" required>`;
    sf.appendChild(row);
    populateCategories(currentType, null);
    const sel = row.querySelector('.split-cat');
    sel.innerHTML = '<option value="">Category</option>';
    CATEGORIES[currentType].forEach(c => { const o = document.createElement('option'); o.value = c.value; o.textContent = `${c.emoji} ${c.label}`; sel.appendChild(o); });
}

// ===== FAB (Quick Add) =====
function initFAB() {
    const btn = $('#fabBtn');
    const menu = $('#fabMenu');
    btn.addEventListener('click', () => { btn.classList.toggle('open'); menu.classList.toggle('open'); });
    $$('.fab-option').forEach(opt => {
        opt.addEventListener('click', () => {
            quickCategory = opt.dataset.quick;
            quickType = opt.dataset.type || 'expense';
            const emoji = getCategoryEmoji(quickType, quickCategory);
            const label = getCategoryLabel(quickType, quickCategory);
            $('#quickAmountTitle').textContent = `${emoji} ${label}`;
            $('#quickAmountOverlay').classList.add('active');
            btn.classList.remove('open');
            menu.classList.remove('open');
            setTimeout(() => $('#quickAmount').focus(), 200);
        });
    });
    $('#quickAmountForm').addEventListener('submit', e => {
        e.preventDefault();
        const amt = parseFloat($('#quickAmount').value);
        if (!amt) return;
        transactions.push({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            type: quickType, amount: amt, category: quickCategory,
            description: $('#quickNote').value || getCategoryLabel(quickType, quickCategory),
            date: today(), tags: [], starred: false, createdAt: Date.now()
        });
        save('fintrack_transactions', transactions);
        $('#quickAmountOverlay').classList.remove('active');
        $('#quickAmountForm').reset();
        showToast(`Quick add: ${formatCurrency(amt)}`);
        renderAll();
    });
}

// ===== Filters =====
function initFilters() {
    $('#searchInput')?.addEventListener('input', renderAllTransactions);
    $('#typeFilter')?.addEventListener('change', renderAllTransactions);
    $('#categoryFilter')?.addEventListener('change', renderAllTransactions);
    $('#tagFilter')?.addEventListener('change', renderAllTransactions);
    $('#starFilter')?.addEventListener('change', renderAllTransactions);
    $('#sortFilter')?.addEventListener('change', renderAllTransactions);
    $('#exportCsvBtn')?.addEventListener('click', exportCSV);
}

// ===== Render All =====
function renderAll() {
    renderDashboard();
    renderAllTransactions();
    const p = $('.page.active');
    if (p?.id === 'page-daily') renderDailyView();
    if (p?.id === 'page-monthly') renderMonthlyView();
    if (p?.id === 'page-budgets') renderBudgets();
    if (p?.id === 'page-goals') renderGoals();
    if (p?.id === 'page-settings') renderSettings();
}

// ===== Dashboard =====
function renderDashboard() {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const mtx = getMonthTx(y, m);
    const income = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = mtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const sr = income > 0 ? Math.round((balance / income) * 100) : 0;
    const mn = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    animateCounter($('#totalIncome'), income);
    animateCounter($('#totalExpenses'), expenses);
    animateCounter($('#netBalance'), balance);
    animateCounter($('#savingsRate'), sr, '', '%');
    $('#incomeMonth').textContent = mn;
    $('#expenseMonth').textContent = mn;
    $('#balanceMonth').textContent = mn;
    $('#savingsMonth').textContent = mn;

    renderBarChart();
    renderDonutChart(mtx);
    renderRecentTransactions();
    renderInsights(mtx, income, expenses, y, m);
    renderPrediction(mtx, expenses, y, m);
    renderBudgetOverview(mtx);
}

// ===== Insights =====
function renderInsights(mtx, income, expenses, y, m) {
    const insights = [];
    // Compare with last month
    const lastMtx = getMonthTx(y, m - 1 < 0 ? y - 1 : y, m - 1 < 0 ? 11 : m - 1);
    const lastExpenses = lastMtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    if (lastExpenses > 0 && expenses > 0) {
        const pctChange = Math.round(((expenses - lastExpenses) / lastExpenses) * 100);
        if (pctChange > 10) insights.push({ icon: '📈', text: `You spent <strong>${pctChange}% more</strong> this month compared to last month.` });
        else if (pctChange < -10) insights.push({ icon: '📉', text: `Great! You spent <strong>${Math.abs(pctChange)}% less</strong> this month compared to last month.` });
    }
    // Top category
    const catTotals = {};
    mtx.filter(t => t.type === 'expense').forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
        const pct = Math.round((topCat[1] / expenses) * 100);
        insights.push({ icon: getCategoryEmoji('expense', topCat[0]), text: `<strong>${getCategoryLabel('expense', topCat[0])}</strong> is your top expense at <strong>${formatCurrency(topCat[1])}</strong> (${pct}% of total).` });
    }
    // Savings
    if (income > 0 && expenses < income) insights.push({ icon: '🎉', text: `You're saving <strong>${formatCurrency(income - expenses)}</strong> this month. Keep it up!` });
    else if (income > 0 && expenses > income) insights.push({ icon: '⚠️', text: `You've overspent by <strong>${formatCurrency(expenses - income)}</strong> this month.` });
    // Daily average
    const dayOfMonth = new Date().getDate();
    if (expenses > 0) insights.push({ icon: '📊', text: `Your daily average spend is <strong>${formatCurrency(Math.round(expenses / dayOfMonth))}</strong>.` });

    if (insights.length === 0) insights.push({ icon: '💡', text: 'Start adding transactions to see smart insights here!' });

    $('#insightsList').innerHTML = insights.map(i => `<div class="insight-item"><span class="insight-icon">${i.icon}</span><span class="insight-text">${i.text}</span></div>`).join('');
}

// ===== Prediction =====
function renderPrediction(mtx, expenses, y, m) {
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dailyAvg = dayOfMonth > 0 ? expenses / dayOfMonth : 0;
    const projected = Math.round(dailyAvg * daysInMonth);
    const remaining = daysInMonth - dayOfMonth;

    const income = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const projectedSavings = income - projected;

    $('#predictionContent').innerHTML = `
        <div class="prediction-item"><div class="prediction-label">Projected Spend</div><div class="prediction-value" style="color:var(--expense-color)">${formatCurrency(projected)}</div></div>
        <div class="prediction-item"><div class="prediction-label">Daily Average</div><div class="prediction-value">${formatCurrency(Math.round(dailyAvg))}</div></div>
        <div class="prediction-item"><div class="prediction-label">Days Left</div><div class="prediction-value">${remaining}</div></div>
        <div class="prediction-item"><div class="prediction-label">Est. Savings</div><div class="prediction-value" style="color:${projectedSavings >= 0 ? 'var(--income-color)' : 'var(--expense-color)'}">${formatCurrency(projectedSavings)}</div></div>
    `;
}

// ===== Budget Overview on Dashboard =====
function renderBudgetOverview(mtx) {
    if (budgets.length === 0) {
        $('#budgetOverview').innerHTML = '<p style="color:var(--text-secondary);font-size:.9rem;padding:8px 0;">No budgets set. <a href="#" class="view-all" data-page="budgets" onclick="navigateTo(\'budgets\');return false;">Create one</a></p>';
        return;
    }
    let html = '';
    budgets.forEach(b => {
        const spent = mtx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
        const pct = Math.min(Math.round((spent / b.amount) * 100), 100);
        const color = pct >= 100 ? 'var(--expense-color)' : pct >= 75 ? 'var(--savings-color)' : 'var(--income-color)';
        html += `<div class="budget-overview-item"><div class="budget-overview-header"><span class="budget-overview-name">${getCategoryEmoji('expense', b.category)} ${getCategoryLabel('expense', b.category)}</span><span style="color:${color};font-weight:700;">${formatCurrency(spent)} / ${formatCurrency(b.amount)}</span></div><div class="budget-overview-bar"><div class="budget-overview-fill" style="width:${pct}%;background:${color};"></div></div></div>`;
    });
    $('#budgetOverview').innerHTML = html;
}

// ===== Bar Chart =====
function renderBarChart() {
    const now = new Date(), months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const tx = getMonthTx(d.getFullYear(), d.getMonth());
        months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), expense: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) });
    }
    const max = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
    let html = '';
    months.forEach((m, i) => {
        html += `<div class="bar-group"><div class="bars"><div class="bar income-bar" style="height:${(m.income/max)*180}px;animation-delay:${i*.1}s" data-tooltip="${formatCurrency(m.income)}"></div><div class="bar expense-bar" style="height:${(m.expense/max)*180}px;animation-delay:${i*.1+.05}s" data-tooltip="${formatCurrency(m.expense)}"></div></div><span class="bar-label">${m.label}</span></div>`;
    });
    html += `<div class="bar-chart-legend" style="position:absolute;bottom:-8px;left:0;right:0;"><span class="legend-item"><span class="legend-dot" style="background:var(--income-gradient)"></span> Income</span><span class="legend-item"><span class="legend-dot" style="background:var(--expense-gradient)"></span> Expense</span></div>`;
    const c = $('#barChart'); c.style.position = 'relative'; c.innerHTML = html;
}

// ===== Donut Chart =====
function renderDonutChart(mtx) {
    const canvas = $('#donutChart'), ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1;
    canvas.width = 220 * dpr; canvas.height = 220 * dpr; canvas.style.width = '220px'; canvas.style.height = '220px'; ctx.scale(dpr, dpr);
    const exps = mtx.filter(t => t.type === 'expense'), catTotals = {};
    exps.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const cx = 110, cy = 110, r = 85, lw = 24;
    ctx.clearRect(0, 0, 220, 220);
    if (!sorted.length) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(); ctx.lineWidth = lw; ctx.stroke();
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(); ctx.font = '600 13px Inter'; ctx.textAlign = 'center'; ctx.fillText('No expenses', cx, cy);
    } else {
        let sa = -Math.PI / 2;
        sorted.forEach(([, amt], i) => { const sl = (amt / total) * Math.PI * 2 - .04; ctx.beginPath(); ctx.arc(cx, cy, r, sa, sa + sl); ctx.strokeStyle = CATEGORY_COLORS[i % CATEGORY_COLORS.length]; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke(); sa += sl + .04; });
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(); ctx.font = '900 20px Inter'; ctx.textAlign = 'center'; ctx.fillText(formatCurrency(total), cx, cy - 2);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(); ctx.font = '500 11px Inter'; ctx.fillText('Total Spent', cx, cy + 18);
    }
    $('#donutLegend').innerHTML = sorted.map(([cat, amt], i) => `<div class="donut-legend-item"><span class="donut-legend-color" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></span>${getCategoryEmoji('expense', cat)} ${getCategoryLabel('expense', cat)} (${Math.round((amt/total)*100)}%)</div>`).join('');
}

// ===== Recent Transactions =====
function renderRecentTransactions() {
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5);
    if (!sorted.length) { $('#recentTransactions').innerHTML = '<div class="empty-state" style="padding:24px;"><p>No transactions yet</p><span>Click "Add Transaction" to get started</span></div>'; return; }
    $('#recentTransactions').innerHTML = sorted.map(t => txHTML(t)).join('');
    bindTxActions('#recentTransactions');
}

// ===== All Transactions =====
function renderAllTransactions() {
    let f = [...transactions];
    const search = $('#searchInput')?.value?.toLowerCase() || '';
    const tf = $('#typeFilter')?.value || 'all';
    const cf = $('#categoryFilter')?.value || 'all';
    const tgf = $('#tagFilter')?.value || 'all';
    const sf = $('#starFilter')?.value || 'all';
    const sort = $('#sortFilter')?.value || 'newest';
    if (search) f = f.filter(t => t.description.toLowerCase().includes(search) || getCategoryLabel(t.type, t.category).toLowerCase().includes(search) || (t.tags || []).some(tag => tag.includes(search.replace('#', ''))));
    if (tf !== 'all') f = f.filter(t => t.type === tf);
    if (cf !== 'all') f = f.filter(t => t.category === cf);
    if (tgf !== 'all') f = f.filter(t => (t.tags || []).includes(tgf));
    if (sf === 'starred') f = f.filter(t => t.starred);
    switch (sort) { case 'newest': f.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt); break; case 'oldest': f.sort((a, b) => a.date.localeCompare(b.date)); break; case 'highest': f.sort((a, b) => b.amount - a.amount); break; case 'lowest': f.sort((a, b) => a.amount - b.amount); break; }
    if (!f.length) { $('#allTransactions').innerHTML = ''; $('#emptyTransactions').style.display = 'block'; }
    else { $('#emptyTransactions').style.display = 'none'; $('#allTransactions').innerHTML = f.map(t => txHTML(t)).join(''); bindTxActions('#allTransactions'); }
    populateCategoryFilter();
    populateTagFilter();
}

function populateCategoryFilter() {
    const s = $('#categoryFilter'); if (!s) return; const cv = s.value;
    const used = new Set(transactions.map(t => t.category));
    s.innerHTML = '<option value="all">All Categories</option>';
    [...CATEGORIES.expense, ...CATEGORIES.income].forEach(c => { if (used.has(c.value)) { const o = document.createElement('option'); o.value = c.value; o.textContent = `${c.emoji} ${c.label}`; s.appendChild(o); } });
    s.value = cv;
}

function populateTagFilter() {
    const s = $('#tagFilter'); if (!s) return; const cv = s.value;
    const allTags = new Set(); transactions.forEach(t => (t.tags || []).forEach(tag => allTags.add(tag)));
    s.innerHTML = '<option value="all">All Tags</option>';
    [...allTags].sort().forEach(tag => { const o = document.createElement('option'); o.value = tag; o.textContent = '#' + tag; s.appendChild(o); });
    s.value = cv;
}

// ===== Transaction HTML =====
function txHTML(t) {
    const emoji = getCategoryEmoji(t.type, t.category);
    const sign = t.type === 'income' ? '+' : '-';
    const tags = (t.tags || []).map(tag => `<span class="transaction-tag">#${escapeHtml(tag)}</span>`).join('');
    const starClass = t.starred ? 'starred' : '';
    return `<div class="transaction-item" data-id="${t.id}"><div class="transaction-left"><div class="transaction-emoji ${t.type}">${emoji}</div><div class="transaction-details"><span class="transaction-desc">${escapeHtml(t.description)}</span><div class="transaction-meta"><span class="transaction-category">${getCategoryLabel(t.type, t.category)}</span>${tags}</div></div></div><div class="transaction-right"><span class="transaction-amount ${t.type}">${sign}${formatCurrency(t.amount)}</span><span class="transaction-date">${formatDate(t.date)}</span><div class="transaction-actions"><button class="action-btn star-btn ${starClass}" title="Star"><svg width="16" height="16" viewBox="0 0 24 24" fill="${t.starred ? 'var(--savings-color)' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button><button class="action-btn edit-btn" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="action-btn delete delete-btn" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div></div>`;
}

function bindTxActions(sel) {
    const c = $(sel); if (!c) return;
    c.querySelectorAll('.star-btn').forEach(b => b.addEventListener('click', e => {
        const id = e.target.closest('.transaction-item').dataset.id;
        const t = transactions.find(tx => tx.id === id);
        if (t) { t.starred = !t.starred; save('fintrack_transactions', transactions); renderAll(); }
    }));
    c.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', e => { const t = transactions.find(tx => tx.id === e.target.closest('.transaction-item').dataset.id); if (t) openModal(t); }));
    c.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => { deleteId = e.target.closest('.transaction-item').dataset.id; $('#deleteModalOverlay').classList.add('active'); }));
}

// ===== Daily View =====
function initDailyView() {
    $('#dailyDatePicker').value = today();
    $('#dailyDatePicker').addEventListener('change', renderDailyView);
    $('#prevDay').addEventListener('click', () => { const d = new Date($('#dailyDatePicker').value + 'T00:00:00'); d.setDate(d.getDate() - 1); $('#dailyDatePicker').value = d.toISOString().split('T')[0]; renderDailyView(); });
    $('#nextDay').addEventListener('click', () => { const d = new Date($('#dailyDatePicker').value + 'T00:00:00'); d.setDate(d.getDate() + 1); $('#dailyDatePicker').value = d.toISOString().split('T')[0]; renderDailyView(); });
}

function renderDailyView() {
    const ds = $('#dailyDatePicker').value, date = new Date(ds + 'T00:00:00'), dtx = getDayTx(ds);
    $('#dailyDateTitle').textContent = date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const inc = dtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = dtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    animateCounter($('#dailyIncome'), inc); animateCounter($('#dailyExpenses'), exp); animateCounter($('#dailyNet'), inc - exp);
    if (!dtx.length) { $('#dailyTransactions').innerHTML = ''; $('#emptyDaily').style.display = 'block'; }
    else { $('#emptyDaily').style.display = 'none'; $('#dailyTransactions').innerHTML = [...dtx].sort((a, b) => b.createdAt - a.createdAt).map(t => txHTML(t)).join(''); bindTxActions('#dailyTransactions'); }
}

// ===== Monthly View =====
function initMonthlyView() {
    const now = new Date(); $('#monthlyDatePicker').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    $('#monthlyDatePicker').addEventListener('change', renderMonthlyView);
    $('#prevMonth').addEventListener('click', () => { const [y, m] = $('#monthlyDatePicker').value.split('-').map(Number); const d = new Date(y, m - 2, 1); $('#monthlyDatePicker').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; renderMonthlyView(); });
    $('#nextMonth').addEventListener('click', () => { const [y, m] = $('#monthlyDatePicker').value.split('-').map(Number); const d = new Date(y, m, 1); $('#monthlyDatePicker').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; renderMonthlyView(); });
}

function renderMonthlyView() {
    const [y, m] = $('#monthlyDatePicker').value.split('-').map(Number);
    const mtx = getMonthTx(y, m - 1);
    $('#monthlyTitle').textContent = new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const inc = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = mtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    animateCounter($('#monthlyIncome'), inc); animateCounter($('#monthlyExpenses'), exp); animateCounter($('#monthlyNet'), inc - exp);
    renderCalendarHeatmap(y, m - 1); renderMonthlyLineChart(y, m - 1); renderMonthlyCategoryBars(mtx); renderYoY(y, m - 1, exp, inc);
    if (!mtx.length) { $('#monthlyTransactions').innerHTML = ''; $('#emptyMonthly').style.display = 'block'; }
    else { $('#emptyMonthly').style.display = 'none'; $('#monthlyTransactions').innerHTML = [...mtx].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).map(t => txHTML(t)).join(''); bindTxActions('#monthlyTransactions'); }
}

// ===== YoY Comparison =====
function renderYoY(y, m, thisExp, thisInc) {
    const lastYearTx = getMonthTx(y - 1, m);
    const lyExp = lastYearTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const lyInc = lastYearTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expChange = lyExp > 0 ? Math.round(((thisExp - lyExp) / lyExp) * 100) : null;
    const incChange = lyInc > 0 ? Math.round(((thisInc - lyInc) / lyInc) * 100) : null;

    $('#yoyContent').innerHTML = `<div class="yoy-grid">
        <div class="yoy-item"><div class="yoy-label">Last Year Income</div><div class="yoy-value">${formatCurrency(lyInc)}</div>${incChange !== null ? `<div class="yoy-change ${incChange >= 0 ? 'yoy-down' : 'yoy-up'}">${incChange >= 0 ? '↑' : '↓'} ${Math.abs(incChange)}%</div>` : '<div class="yoy-change">N/A</div>'}</div>
        <div class="yoy-item"><div class="yoy-label">Last Year Expenses</div><div class="yoy-value">${formatCurrency(lyExp)}</div>${expChange !== null ? `<div class="yoy-change ${expChange >= 0 ? 'yoy-up' : 'yoy-down'}">${expChange >= 0 ? '↑' : '↓'} ${Math.abs(expChange)}%</div>` : '<div class="yoy-change">N/A</div>'}</div>
        <div class="yoy-item"><div class="yoy-label">Last Year Net</div><div class="yoy-value" style="color:${lyInc - lyExp >= 0 ? 'var(--income-color)' : 'var(--expense-color)'}">${formatCurrency(lyInc - lyExp)}</div></div>
    </div>`;
}

// ===== Calendar/Line/Category (unchanged logic, same render) =====
function renderCalendarHeatmap(y, m) {
    const dim = new Date(y, m + 1, 0).getDate(), fd = new Date(y, m, 1).getDay(), de = {};
    transactions.filter(t => { const d = new Date(t.date + 'T00:00:00'); return d.getFullYear() === y && d.getMonth() === m && t.type === 'expense'; }).forEach(t => { const d = new Date(t.date + 'T00:00:00').getDate(); de[d] = (de[d] || 0) + t.amount; });
    const mx = Math.max(...Object.values(de), 1);
    let h = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="heatmap-header">${d}</div>`).join('');
    for (let i = 0; i < fd; i++) h += '<div class="heatmap-cell empty"></div>';
    for (let d = 1; d <= dim; d++) { const e = de[d] || 0, r = e / mx; let l = 0; if (e > 0) { if (r <= .25) l = 1; else if (r <= .5) l = 2; else if (r <= .75) l = 3; else l = 4; } const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; h += `<div class="heatmap-cell level-${l}" data-date="${ds}" title="${formatDate(ds)}: ${formatCurrency(e)}"><span class="heatmap-day">${d}</span>${e > 0 ? `<span class="heatmap-amount">${formatCurrency(e)}</span>` : ''}</div>`; }
    $('#calendarHeatmap').innerHTML = h;
    $$('.heatmap-cell:not(.empty)').forEach(c => c.addEventListener('click', () => { $('#dailyDatePicker').value = c.dataset.date; navigateTo('daily'); }));
}

function renderMonthlyLineChart(y, m) {
    const dim = new Date(y, m + 1, 0).getDate(), c = $('#monthlyLineChart'), de = [];
    for (let d = 1; d <= dim; d++) { const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; de.push(getDayTx(ds).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)); }
    const mx = Math.max(...de, 1), w = 100, h = 100, p = 5;
    const pts = de.map((v, i) => `${p + (i / (dim - 1)) * (w - p * 2)},${h - p - (v / mx) * (h - p * 2)}`);
    const area = [...pts, `${p + 1 * (w - p * 2)},${h - p}`, `${p},${h - p}`];
    const col = getComputedStyle(document.documentElement).getPropertyValue('--expense-color').trim();
    c.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:100%"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity=".25"/><stop offset="100%" stop-color="${col}" stop-opacity=".02"/></linearGradient></defs><polygon points="${area.join(' ')}" fill="url(#lg)"/><polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 4px rgba(239,68,68,.3))"/></svg>`;
}

function renderMonthlyCategoryBars(mtx) {
    const ct = {}; mtx.filter(t => t.type === 'expense').forEach(t => { ct[t.category] = (ct[t.category] || 0) + t.amount; });
    const sorted = Object.entries(ct).sort((a, b) => b[1] - a[1]); const mx = sorted[0]?.[1] || 1;
    if (!sorted.length) { $('#monthlyCategoryBars').innerHTML = '<div class="empty-state" style="padding:24px;"><p>No expenses this month</p></div>'; return; }
    $('#monthlyCategoryBars').innerHTML = sorted.map(([c, a], i) => `<div class="category-bar-item"><div class="category-bar-header"><span class="category-bar-name"><span class="category-emoji">${getCategoryEmoji('expense', c)}</span> ${getCategoryLabel('expense', c)}</span><span class="category-bar-amount">${formatCurrency(a)}</span></div><div class="category-bar-track"><div class="category-bar-fill" style="width:${(a/mx)*100}%;background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></div></div></div>`).join('');
}

// ===== Budgets =====
function initBudgets() {
    $('#addBudgetBtn').addEventListener('click', () => { populateCategories('expense', '#budgetCategory'); $('#budgetModalOverlay').classList.add('active'); });
    $('#budgetForm').addEventListener('submit', e => {
        e.preventDefault();
        budgets.push({ id: Date.now().toString(36), category: $('#budgetCategory').value, amount: parseFloat($('#budgetAmount').value) });
        save('fintrack_budgets', budgets);
        $('#budgetModalOverlay').classList.remove('active');
        $('#budgetForm').reset();
        showToast('Budget created!');
        renderBudgets(); renderAll();
    });
}

function renderBudgets() {
    if (!budgets.length) { $('#budgetsList').innerHTML = ''; $('#emptyBudgets').style.display = 'block'; return; }
    $('#emptyBudgets').style.display = 'none';
    const now = new Date(), mtx = getMonthTx(now.getFullYear(), now.getMonth());
    $('#budgetsList').innerHTML = budgets.map(b => {
        const spent = mtx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
        const pct = Math.min(Math.round((spent / b.amount) * 100), 100);
        const color = pct >= 100 ? 'var(--expense-color)' : pct >= 75 ? 'var(--savings-color)' : 'var(--income-color)';
        const status = pct >= 100 ? 'over' : pct >= 75 ? 'warning' : 'safe';
        const statusText = pct >= 100 ? `Over budget by ${formatCurrency(spent - b.amount)}!` : `${formatCurrency(b.amount - spent)} remaining`;
        return `<div class="budget-card"><div class="budget-header"><span class="budget-name">${getCategoryEmoji('expense', b.category)} ${getCategoryLabel('expense', b.category)}</span><button class="budget-delete" onclick="deleteBudget('${b.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div><div class="budget-amounts"><span>${formatCurrency(spent)} spent</span><strong>${formatCurrency(b.amount)} limit</strong></div><div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div></div><div class="budget-status ${status}">${statusText} (${pct}%)</div></div>`;
    }).join('');
}

function deleteBudget(id) { budgets = budgets.filter(b => b.id !== id); save('fintrack_budgets', budgets); renderBudgets(); renderAll(); showToast('Budget deleted', 'error'); }

// ===== Goals =====
function initGoals() {
    $('#addGoalBtn').addEventListener('click', () => { $('#goalModalOverlay').classList.add('active'); });
    $('#goalForm').addEventListener('submit', e => {
        e.preventDefault();
        const g = { id: Date.now().toString(36), name: $('#goalName').value, target: parseFloat($('#goalTarget').value), saved: parseFloat($('#goalSaved').value) || 0, deadline: $('#goalDeadline').value || null };
        goals.push(g);
        save('fintrack_goals', goals);
        $('#goalModalOverlay').classList.remove('active');
        $('#goalForm').reset();
        showToast('Goal created!');
        if (g.saved >= g.target) fireConfetti();
        renderGoals();
    });
}

function renderGoals() {
    if (!goals.length) { $('#goalsList').innerHTML = ''; $('#emptyGoals').style.display = 'block'; return; }
    $('#emptyGoals').style.display = 'none';
    $('#goalsList').innerHTML = goals.map(g => {
        const pct = Math.min(Math.round((g.saved / g.target) * 100), 100);
        const circumference = 2 * Math.PI * 28;
        const offset = circumference - (pct / 100) * circumference;
        const color = pct >= 100 ? 'var(--income-color)' : 'var(--accent)';
        const deadlineStr = g.deadline ? `Deadline: ${new Date(g.deadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
        return `<div class="goal-card"><div class="goal-header"><span class="goal-name">🎯 ${escapeHtml(g.name)}</span><button class="budget-delete" onclick="deleteGoal('${g.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="goal-progress-ring"><svg width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="28" fill="none" stroke="var(--bg-primary)" stroke-width="6"/><circle cx="35" cy="35" r="28" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition:stroke-dashoffset .8s cubic-bezier(.34,1.56,.64,1)"/><text x="35" y="38" text-anchor="middle" font-size="14" font-weight="800" fill="var(--text-primary)">${pct}%</text></svg></div><div class="goal-info"><div class="goal-saved">${formatCurrency(g.saved)}</div><div class="goal-target">of ${formatCurrency(g.target)}</div>${deadlineStr ? `<div class="goal-deadline">${deadlineStr}</div>` : ''}</div><div class="goal-actions"><button style="background:var(--income-bg);color:var(--income-color);" onclick="addToGoal('${g.id}')">+ Add Savings</button><button style="background:var(--bg-primary);color:var(--text-primary);" onclick="removeFromGoal('${g.id}')">- Withdraw</button></div></div>`;
    }).join('');
}

function addToGoal(id) {
    const amt = prompt('Amount to add:');
    if (amt && !isNaN(amt) && Number(amt) > 0) {
        const g = goals.find(g => g.id === id);
        if (g) { g.saved += Number(amt); save('fintrack_goals', goals); renderGoals(); showToast(`Added ${formatCurrency(Number(amt))} to ${g.name}`);
            if (g.saved >= g.target) { fireConfetti(); showToast(`🎉 Goal "${g.name}" reached!`, 'success'); }
        }
    }
}

function removeFromGoal(id) {
    const amt = prompt('Amount to withdraw:');
    if (amt && !isNaN(amt) && Number(amt) > 0) { const g = goals.find(g => g.id === id); if (g) { g.saved = Math.max(0, g.saved - Number(amt)); save('fintrack_goals', goals); renderGoals(); showToast(`Withdrew ${formatCurrency(Number(amt))}`); } }
}

function deleteGoal(id) { goals = goals.filter(g => g.id !== id); save('fintrack_goals', goals); renderGoals(); showToast('Goal deleted', 'error'); }

// ===== Recurring Transactions =====
function initRecurring() {
    $('#addRecurringBtn').addEventListener('click', () => {
        populateCategories('expense', '#recurringCategory');
        $('#recurringModalOverlay').classList.add('active');
    });
    $('#recurringType').addEventListener('change', e => populateCategories(e.target.value, '#recurringCategory'));
    $('#recurringForm').addEventListener('submit', e => {
        e.preventDefault();
        recurring.push({ id: Date.now().toString(36), type: $('#recurringType').value, category: $('#recurringCategory').value, amount: parseFloat($('#recurringAmount').value), description: $('#recurringDesc').value, day: parseInt($('#recurringDay').value), lastProcessed: null });
        save('fintrack_recurring', recurring);
        $('#recurringModalOverlay').classList.remove('active');
        $('#recurringForm').reset();
        showToast('Recurring transaction added!');
        renderSettings();
    });
}

function processRecurring() {
    const now = new Date(), todayStr = today(), currentDay = now.getDate(), currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let added = 0;
    recurring.forEach(r => {
        if (r.lastProcessed === currentMonth) return;
        if (currentDay >= r.day) {
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`;
            const exists = transactions.some(t => t.description?.includes('(recurring)') && t.category === r.category && t.date === dateStr);
            if (!exists) {
                transactions.push({ id: Date.now().toString(36) + Math.random().toString(36).substr(2), type: r.type, amount: r.amount, category: r.category, description: (r.description || getCategoryLabel(r.type, r.category)) + ' (recurring)', date: dateStr, tags: ['recurring'], starred: false, createdAt: Date.now() });
                r.lastProcessed = currentMonth;
                added++;
            }
        }
    });
    if (added > 0) { save('fintrack_transactions', transactions); save('fintrack_recurring', recurring); }
}

// ===== Settings =====
function initSettings() {
    $('#exportJsonBtn').addEventListener('click', exportJSON);
    $('#importJsonBtn').addEventListener('click', () => $('#importFileInput').click());
    $('#importFileInput').addEventListener('change', importJSON);
    $('#clearDataBtn').addEventListener('click', clearAllData);
}

function renderSettings() {
    if (!recurring.length) { $('#recurringList').innerHTML = ''; $('#emptyRecurring').style.display = 'block'; return; }
    $('#emptyRecurring').style.display = 'none';
    $('#recurringList').innerHTML = recurring.map(r => `<div class="recurring-item"><div class="recurring-info"><span class="recurring-emoji">${getCategoryEmoji(r.type, r.category)}</span><div><strong>${r.description || getCategoryLabel(r.type, r.category)}</strong><br><span style="font-size:.8rem;color:var(--text-secondary);">${formatCurrency(r.amount)} &middot; Day ${r.day} &middot; ${r.type}</span></div></div><button class="budget-delete" onclick="deleteRecurring('${r.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`).join('');
}

function deleteRecurring(id) { recurring = recurring.filter(r => r.id !== id); save('fintrack_recurring', recurring); renderSettings(); showToast('Recurring transaction removed', 'error'); }

// ===== Export CSV =====
function exportCSV() {
    let csv = 'Date,Type,Category,Description,Amount,Tags,Starred\n';
    transactions.forEach(t => { csv += `${t.date},${t.type},"${getCategoryLabel(t.type, t.category)}","${t.description}",${t.amount},"${(t.tags||[]).join(';')}",${t.starred ? 'Yes' : 'No'}\n`; });
    downloadFile(csv, 'fintrack_transactions.csv', 'text/csv');
    showToast('CSV exported!', 'info');
}

// ===== Export/Import JSON =====
function exportJSON() {
    const data = { transactions, budgets, goals, recurring, currency, exportDate: new Date().toISOString() };
    downloadFile(JSON.stringify(data, null, 2), 'fintrack_backup.json', 'application/json');
    showToast('Backup exported!', 'info');
}

function importJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.transactions) { transactions = data.transactions; save('fintrack_transactions', transactions); }
            if (data.budgets) { budgets = data.budgets; save('fintrack_budgets', budgets); }
            if (data.goals) { goals = data.goals; save('fintrack_goals', goals); }
            if (data.recurring) { recurring = data.recurring; save('fintrack_recurring', recurring); }
            if (data.currency) setCurrency(data.currency);
            renderAll(); showToast('Backup restored successfully!', 'success');
        } catch { showToast('Invalid backup file', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function clearAllData() {
    if (!confirm('This will permanently delete ALL your data. Are you sure?')) return;
    transactions = []; budgets = []; goals = []; recurring = [];
    save('fintrack_transactions', transactions); save('fintrack_budgets', budgets); save('fintrack_goals', goals); save('fintrack_recurring', recurring);
    renderAll(); showToast('All data cleared', 'error');
}

function downloadFile(content, name, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
