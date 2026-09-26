import { api } from './api.js';
import { esc, formatPrice, coverHtml, toast } from './ui.js';

const MAX_QUANTITY = 10;

// Tells the navbar to update its cart number
function announce(cart) {
  window.dispatchEvent(new CustomEvent('cart:changed', { detail: { count: cart.summary.count } }));
  return cart;
}

export async function getCart() {
  const { data } = await api('/api/cart');
  return announce(data.cart);
}

export async function addToCart(productId, quantity = 1) {
  const { data } = await api('/api/cart', {
    method: 'POST',
    body: { product_id: productId, quantity },
  });
  return announce(data.cart);
}

export async function updateQuantity(productId, quantity) {
  const { data } = await api(`/api/cart/${productId}`, {
    method: 'PUT',
    body: { quantity },
  });
  return announce(data.cart);
}

export async function removeFromCart(productId) {
  const { data } = await api(`/api/cart/${productId}`, { method: 'DELETE' });
  return announce(data.cart);
}

// ---------- Cart page ----------

function itemHtml(item) {
  const url = `/product/${encodeURIComponent(item.slug)}`;
  const cover = coverHtml({ id: item.product_id, name: item.name, cover_image: item.cover_image });

  return `<li class="flex gap-4 py-4">
    <a href="${url}" class="block h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">${cover}</a>
    <div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <a href="${url}" class="font-medium text-slate-900 hover:text-indigo-600">${esc(item.name)}</a>
        ${item.category_name ? `<p class="text-xs text-slate-500">${esc(item.category_name)}</p>` : ''}
        <p class="mt-1 text-sm text-slate-600">${formatPrice(item.price)} each</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center rounded-lg border border-slate-300">
          <button type="button" data-action="dec" data-id="${item.product_id}" ${item.quantity <= 1 ? 'disabled' : ''}
            class="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Decrease quantity">-</button>
          <span class="min-w-8 text-center text-sm font-medium">${item.quantity}</span>
          <button type="button" data-action="inc" data-id="${item.product_id}" ${item.quantity >= MAX_QUANTITY ? 'disabled' : ''}
            class="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Increase quantity">+</button>
        </div>
        <p class="w-20 text-right font-semibold text-slate-900">${formatPrice(item.subtotal)}</p>
        <button type="button" data-action="remove" data-id="${item.product_id}" class="text-sm font-medium text-red-600 hover:underline">Remove</button>
      </div>
    </div>
  </li>`;
}

function summaryHtml(cart) {
  const s = cart.summary;
  return `<aside class="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
    <h2 class="font-semibold text-slate-900">Order summary</h2>
    <dl class="mt-4 space-y-2 text-sm">
      <div class="flex justify-between"><dt class="text-slate-600">Items</dt><dd>${s.count}</dd></div>
      <div class="flex justify-between"><dt class="text-slate-600">Subtotal</dt><dd>${formatPrice(s.subtotal)}</dd></div>
      ${s.discount > 0 ? `<div class="flex justify-between"><dt class="text-slate-600">Discount</dt><dd>-${formatPrice(s.discount)}</dd></div>` : ''}
      <div class="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900"><dt>Total</dt><dd>${formatPrice(s.total)}</dd></div>
    </dl>
    <a href="/checkout" class="btn-primary mt-5 block text-center">Proceed to Checkout</a>
    <a href="/shop" class="mt-3 block text-center text-sm font-medium text-indigo-600 hover:underline">Continue shopping</a>
  </aside>`;
}

function renderCart(root, cart) {
  if (!cart.items.length) {
    root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p class="text-lg font-semibold text-slate-800">Your cart is empty</p>
      <p class="mt-1 text-sm text-slate-500">Find something useful in the shop.</p>
      <a href="/shop" class="btn-primary mt-5 inline-block">Browse products</a>
    </div>`;
    return;
  }

  const notice =
    cart.removed > 0
      ? '<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Some items were removed because they are no longer available.</div>'
      : '';

  root.innerHTML = `${notice}<div class="grid gap-6 lg:grid-cols-3">
    <ul class="min-w-0 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4 shadow-sm lg:col-span-2">
      ${cart.items.map(itemHtml).join('')}
    </ul>
    ${summaryHtml(cart)}
  </div>`;
}

async function initCartPage() {
  const root = document.getElementById('cart-root');
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  let cart;
  try {
    cart = await getCart();
    renderCart(root, cart);
  } catch (err) {
    root.innerHTML =
      '<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load your cart. Please refresh the page.</div>';
    return;
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = Number(button.dataset.id);
    const item = cart.items.find((entry) => entry.product_id === id);
    if (!item) return;

    button.disabled = true;
    try {
      if (button.dataset.action === 'remove') {
        cart = await removeFromCart(id);
      } else {
        const change = button.dataset.action === 'inc' ? 1 : -1;
        cart = await updateQuantity(id, item.quantity + change);
      }
      renderCart(root, cart);
    } catch (err) {
      toast(err.message);
      button.disabled = false;
    }
  });
}

if (document.getElementById('cart-root')) initCartPage();