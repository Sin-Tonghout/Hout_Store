import { api } from '../api.js';
import { esc, formatPrice, formatDate, toast } from '../ui.js';

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

// Same rule as the server: only unpaid, open orders can be cancelled
const canCancel = (order) =>
  ['pending', 'processing'].includes(order.status) && order.payment_status !== 'success';

const canComplete = (order) =>
  order.payment_status === 'success' && ['pending', 'processing'].includes(order.status);

const canRefund = (order) => order.status === 'completed' && order.payment_status === 'success';

async function orderAction(order, action, confirmText, doneText) {
  if (!window.confirm(confirmText)) return false;
  try {
    await api(`/api/admin/orders/${order.id}/${action}`, { method: 'PATCH' });
    toast(doneText);
    return true;
  } catch (err) {
    toast(err.message);
    return false;
  }
}

const cancelOrder = (order) =>
  orderAction(
    order,
    'cancel',
    `Cancel order ${order.order_number}? The customer will no longer be able to pay for it.`,
    'Order cancelled'
  );

// ---------- Orders list ----------

function initList(rows) {
  const PER_PAGE = 10;
  const state = { search: '', status: '', payment: '', page: 1 };

  const pagination = document.getElementById('pagination');
  const searchInput = document.getElementById('filter-search');
  const statusSelect = document.getElementById('filter-status');
  const paymentSelect = document.getElementById('filter-payment');

  let currentOrders = [];

  const messageRow = (text) =>
    `<tr><td colspan="7" class="px-4 py-10 text-center text-slate-500">${esc(text)}</td></tr>`;

  function rowHtml(o) {
    return `<tr>
      <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-900">${esc(o.order_number)}</td>
      <td class="px-4 py-3">
        <p class="text-slate-900">${esc(o.customer_name)}</p>
        <p class="text-xs text-slate-500">${esc(o.customer_email)}</p>
      </td>
      <td class="px-4 py-3 text-slate-900">${formatPrice(o.total)}</td>
      <td class="px-4 py-3">${badge(PAYMENT_BADGES, o.payment_status)}</td>
      <td class="px-4 py-3">${badge(ORDER_BADGES, o.status)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-slate-500">${esc(formatDate(o.created_at))}</td>
      <td class="px-4 py-3">
                <div class="flex justify-end gap-2 whitespace-nowrap">
          <a href="/admin/orders/${o.id}" class="btn-sm btn-sm-indigo">View</a>
          ${canCancel(o) ? `<button type="button" data-action="cancel" data-id="${o.id}" class="btn-sm btn-sm-red">Cancel</button>` : ''}
        </div>
      </td>
    </tr>`;
  }

  function renderPagination({ page, totalPages, total }) {
    if (totalPages <= 1) {
      pagination.innerHTML = `<span class="text-sm text-slate-500">${total} order${total === 1 ? '' : 's'}</span>`;
      return;
    }
    const button = (label, target, disabled) =>
      `<button type="button" data-page="${target}" ${disabled ? 'disabled' : ''}
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">${label}</button>`;

    pagination.innerHTML = `${button('Previous', page - 1, page <= 1)}
      <span class="text-sm text-slate-600">Page ${page} of ${totalPages}</span>
      ${button('Next', page + 1, page >= totalPages)}`;
  }

  async function load() {
    rows.innerHTML = messageRow('Loading...');

    const query = new URLSearchParams({ page: state.page, limit: PER_PAGE });
    if (state.search) query.set('search', state.search);
    if (state.status) query.set('status', state.status);
    if (state.payment) query.set('payment_status', state.payment);

    try {
      const { data } = await api(`/api/admin/orders?${query}`);
      currentOrders = data.orders;
      rows.innerHTML = data.orders.length
        ? data.orders.map(rowHtml).join('')
        : messageRow('No orders found');
      renderPagination(data.pagination);
    } catch (err) {
      rows.innerHTML = messageRow(err.message);
    }
  }

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = searchInput.value.trim();
      state.page = 1;
      load();
    }, 300);
  });
  statusSelect.addEventListener('change', () => {
    state.status = statusSelect.value;
    state.page = 1;
    load();
  });
  paymentSelect.addEventListener('change', () => {
    state.payment = paymentSelect.value;
    state.page = 1;
    load();
  });

  pagination.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    load();
  });

  rows.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action="cancel"]');
    if (!button) return;

    const order = currentOrders.find((o) => o.id === Number(button.dataset.id));
    if (order && (await cancelOrder(order))) load();
  });

  load();
}

// ---------- One order ----------

async function initDetail(root) {
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  const id = window.location.pathname.split('/').filter(Boolean).pop();

  async function load() {
    try {
      const { data } = await api(`/api/admin/orders/${encodeURIComponent(id)}`);
      render(data.order);
    } catch (err) {
      root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p class="text-lg font-semibold text-slate-800">${esc(err.status === 404 ? 'Order not found' : err.message)}</p>
        <a href="/admin/orders" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Back to orders</a>
      </div>`;
    }
  }

  function paymentsHtml(payments) {
    if (!payments.length) {
      return '<p class="mt-3 text-sm text-slate-500">No payment has been made for this order yet.</p>';
    }
    return `<ul class="mt-3 divide-y divide-slate-100">${payments
      .map(
        (p) => `<li class="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div class="min-w-0">
            <p class="font-medium text-slate-900">${esc(METHOD_LABELS[p.payment_method] || p.payment_method)}</p>
            <p class="truncate text-xs text-slate-500">${p.transaction_id ? esc(p.transaction_id) + ' &middot; ' : ''}${esc(formatDate(p.paid_at || p.created_at))}</p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <span class="font-semibold text-slate-900">${formatPrice(p.amount)}</span>
            ${badge(PAYMENT_BADGES, p.status)}
          </div>
        </li>`
      )
      .join('')}</ul>`;
  }

  function render(o) {
    document.title = `${o.order_number} | Admin`;

    root.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Order ${esc(o.order_number)}</h1>
          <p class="text-sm text-slate-500">Placed on ${esc(formatDate(o.created_at))}</p>
        </div>
                <div class="flex flex-wrap items-center gap-3">
          ${badge(ORDER_BADGES, o.status)}
          ${badge(PAYMENT_BADGES, o.payment_status)}
          ${o.payment_status === 'success' ? `<a href="/admin/orders/${o.id}/receipt" class="btn-sm btn-sm-indigo">Receipt</a>` : ''}
          ${canCancel(o) ? '<button type="button" id="cancel-order" class="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Cancel order</button>' : ''}
        </div>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <div class="min-w-0 space-y-6 lg:col-span-2">
          <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3">Product</th>
                  <th class="px-4 py-3">Price</th>
                  <th class="px-4 py-3">Qty</th>
                  <th class="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">${o.items
                .map(
                  (item) => `<tr>
                    <td class="px-4 py-3 font-medium text-slate-900">${esc(item.product_name)}</td>
                    <td class="px-4 py-3 text-slate-600">${formatPrice(item.price)}</td>
                    <td class="px-4 py-3 text-slate-600">${item.quantity}</td>
                    <td class="px-4 py-3 text-right text-slate-900">${formatPrice(item.subtotal)}</td>
                  </tr>`
                )
                .join('')}</tbody>
            </table>
          </div>

          <dl class="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-slate-600">Subtotal</dt><dd>${formatPrice(o.subtotal)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-600">Discount</dt><dd>${formatPrice(o.discount)}</dd></div>
            <div class="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><dt>Total</dt><dd>${formatPrice(o.total)}</dd></div>
          </dl>
        </div>

        <div class="min-w-0 space-y-6">
          <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="font-semibold text-slate-900">Customer</h2>
            <p class="mt-3 text-sm font-medium text-slate-900">${esc(o.customer_name)}</p>
            <p class="text-sm text-slate-500">${esc(o.customer_email)}</p>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="font-semibold text-slate-900">Payments</h2>
            ${paymentsHtml(o.payments)}
          </section>
        </div>
      </div>`;

        const actions = [
      ['#cancel-order', () => cancelOrder(o)],
      [
        '#complete-order',
        () =>
          orderAction(
            o,
            'complete',
            `Mark order ${o.order_number} as completed?`,
            'Order marked as completed'
          ),
      ],
      [
        '#refund-order',
        () =>
          orderAction(
            o,
            'refund',
            `Refund order ${o.order_number}? This updates the store records. Sending the money back is done in the payment provider.`,
            'Order refunded'
          ),
      ],
    ];

    actions.forEach(([selector, run]) => {
      const button = root.querySelector(selector);
      if (button) {
        button.addEventListener('click', async () => {
          if (await run()) load();
        });
      }
    });
  }

  load();
}

const listRows = document.getElementById('order-rows');
const detailRoot = document.getElementById('order-detail-root');

if (listRows) initList(listRows);
if (detailRoot) initDetail(detailRoot);