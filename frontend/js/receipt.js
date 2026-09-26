import { esc, formatPrice, formatDate } from './ui.js';

const SIZE_KEY = 'receipt_paper_size';

function getSavedSize() {
  const value = localStorage.getItem(SIZE_KEY);
  return value === 'thermal' ? 'thermal' : 'a4';
}

function saveSize(size) {
  try {
    localStorage.setItem(SIZE_KEY, size);
  } catch {
    // ignore (private browsing, storage disabled, etc.)
  }
}

function sizeToggleHtml(size) {
  const option = (value, label) => {
    const active = size === value;
    return `<button type="button" data-size="${value}"
      class="rounded-lg px-3 py-1.5 text-sm font-medium ${active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}">${label}</button>`;
  };
  return `<div class="no-print inline-flex gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
    ${option('a4', 'A4')}
    ${option('thermal', '80mm')}
  </div>`;
}

function paperHtml(receipt, size, showEmail) {
  const { store, order, items, payment } = receipt;

  const rowsHtml = items
    .map(
      (item) => `<tr>
        <td class="py-1.5">${esc(item.product_name)}${item.quantity > 1 ? ` &times; ${item.quantity}` : ''}</td>
        <td class="py-1.5 text-right">${formatPrice(item.subtotal)}</td>
      </tr>`
    )
    .join('');

  return `<div id="receipt-paper" data-size="${size}"
    class="mx-auto rounded-xl border border-slate-200 bg-white p-8 font-mono text-slate-800 shadow-sm">
    <div class="text-center">
      <p class="receipt-store-name text-lg font-bold tracking-wide">${esc(store.name)}</p>
      ${store.tagline ? `<p class="text-xs text-slate-500">${esc(store.tagline)}</p>` : ''}
    </div>

    <div class="my-4 border-t border-dashed border-slate-300"></div>

    <div class="space-y-1">
      <p>Order: ${esc(order.order_number)}</p>
      <p>Date: ${esc(formatDate(order.created_at))}</p>
    </div>

    <div class="my-4 border-t border-dashed border-slate-300"></div>

    <div class="space-y-1">
      <p>Customer:</p>
      <p>${esc(order.customer_name)}</p>
      ${showEmail && order.customer_email ? `<p>${esc(order.customer_email)}</p>` : ''}
    </div>

    <div class="my-4 border-t border-dashed border-slate-300"></div>

    <table class="w-full">
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="my-4 border-t border-dashed border-slate-300"></div>

    <table class="w-full">
      <tbody>
        <tr><td class="py-0.5">Subtotal</td><td class="py-0.5 text-right">${formatPrice(order.subtotal)}</td></tr>
        <tr><td class="py-0.5">Discount</td><td class="py-0.5 text-right">${formatPrice(order.discount)}</td></tr>
        <tr class="font-bold"><td class="pt-1">TOTAL</td><td class="pt-1 text-right">${formatPrice(order.total)}</td></tr>
      </tbody>
    </table>

    <div class="my-4 border-t border-dashed border-slate-300"></div>

    <div class="space-y-1">
      <p>Payment: ${esc(payment ? payment.method_label : '-')}</p>
      ${payment && payment.transaction_id ? `<p>Ref: ${esc(payment.transaction_id)}</p>` : ''}
      <p>Status: PAID</p>
    </div>

    <div class="my-4 border-t border-dashed border-slate-300"></div>

    <p class="text-center text-xs text-slate-500">${esc(store.footer)}</p>
  </div>`;
}

// Renders the receipt HTML into `root` and returns the receipt data (or null
// on error). `fetchReceipt` gets the data, so the same renderer works for
// both /api/orders/:id/receipt and the admin route.
export async function renderReceipt(root, fetchReceipt, { backUrl, showEmail = false } = {}) {
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  let receipt;
  try {
    const { data } = await fetchReceipt();
    receipt = data.receipt;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return null;
    }
    root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p class="text-lg font-semibold text-slate-800">${esc(err.status === 404 ? 'Order not found' : err.status === 409 ? 'This order is not paid yet' : err.message)}</p>
      ${backUrl ? `<a href="${backUrl}" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Back</a>` : ''}
    </div>`;
    return null;
  }

  let size = getSavedSize();

  function draw() {
    root.innerHTML = `
      <div class="mb-4 flex justify-center">${sizeToggleHtml(size)}</div>
      ${paperHtml(receipt, size, showEmail)}
    `;

    root.querySelectorAll('button[data-size]').forEach((button) => {
      button.addEventListener('click', () => {
        size = button.dataset.size;
        saveSize(size);
        draw();
      });
    });
  }

  draw();
  return receipt;
}