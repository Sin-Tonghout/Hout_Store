import { api } from '../api.js';
import { esc, formatPrice, formatDate } from '../ui.js';

const $ = (id) => document.getElementById(id);

// Based on the time on the admin's own device
function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function todayText() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const ORDER_BADGES = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-600',
  refunded: 'bg-rose-100 text-rose-700',
};

const PAYMENT_BADGES = {
  pending: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-200 text-slate-600',
  refunded: 'bg-rose-100 text-rose-700',
};

const METHOD_LABELS = { demo: 'Demo payment', aba_payway: 'ABA PayWay' };

const badge = (map, value) =>
  `<span class="rounded-full px-2 py-0.5 text-xs font-semibold ${map[value] || 'bg-slate-100 text-slate-600'}">${esc(value)}</span>`;

const emptyText = (text) => `<p class="py-8 text-center text-sm text-slate-500">${esc(text)}</p>`;

function renderStats(s) {
  const cards = [
    { label: 'Total Sales', value: formatPrice(s.total_sales), note: 'Paid orders only', accent: 'bg-emerald-500' },
    { label: 'Orders', value: s.total_orders, note: `${s.pending_orders} pending`, accent: 'bg-indigo-500' },
    { label: 'Customers', value: s.customers, note: 'Registered accounts', accent: 'bg-sky-500' },
    { label: 'Products', value: s.products, note: `${s.published_products} published`, accent: 'bg-amber-500' },
  ];

  $('stats').innerHTML = cards
    .map(
      (c) => `<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="h-1 w-10 rounded ${c.accent}"></div>
        <p class="mt-4 text-sm font-medium text-slate-500">${esc(c.label)}</p>
        <p class="mt-1 text-3xl font-bold text-slate-900">${esc(c.value)}</p>
        <p class="mt-1 text-xs text-slate-500">${esc(c.note)}</p>
      </div>`
    )
    .join('');
}

function renderChart(days) {
  const max = Math.max(...days.map((d) => d.total), 0);
  const total = days.reduce((sum, d) => sum + d.total, 0);
  $('chart-total').textContent = formatPrice(total);

  $('chart').innerHTML = days
    .map((d) => {
      const label = new Date(`${d.day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
      const height = max > 0 ? Math.max(4, Math.round((d.total / max) * 120)) : 4;
      return `<div class="flex h-full flex-1 flex-col items-center justify-end gap-1">
        <span class="text-xs text-slate-500">${d.total > 0 ? esc(formatPrice(d.total)) : ''}</span>
        <div class="w-full max-w-10 rounded-t ${d.total > 0 ? 'bg-indigo-500' : 'bg-slate-200'}" data-height="${height}"></div>
        <span class="text-xs font-medium text-slate-600">${esc(label)}</span>
      </div>`;
    })
    .join('');

  $('chart').querySelectorAll('[data-height]').forEach((bar) => {
    bar.style.height = `${bar.dataset.height}px`;
  });
}

function renderTopProducts(products) {
  if (!products.length) {
    $('top-products').innerHTML = emptyText('No sales yet');
    return;
  }
  $('top-products').innerHTML = `<ol class="divide-y divide-slate-100">${products
    .map(
      (p, index) => `<li class="flex items-center gap-3 py-2.5">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">${index + 1}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-900">${esc(p.product_name)}</p>
          <p class="text-xs text-slate-500">${p.sold} sold</p>
        </div>
        <span class="text-sm font-semibold text-slate-900">${formatPrice(p.revenue)}</span>
      </li>`
    )
    .join('')}</ol>`;
}

function renderRecentOrders(orders) {
  if (!orders.length) {
    $('recent-orders').innerHTML = emptyText('No orders yet. They will appear here after customers check out.');
    return;
  }
  $('recent-orders').innerHTML = `<table class="min-w-full text-sm">
    <thead class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      <tr>
        <th class="py-2 pr-4">Order</th>
        <th class="py-2 pr-4">Customer</th>
        <th class="py-2 pr-4">Total</th>
        <th class="py-2 pr-4">Payment</th>
        <th class="py-2 pr-4">Status</th>
        <th class="py-2">Date</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">${orders
      .map(
        (o) => `<tr>
          <td class="whitespace-nowrap py-2.5 pr-4 font-medium text-slate-900">${esc(o.order_number)}</td>
          <td class="py-2.5 pr-4 text-slate-600">${esc(o.customer_name)}</td>
          <td class="py-2.5 pr-4 text-slate-900">${formatPrice(o.total)}</td>
          <td class="py-2.5 pr-4">${badge(PAYMENT_BADGES, o.payment_status)}</td>
          <td class="py-2.5 pr-4">${badge(ORDER_BADGES, o.status)}</td>
          <td class="whitespace-nowrap py-2.5 text-slate-500">${esc(formatDate(o.created_at))}</td>
        </tr>`
      )
      .join('')}</tbody>
  </table>`;
}

function renderPayments(payments) {
  if (!payments.length) {
    $('recent-payments').innerHTML = emptyText('No payments yet');
    return;
  }
  $('recent-payments').innerHTML = `<ul class="divide-y divide-slate-100">${payments
    .map(
      (p) => `<li class="flex items-center justify-between gap-3 py-2.5">
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-slate-900">${esc(METHOD_LABELS[p.payment_method] || p.payment_method)}</p>
          <p class="text-xs text-slate-500">${esc(p.order_number)} &middot; ${esc(formatDate(p.created_at))}</p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1">
          <span class="text-sm font-semibold text-slate-900">${formatPrice(p.amount)}</span>
          ${badge(PAYMENT_BADGES, p.status)}
        </div>
      </li>`
    )
    .join('')}</ul>`;
}

function renderCustomers(customers) {
  if (!customers.length) {
    $('recent-customers').innerHTML = emptyText('No customers yet');
    return;
  }
  $('recent-customers').innerHTML = `<table class="min-w-full text-sm">
    <thead class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      <tr>
        <th class="py-2 pr-4">Name</th>
        <th class="py-2 pr-4">Email</th>
        <th class="py-2">Joined</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">${customers
      .map(
        (c) => `<tr>
          <td class="py-2.5 pr-4 font-medium text-slate-900">${esc(c.name)}</td>
          <td class="py-2.5 pr-4 text-slate-600">${esc(c.email)}</td>
          <td class="whitespace-nowrap py-2.5 text-slate-500">${esc(formatDate(c.created_at))}</td>
        </tr>`
      )
      .join('')}</tbody>
  </table>`;
}

function renderProductsOverview(s) {
  const rows = [
    { label: 'Published', count: s.published_products, color: 'bg-emerald-500' },
    { label: 'Draft', count: s.draft_products, color: 'bg-amber-500' },
    { label: 'Archived', count: s.archived_products, color: 'bg-slate-400' },
  ];

  $('products-overview').innerHTML = rows
    .map((r) => {
      const percent = s.products > 0 ? Math.round((r.count / s.products) * 100) : 0;
      return `<div>
        <div class="flex justify-between text-sm">
          <span class="font-medium text-slate-700">${r.label}</span>
          <span class="text-slate-500">${r.count}</span>
        </div>
        <div class="mt-1.5 h-2 rounded-full bg-slate-100">
          <div class="h-2 rounded-full ${r.color}" data-width="${percent}"></div>
        </div>
      </div>`;
    })
    .join('');

  $('products-overview').querySelectorAll('[data-width]').forEach((bar) => {
    bar.style.width = `${bar.dataset.width}%`;
  });
}

async function load() {
  try {
    const { data } = await api('/api/admin/dashboard');
    $('greeting').textContent = `${greetingFor()}, ${data.admin.name}`;
    $('welcome').textContent = `${todayText()}. Here is how the store is doing.`;
    renderStats(data.stats);
    renderChart(data.salesByDay);
    renderTopProducts(data.topProducts);
    renderRecentOrders(data.recentOrders);
    renderPayments(data.recentPayments);
    renderCustomers(data.recentCustomers);
    renderProductsOverview(data.stats);
  } catch (err) {
    $('welcome').textContent = '';
    const box = $('dash-error');
    box.textContent = err.message;
    box.classList.remove('hidden');
  }
}

load();