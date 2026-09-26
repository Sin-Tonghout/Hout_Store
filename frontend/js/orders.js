import { api } from "./api.js";
import { esc, formatPrice, formatDate } from "./ui.js";

const ORDER_BADGES = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-600",
  refunded: "bg-rose-100 text-rose-700",
};

const PAYMENT_BADGES = {
  pending: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-600",
  refunded: "bg-rose-100 text-rose-700",
};

const badge = (map, value) =>
  `<span class="rounded-full px-2 py-0.5 text-xs font-semibold ${map[value] || "bg-slate-100 text-slate-600"}">${esc(value)}</span>`;

// ▼▼▼ ADD THIS ▼▼▼
// An open order that has not been paid (or whose last payment did not go through)
const isPayable = (order) =>
  order.status === "pending" &&
  ["pending", "failed", "cancelled"].includes(order.payment_status);
// ▲▲▲ ADD THIS ▲▲▲

function downloadCellHtml(download) {
  if (!download) return '<span class="text-xs text-slate-400">-</span>';

  if (download.expired) return '<span class="text-xs text-red-600">Link expired</span>';
  if (download.limit_reached) return '<span class="text-xs text-red-600">Limit reached</span>';

  return `<a href="/api/download/${download.token}" class="btn-sm btn-sm-green">Download</a>
    <p class="mt-1 text-xs text-slate-400">${download.downloads_used} / ${download.downloads_max} used</p>`;
}

function handleError(root, err) {
  if (err.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    return;
  }
  root.innerHTML = `<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">${esc(err.message)}</div>`;
}

// ---------- My Orders ----------

async function loadList(root) {
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  try {
    const { data } = await api("/api/orders");

    if (!data.orders.length) {
      root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p class="text-lg font-semibold text-slate-800">No orders yet</p>
        <p class="mt-1 text-sm text-slate-500">Your orders will appear here.</p>
        <a href="/shop" class="btn-primary mt-5 inline-block">Browse products</a>
      </div>`;
      return;
    }

    root.innerHTML = `<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Order</th>
            <th class="px-4 py-3">Date</th>
            <th class="px-4 py-3">Items</th>
            <th class="px-4 py-3">Total</th>
            <th class="px-4 py-3">Payment</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">${data.orders
          .map(
            (o) => `<tr>
              <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-900">${esc(o.order_number)}</td>
              <td class="whitespace-nowrap px-4 py-3 text-slate-500">${esc(formatDate(o.created_at))}</td>
              <td class="px-4 py-3 text-slate-600">${o.item_count}</td>
              <td class="px-4 py-3 text-slate-900">${formatPrice(o.total)}</td>
              <td class="px-4 py-3">${badge(PAYMENT_BADGES, o.payment_status)}</td>
              <td class="px-4 py-3">${badge(ORDER_BADGES, o.status)}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2 whitespace-nowrap">
                  ${isPayable(o) ? `<a href="/orders/${o.id}/pay" class="btn-sm btn-sm-green">Pay now</a>` : ''}
                  <a href="/orders/${o.id}" class="btn-sm btn-sm-indigo">View</a>
                </div>
              </td>
            </tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>`;
  } catch (err) {
    handleError(root, err);
  }
}

// ---------- One order ----------

async function loadDetail(root) {
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  const id = window.location.pathname.split("/").filter(Boolean).pop();
  const query = new URLSearchParams(window.location.search);
  const isNew = query.get("new") === "1";
  const paid = query.get("paid") === "1";

  try {
    const { data } = await api(`/api/orders/${encodeURIComponent(id)}`);
    const o = data.order;
    document.title = `${o.order_number} | Hout Store`;

    root.innerHTML = `
           ${isNew ? '<div class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Your order has been placed. Thank you!</div>' : ""}
      ${paid ? '<div class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Payment successful. Your order is confirmed.</div>' : ""}

            <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Order ${esc(o.order_number)}</h1>
          <p class="text-sm text-slate-500">Placed on ${esc(formatDate(o.created_at))}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${badge(ORDER_BADGES, o.status)}
          ${badge(PAYMENT_BADGES, o.payment_status)}
          ${o.payment_status === 'success' ? `<a href="/orders/${o.id}/receipt" class="btn-sm btn-sm-indigo">View Receipt</a>` : ''}
        </div>
      </div>

            <div class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">Product</th>
              <th class="px-4 py-3">Price</th>
              <th class="px-4 py-3">Qty</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">${o.items
            .map(
              (item) => `<tr>
                <td class="px-4 py-3 font-medium text-slate-900">${esc(item.product_name)}</td>
                <td class="px-4 py-3 text-slate-600">${formatPrice(item.price)}</td>
                <td class="px-4 py-3 text-slate-600">${item.quantity}</td>
                <td class="px-4 py-3 text-slate-900">${formatPrice(item.subtotal)}</td>
                <td class="px-4 py-3 text-right">${downloadCellHtml(item.download)}</td>
              </tr>`
            )
            .join('')}</tbody>
        </table>
      </div>

      <dl class="ml-auto mt-4 w-full max-w-xs space-y-2 text-sm">
        <div class="flex justify-between"><dt class="text-slate-600">Subtotal</dt><dd>${formatPrice(o.subtotal)}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-600">Discount</dt><dd>${formatPrice(o.discount)}</dd></div>
        <div class="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><dt>Total</dt><dd>${formatPrice(o.total)}</dd></div>
      </dl>

                  ${
        isPayable(o)
          ? `<div class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <span>${o.payment_status === 'pending' ? 'This order is waiting for payment.' : 'The last payment did not go through. You can try again.'}</span>
              <a href="/orders/${o.id}/pay" class="btn-primary">Pay now</a>
            </div>`
          : ''
      }
      
            ${
        o.payment_status === 'success'
          ? '<div class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Payment received. Use the Download buttons above to get your files.</div>'
          : ''
      }
    `;
  } catch (err) {
    if (err.status === 404) {
      root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p class="text-lg font-semibold text-slate-800">Order not found</p>
        <a href="/orders" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Back to my orders</a>
      </div>`;
      return;
    }
    handleError(root, err);
  }
}

const listRoot = document.getElementById("orders-root");
const detailRoot = document.getElementById("order-root");

if (listRoot) loadList(listRoot);
if (detailRoot) loadDetail(detailRoot);
