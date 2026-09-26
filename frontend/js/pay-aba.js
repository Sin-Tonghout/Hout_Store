import { api } from './api.js';
import { esc } from './ui.js';

const orderId = window.location.pathname.split('/').filter(Boolean)[1];
const root = document.getElementById('aba-qr-root');

function renderLoading() {
  root.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p class="text-slate-500">Getting your QR code...</p>
    </div>`;
}

function renderError(message) {
  root.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p class="text-red-600">${esc(message)}</p>
      <a href="/orders/${orderId}/pay" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Back to payment options</a>
    </div>`;
}

function renderQr(data) {
  root.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <p class="text-lg font-semibold text-slate-900">Scan to pay</p>
      <p class="mt-1 text-sm text-slate-500">Open the ABA Mobile app and scan this KHQR code.</p>

      <div class="mx-auto mt-6 flex aspect-square w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
        <img src="${data.qrImageDataUrl}" alt="ABA PayWay QR code" class="h-full w-full object-contain" />
      </div>

      <p id="qr-status" class="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
        <span class="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
        Waiting for payment...
      </p>

      ${data.deeplink ? `<a href="${esc(data.deeplink)}" class="btn-primary mt-5 block sm:hidden">Open ABA Mobile App</a>` : ''}

      <a href="/orders/${orderId}" class="mt-4 block text-sm text-slate-500 hover:underline">Cancel and go back</a>
    </div>`;

  setTimeout(() => pollForPayment(), 4000);
}

function submitHostedCheckout(hosted) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = hosted.action;
  Object.entries(hosted.fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

async function pollForPayment(attempt = 1) {
  const statusEl = document.getElementById('qr-status');
  try {
    const { data } = await api('/api/payments/aba/verify', { method: 'POST', body: { order_id: Number(orderId) } });

    if (data.outcome === 'success') {
      if (statusEl) statusEl.textContent = 'Payment received!';
      window.location.href = `/orders/${orderId}?paid=1`;
      return;
    }
    if (data.outcome === 'failed' || data.outcome === 'cancelled') {
      if (statusEl) statusEl.textContent = 'Payment was not completed. You can try again.';
      return;
    }
  } catch {
    // ignore transient errors while polling
  }

  if (attempt < 60) {
    setTimeout(() => pollForPayment(attempt + 1), 3000); // check every 3s, up to ~3 minutes
  } else if (statusEl) {
    statusEl.textContent = 'Still waiting for payment. Refresh this page to keep checking.';
  }
}

async function init() {
  renderLoading();
  try {
    const { data } = await api('/api/payments/aba/qr', { method: 'POST', body: { order_id: Number(orderId) } });
    renderQr(data);
  } catch (err) {
    renderError(err.message);
  }
}

init();