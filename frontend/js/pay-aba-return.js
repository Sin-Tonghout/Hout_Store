import { api } from './api.js';
import { esc } from './ui.js';

const orderId = window.location.pathname.split('/').filter(Boolean)[1];
const root = document.getElementById('pay-aba-return-root');

async function verify(attempt = 1) {
  try {
    const { data } = await api('/api/payments/aba/verify', {
      method: 'POST',
      body: { order_id: Number(orderId) },
    });

    if (data.outcome === 'success') {
      window.location.href = `/orders/${orderId}?paid=1`;
      return;
    }
    if (data.outcome === 'failed' || data.outcome === 'cancelled') {
      window.location.href = `/orders/${orderId}/pay`;
      return;
    }
    // still pending on ABA's side: check again briefly, then give up gracefully
    if (attempt < 5) {
      setTimeout(() => verify(attempt + 1), 2000);
    } else {
      root.innerHTML = `<p class="text-slate-700">Your payment is still processing.</p>
        <a href="/orders/${orderId}" class="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">Go to your order</a>`;
    }
  } catch (err) {
    root.innerHTML = `<p class="text-red-600">${esc(err.message)}</p>
      <a href="/orders/${orderId}" class="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">Go to your order</a>`;
  }
}

verify();