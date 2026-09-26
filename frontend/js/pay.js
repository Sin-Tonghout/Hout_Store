import { api } from './api.js';
import { esc, formatPrice } from './ui.js';

const root = document.getElementById('pay-root');

// /orders/12/pay  ->  ["orders", "12", "pay"]
const orderId = window.location.pathname.split('/').filter(Boolean)[1];

function message(title, text) {
  root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
    <p class="text-lg font-semibold text-slate-800">${esc(title)}</p>
    <p class="mt-1 text-sm text-slate-500">${esc(text)}</p>
    <a href="/orders" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Go to my orders</a>
  </div>`;
}

function render(order) {
  root.innerHTML = `
    <h1 class="text-3xl font-bold text-slate-900">Payment</h1>
    <p class="mt-1 text-slate-600">Order ${esc(order.order_number)}. Complete the payment to confirm your order.</p>

    <div class="mt-6 grid gap-6 md:grid-cols-5">
      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-3">
        <h2 class="font-semibold text-slate-900">Demo payment</h2>
        <p class="mt-1 text-sm text-slate-500">This is a test payment page. No real money is used. Choose what should happen:</p>

        <div id="pay-result" class="mt-4 hidden rounded-lg border p-3 text-sm"></div>

        <div class="mt-5 space-y-3">
          <button type="button" data-outcome="success"
            class="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Simulate Success</button>
          <button type="button" data-outcome="failed"
            class="w-full rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">Simulate Failed</button>
          <button type="button" data-outcome="cancelled"
            class="w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">Simulate Cancelled</button>
        </div>
      </section>

      <aside class="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
        <h2 class="font-semibold text-slate-900">Order summary</h2>
        <ul class="mt-4 divide-y divide-slate-100 text-sm">
          ${order.items
            .map(
              (item) => `<li class="flex justify-between gap-3 py-2">
                <span class="min-w-0 text-slate-700">${esc(item.product_name)} <span class="text-slate-400">&times; ${item.quantity}</span></span>
                <span class="shrink-0 font-medium text-slate-900">${formatPrice(item.subtotal)}</span>
              </li>`
            )
            .join('')}
        </ul>
        <div class="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
          <span>Total</span><span>${formatPrice(order.total)}</span>
        </div>
      </aside>
    </div>`;

  const resultBox = root.querySelector('#pay-result');

  function showResult(text, kind) {
    const styles = {
      error: 'border-red-200 bg-red-50 text-red-700',
      warning: 'border-amber-200 bg-amber-50 text-amber-800',
    };
    resultBox.className = `mt-4 rounded-lg border p-3 text-sm ${styles[kind]}`;
    resultBox.textContent = text;
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-outcome]');
    if (!button) return;

    const buttons = root.querySelectorAll('button[data-outcome]');
    buttons.forEach((b) => (b.disabled = true));
    resultBox.classList.add('hidden');

    try {
      const { data } = await api('/api/payments/demo', {
        method: 'POST',
        body: { order_id: Number(orderId), outcome: button.dataset.outcome },
      });

      if (data.payment.status === 'success') {
        window.location.href = `/orders/${orderId}?paid=1`;
        return; // buttons stay disabled while the page changes
      }

      if (data.payment.status === 'failed') {
        showResult('Payment failed. Your order is still open, so you can try again.', 'error');
      } else {
        showResult('Payment cancelled. Your order is still waiting for payment.', 'warning');
      }
    } catch (err) {
      // 409 = already paid or no longer payable: the order page shows the real state
      if (err.status === 409) {
        window.location.href = `/orders/${orderId}`;
        return;
      }
      showResult(err.message, 'error');
    }

    buttons.forEach((b) => (b.disabled = false));
  });
}

async function init() {
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  try {
    const { data } = await api(`/api/orders/${encodeURIComponent(orderId)}`);
    const order = data.order;

    if (order.payment_status === 'success') {
      window.location.replace(`/orders/${order.id}`);
      return;
    }
    if (order.status !== 'pending') {
      message('This order can no longer be paid', `Its status is "${order.status}".`);
      return;
    }

    render(order);
  } catch (err) {
    if (err.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    } else if (err.status === 404) {
      message('Order not found', 'It may belong to another account.');
    } else {
      message('Could not load this order', err.message);
    }
  }
}

init();