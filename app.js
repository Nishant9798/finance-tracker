// ===== Categories Configuration =====
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

const CATEGORY_COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
    '#84cc16', '#e11d48', '#a855f7', '#22c55e'
];

// ===== State =====
let transactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
let currentType = 'expense';
let editingId = null;
let deleteId = null;

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initModal();
    initDailyView();
    initMonthlyView();
    initFilters();
    setDashboardDate();
    renderAll();
});

// ===== Theme =====
function initTheme() {
    const saved = localStorage.getItem('fintrack_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    $('#themeToggle').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('fintrack_theme', isDark ? 'light' : 'dark');
        renderAll();
    });
}

// ===== Navigation =====
function initNavigation() {
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    $$('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    // Mobile
    $('#menuBtn').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
    });

    $('#addBtnMobile').addEventListener('click', openModal);

    // Close sidebar on nav click (mobile)
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            $('#sidebar').classList.remove('open');
        });
    });
}

function navigateTo(page) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));

    $(`#page-${page}`).classList.add('active');
    $(`.nav-item[data-page="${page}"]`).classList.add('active');

    if (page === 'daily') renderDailyView();
    if (page === 'monthly') renderMonthlyView();
    if (page === 'transactions') renderAllTransactions();
    if (page === 'dashboard') renderAll();
}

// ===== Dashboard Date =====
function setDashboardDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    $('#dashboardDate').textContent = now.toLocaleDateString('en-IN', options);
}

// ===== Modal =====
function initModal() {
    $('#addTransactionBtn').addEventListener('click', openModal);
    $('#addTransactionBtn2').addEventListener('click', openModal);
    $('#modalClose').addEventListener('click', closeModal);
    $('#cancelBtn').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Type toggle
    $('#typeExpense').addEventListener('click', () => setType('expense'));
    $('#typeIncome').addEventListener('click', () => setType('income'));

    // Form submit
    $('#transactionForm').addEventListener('submit', handleSubmit);

    // Delete modal
    $('#cancelDelete').addEventListener('click', () => {
        $('#deleteModalOverlay').classList.remove('active');
    });
    $('#deleteModalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            $('#deleteModalOverlay').classList.remove('active');
        }
    });
    $('#confirmDelete').addEventListener('click', () => {
        if (deleteId) {
            transactions = transactions.filter(t => t.id !== deleteId);
            saveTransactions();
            renderAll();
            deleteId = null;
            $('#deleteModalOverlay').classList.remove('active');
        }
    });
}

function openModal(editTransaction = null) {
    editingId = null;
    $('#transactionForm').reset();
    $('#date').value = new Date().toISOString().split('T')[0];

    if (editTransaction && typeof editTransaction === 'object' && editTransaction.id) {
        editingId = editTransaction.id;
        $('#modalTitle').textContent = 'Edit Transaction';
        setType(editTransaction.type);
        $('#amount').value = editTransaction.amount;
        $('#category').value = editTransaction.category;
        $('#description').value = editTransaction.description;
        $('#date').value = editTransaction.date;
    } else {
        $('#modalTitle').textContent = 'Add Transaction';
        setType('expense');
    }

    $('#modalOverlay').classList.add('active');
    setTimeout(() => $('#amount').focus(), 100);
}

function closeModal() {
    $('#modalOverlay').classList.remove('active');
    editingId = null;
}

function setType(type) {
    currentType = type;
    $('#typeExpense').classList.toggle('active', type === 'expense');
    $('#typeIncome').classList.toggle('active', type === 'income');
    populateCategories(type);
}

function populateCategories(type) {
    const select = $('#category');
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select category</option>';
    CATEGORIES[type].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.value;
        opt.textContent = `${cat.emoji} ${cat.label}`;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

function handleSubmit(e) {
    e.preventDefault();

    const transaction = {
        id: editingId || Date.now().toString(36) + Math.random().toString(36).substr(2),
        type: currentType,
        amount: parseFloat($('#amount').value),
        category: $('#category').value,
        description: $('#description').value || getCategoryLabel(currentType, $('#category').value),
        date: $('#date').value,
        createdAt: editingId ? transactions.find(t => t.id === editingId)?.createdAt : Date.now()
    };

    if (editingId) {
        const idx = transactions.findIndex(t => t.id === editingId);
        if (idx !== -1) transactions[idx] = transaction;
    } else {
        transactions.push(transaction);
    }

    saveTransactions();
    closeModal();
    renderAll();
}

// ===== Data Helpers =====
function saveTransactions() {
    localStorage.setItem('fintrack_transactions', JSON.stringify(transactions));
}

function getCategoryLabel(type, value) {
    const cat = CATEGORIES[type]?.find(c => c.value === value);
    return cat ? cat.label : value;
}

function getCategoryEmoji(type, value) {
    const cat = CATEGORIES[type]?.find(c => c.value === value);
    return cat ? cat.emoji : '📦';
}

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getMonthTransactions(year, month) {
    return transactions.filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
    });
}

function getDayTransactions(dateStr) {
    return transactions.filter(t => t.date === dateStr);
}

// ===== Render All =====
function renderAll() {
    renderDashboard();
    renderAllTransactions();

    const activePage = $('.page.active');
    if (activePage?.id === 'page-daily') renderDailyView();
    if (activePage?.id === 'page-monthly') renderMonthlyView();
}

// ===== Dashboard =====
function renderDashboard() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthTx = getMonthTransactions(year, month);

    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    $('#totalIncome').textContent = formatCurrency(income);
    $('#totalExpenses').textContent = formatCurrency(expenses);
    $('#netBalance').textContent = formatCurrency(balance);
    $('#savingsRate').textContent = savingsRate + '%';

    $('#incomeMonth').textContent = monthName;
    $('#expenseMonth').textContent = monthName;
    $('#balanceMonth').textContent = monthName;
    $('#savingsMonth').textContent = monthName;

    renderBarChart();
    renderDonutChart(monthTx);
    renderRecentTransactions();
}

// ===== Bar Chart =====
function renderBarChart() {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const tx = getMonthTransactions(year, month);

        months.push({
            label: d.toLocaleDateString('en-IN', { month: 'short' }),
            income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expense: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        });
    }

    const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
    const chartHeight = 180;

    let html = '';
    months.forEach(m => {
        const incomeH = (m.income / maxVal) * chartHeight;
        const expenseH = (m.expense / maxVal) * chartHeight;
        html += `
            <div class="bar-group">
                <div class="bars">
                    <div class="bar income-bar" style="height: ${incomeH}px" title="Income: ${formatCurrency(m.income)}"></div>
                    <div class="bar expense-bar" style="height: ${expenseH}px" title="Expenses: ${formatCurrency(m.expense)}"></div>
                </div>
                <span class="bar-label">${m.label}</span>
            </div>
        `;
    });

    html += `
        <div class="bar-chart-legend" style="position:absolute;bottom:-8px;left:0;right:0;">
            <span class="legend-item"><span class="legend-dot" style="background:var(--income-color)"></span> Income</span>
            <span class="legend-item"><span class="legend-dot" style="background:var(--expense-color)"></span> Expense</span>
        </div>
    `;

    const container = $('#barChart');
    container.style.position = 'relative';
    container.innerHTML = html;
}

// ===== Donut Chart =====
function renderDonutChart(monthTx) {
    const canvas = $('#donutChart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = 220 * dpr;
    canvas.height = 220 * dpr;
    canvas.style.width = '220px';
    canvas.style.height = '220px';
    ctx.scale(dpr, dpr);

    const expenses = monthTx.filter(t => t.type === 'expense');
    const categoryTotals = {};

    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    const cx = 110, cy = 110, radius = 90, lineWidth = 28;

    ctx.clearRect(0, 0, 220, 220);

    if (sorted.length === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        ctx.font = '500 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No expenses', cx, cy);
    } else {
        let startAngle = -Math.PI / 2;

        sorted.forEach(([cat, amount], i) => {
            const sliceAngle = (amount / total) * Math.PI * 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.strokeStyle = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'butt';
            ctx.stroke();

            startAngle = endAngle;
        });

        // Center text
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
        ctx.font = '800 18px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(formatCurrency(total), cx, cy - 2);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        ctx.font = '500 12px Inter';
        ctx.fillText('Total Spent', cx, cy + 16);
    }

    // Legend
    let legendHtml = '';
    sorted.forEach(([cat, amount], i) => {
        const pct = Math.round((amount / total) * 100);
        const emoji = getCategoryEmoji('expense', cat);
        const label = getCategoryLabel('expense', cat);
        legendHtml += `
            <div class="donut-legend-item">
                <span class="donut-legend-color" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></span>
                ${emoji} ${label} (${pct}%)
            </div>
        `;
    });
    $('#donutLegend').innerHTML = legendHtml;
}

// ===== Recent Transactions =====
function renderRecentTransactions() {
    const sorted = [...transactions].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt - a.createdAt;
    });
    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
        $('#recentTransactions').innerHTML = `
            <div class="empty-state">
                <p>No transactions yet</p>
                <span>Click "Add Transaction" to get started</span>
            </div>
        `;
        return;
    }

    $('#recentTransactions').innerHTML = recent.map(t => createTransactionHTML(t)).join('');
    bindTransactionActions('#recentTransactions');
}

// ===== All Transactions =====
function renderAllTransactions() {
    let filtered = [...transactions];

    // Apply filters
    const search = $('#searchInput')?.value?.toLowerCase() || '';
    const typeFilter = $('#typeFilter')?.value || 'all';
    const catFilter = $('#categoryFilter')?.value || 'all';
    const sort = $('#sortFilter')?.value || 'newest';

    if (search) {
        filtered = filtered.filter(t =>
            t.description.toLowerCase().includes(search) ||
            getCategoryLabel(t.type, t.category).toLowerCase().includes(search)
        );
    }

    if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
    if (catFilter !== 'all') filtered = filtered.filter(t => t.category === catFilter);

    // Sort
    switch (sort) {
        case 'newest':
            filtered.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
            break;
        case 'oldest':
            filtered.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
            break;
        case 'highest':
            filtered.sort((a, b) => b.amount - a.amount);
            break;
        case 'lowest':
            filtered.sort((a, b) => a.amount - b.amount);
            break;
    }

    if (filtered.length === 0) {
        $('#allTransactions').innerHTML = '';
        $('#emptyTransactions').style.display = 'block';
    } else {
        $('#emptyTransactions').style.display = 'none';
        $('#allTransactions').innerHTML = filtered.map(t => createTransactionHTML(t)).join('');
        bindTransactionActions('#allTransactions');
    }

    // Populate category filter
    populateCategoryFilter();
}

function populateCategoryFilter() {
    const select = $('#categoryFilter');
    if (!select) return;
    const current = select.value;
    const usedCategories = new Set(transactions.map(t => t.category));

    select.innerHTML = '<option value="all">All Categories</option>';
    [...CATEGORIES.expense, ...CATEGORIES.income].forEach(cat => {
        if (usedCategories.has(cat.value)) {
            const opt = document.createElement('option');
            opt.value = cat.value;
            opt.textContent = `${cat.emoji} ${cat.label}`;
            select.appendChild(opt);
        }
    });
    select.value = current;
}

function initFilters() {
    $('#searchInput')?.addEventListener('input', renderAllTransactions);
    $('#typeFilter')?.addEventListener('change', renderAllTransactions);
    $('#categoryFilter')?.addEventListener('change', renderAllTransactions);
    $('#sortFilter')?.addEventListener('change', renderAllTransactions);
}

// ===== Transaction HTML =====
function createTransactionHTML(t) {
    const emoji = getCategoryEmoji(t.type, t.category);
    const catLabel = getCategoryLabel(t.type, t.category);
    const sign = t.type === 'income' ? '+' : '-';

    return `
        <div class="transaction-item" data-id="${t.id}">
            <div class="transaction-left">
                <div class="transaction-emoji ${t.type}">${emoji}</div>
                <div class="transaction-details">
                    <span class="transaction-desc">${escapeHtml(t.description)}</span>
                    <span class="transaction-category">${catLabel}</span>
                </div>
            </div>
            <div class="transaction-right">
                <span class="transaction-amount ${t.type}">${sign}${formatCurrency(t.amount)}</span>
                <span class="transaction-date">${formatDate(t.date)}</span>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete delete-btn" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function bindTransactionActions(containerSel) {
    const container = $(containerSel);
    if (!container) return;

    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.transaction-item').dataset.id;
            const t = transactions.find(tx => tx.id === id);
            if (t) openModal(t);
        });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteId = e.target.closest('.transaction-item').dataset.id;
            $('#deleteModalOverlay').classList.add('active');
        });
    });
}

// ===== Daily View =====
function initDailyView() {
    const today = new Date().toISOString().split('T')[0];
    $('#dailyDatePicker').value = today;

    $('#dailyDatePicker').addEventListener('change', renderDailyView);

    $('#prevDay').addEventListener('click', () => {
        const d = new Date($('#dailyDatePicker').value + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        $('#dailyDatePicker').value = d.toISOString().split('T')[0];
        renderDailyView();
    });

    $('#nextDay').addEventListener('click', () => {
        const d = new Date($('#dailyDatePicker').value + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        $('#dailyDatePicker').value = d.toISOString().split('T')[0];
        renderDailyView();
    });
}

function renderDailyView() {
    const dateStr = $('#dailyDatePicker').value;
    const date = new Date(dateStr + 'T00:00:00');
    const dayTx = getDayTransactions(dateStr);

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    $('#dailyDateTitle').textContent = date.toLocaleDateString('en-IN', options);

    const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    $('#dailyIncome').textContent = formatCurrency(income);
    $('#dailyExpenses').textContent = formatCurrency(expenses);
    $('#dailyNet').textContent = formatCurrency(income - expenses);

    if (dayTx.length === 0) {
        $('#dailyTransactions').innerHTML = '';
        $('#emptyDaily').style.display = 'block';
    } else {
        $('#emptyDaily').style.display = 'none';
        const sorted = [...dayTx].sort((a, b) => b.createdAt - a.createdAt);
        $('#dailyTransactions').innerHTML = sorted.map(t => createTransactionHTML(t)).join('');
        bindTransactionActions('#dailyTransactions');
    }
}

// ===== Monthly View =====
function initMonthlyView() {
    const now = new Date();
    $('#monthlyDatePicker').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    $('#monthlyDatePicker').addEventListener('change', renderMonthlyView);

    $('#prevMonth').addEventListener('click', () => {
        const [y, m] = $('#monthlyDatePicker').value.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        $('#monthlyDatePicker').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        renderMonthlyView();
    });

    $('#nextMonth').addEventListener('click', () => {
        const [y, m] = $('#monthlyDatePicker').value.split('-').map(Number);
        const d = new Date(y, m, 1);
        $('#monthlyDatePicker').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        renderMonthlyView();
    });
}

function renderMonthlyView() {
    const [year, month] = $('#monthlyDatePicker').value.split('-').map(Number);
    const monthTx = getMonthTransactions(year, month - 1);

    const monthName = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    $('#monthlyTitle').textContent = monthName;

    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    $('#monthlyIncome').textContent = formatCurrency(income);
    $('#monthlyExpenses').textContent = formatCurrency(expenses);
    $('#monthlyNet').textContent = formatCurrency(income - expenses);

    renderCalendarHeatmap(year, month - 1);
    renderMonthlyLineChart(year, month - 1);
    renderMonthlyCategoryBars(monthTx);

    if (monthTx.length === 0) {
        $('#monthlyTransactions').innerHTML = '';
        $('#emptyMonthly').style.display = 'block';
    } else {
        $('#emptyMonthly').style.display = 'none';
        const sorted = [...monthTx].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
        $('#monthlyTransactions').innerHTML = sorted.map(t => createTransactionHTML(t)).join('');
        bindTransactionActions('#monthlyTransactions');
    }
}

// ===== Calendar Heatmap =====
function renderCalendarHeatmap(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun

    // Daily expense totals
    const dailyExpenses = {};
    transactions.filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month && t.type === 'expense';
    }).forEach(t => {
        const day = new Date(t.date + 'T00:00:00').getDate();
        dailyExpenses[day] = (dailyExpenses[day] || 0) + t.amount;
    });

    const maxExpense = Math.max(...Object.values(dailyExpenses), 1);

    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        .map(d => `<div class="heatmap-header">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="heatmap-cell empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const expense = dailyExpenses[day] || 0;
        const ratio = expense / maxExpense;
        let level = 0;
        if (expense > 0) {
            if (ratio <= 0.25) level = 1;
            else if (ratio <= 0.5) level = 2;
            else if (ratio <= 0.75) level = 3;
            else level = 4;
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        html += `
            <div class="heatmap-cell level-${level}" data-date="${dateStr}" title="${formatDate(dateStr)}: ${formatCurrency(expense)}">
                <span class="heatmap-day">${day}</span>
                ${expense > 0 ? `<span class="heatmap-amount">${formatCurrency(expense)}</span>` : ''}
            </div>
        `;
    }

    $('#calendarHeatmap').innerHTML = html;

    // Click to navigate to daily view
    $$('.heatmap-cell:not(.empty)').forEach(cell => {
        cell.addEventListener('click', () => {
            const date = cell.dataset.date;
            $('#dailyDatePicker').value = date;
            navigateTo('daily');
        });
    });
}

// ===== Monthly Line Chart =====
function renderMonthlyLineChart(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const container = $('#monthlyLineChart');

    const dailyExpenses = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTx = getDayTransactions(dateStr).filter(t => t.type === 'expense');
        dailyExpenses.push(dayTx.reduce((s, t) => s + t.amount, 0));
    }

    const maxVal = Math.max(...dailyExpenses, 1);
    const width = 100;
    const height = 100;
    const padding = 5;

    const points = dailyExpenses.map((val, i) => {
        const x = padding + (i / (daysInMonth - 1)) * (width - padding * 2);
        const y = height - padding - (val / maxVal) * (height - padding * 2);
        return `${x},${y}`;
    });

    const areaPoints = [...points, `${padding + ((daysInMonth - 1) / (daysInMonth - 1)) * (width - padding * 2)},${height - padding}`, `${padding},${height - padding}`];

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--expense-color').trim();

    container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:100%">
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.02"/>
                </linearGradient>
            </defs>
            <polygon points="${areaPoints.join(' ')}" fill="url(#lineGrad)"/>
            <polyline points="${points.join(' ')}" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

// ===== Monthly Category Bars =====
function renderMonthlyCategoryBars(monthTx) {
    const expenses = monthTx.filter(t => t.type === 'expense');
    const categoryTotals = {};

    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

    if (sorted.length === 0) {
        $('#monthlyCategoryBars').innerHTML = '<div class="empty-state"><p>No expenses this month</p></div>';
        return;
    }

    let html = '';
    sorted.forEach(([cat, amount], i) => {
        const pct = (amount / maxVal) * 100;
        const emoji = getCategoryEmoji('expense', cat);
        const label = getCategoryLabel('expense', cat);
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];

        html += `
            <div class="category-bar-item">
                <div class="category-bar-header">
                    <span class="category-bar-name"><span class="category-emoji">${emoji}</span> ${label}</span>
                    <span class="category-bar-amount">${formatCurrency(amount)}</span>
                </div>
                <div class="category-bar-track">
                    <div class="category-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
            </div>
        `;
    });

    $('#monthlyCategoryBars').innerHTML = html;
}
