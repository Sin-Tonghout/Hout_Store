import { api } from './api.js';
import { esc, coverHtml, formatDateOnly } from './ui.js';

const root = document.getElementById('downloads-root');

function cardHtml(d) {
  const cover = coverHtml({ id: d.product_slug ? d.product_slug.length : 0, name: d.product_name, cover_image: d.cover_image });
  const productUrl = d.product_slug ? `/product/${encodeURIComponent(d.product_slug)}` : null;

  let action;
  if (d.expired) {
    action = '<span class="text-sm font-medium text-red-600">Link expired</span>';
  } else if (d.limit_reached) {
    action = '<span class="text-sm font-medium text-red-600">Download limit reached</span>';
  } else {
    action = `<a href="/api/download/${d.token}" class="btn-primary">Download</a>`;
  }

  return `<div class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">${cover}</div>
    <div class="min-w-0 flex-1">
      ${productUrl ? `<a href="${productUrl}" class="font-medium text-slate-900 hover:text-indigo-600">${esc(d.product_name)}</a>` : `<p class="font-medium text-slate-900">${esc(d.product_name)}</p>`}
      <p class="text-xs text-slate-500">Order ${esc(d.order_number)} &middot; ${d.downloads_used} / ${d.downloads_max} downloads used &middot; expires ${esc(formatDateOnly(d.expires_at))}</p>
    </div>
    <div class="shrink-0">${action}</div>
  </div>`;
}

async function init() {
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  try {
    const { data } = await api('/api/download');

    if (!data.downloads.length) {
      root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p class="text-lg font-semibold text-slate-800">No downloads yet</p>
        <p class="mt-1 text-sm text-slate-500">Products you buy will appear here after payment.</p>
        <a href="/shop" class="btn-primary mt-5 inline-block">Browse products</a>
      </div>`;
      return;
    }

    root.innerHTML = `<div class="space-y-3">${data.downloads.map(cardHtml).join('')}</div>`;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = '/login?next=/downloads';
      return;
    }
    root.innerHTML = `<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">${esc(err.message)}</div>`;
  }
}

init();