export const STORE_NAME = "Hout Store";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Always escape data before putting it inside HTML (prevents XSS)
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function formatPrice(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

export function formatFileSize(bytes) {
  let size = Number(bytes);
  if (!size) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const PLACEHOLDER_COLORS = [
  'bg-indigo-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-600',
];

function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

// Cover image, or a solid-color placeholder when the product has no image yet
export function coverHtml(product, compact = false) {
  if (product.cover_image) {
    return `<img src="${esc(product.cover_image)}" alt="${esc(product.name)}" loading="lazy" class="h-full w-full object-cover" />`;
  }
  const color = PLACEHOLDER_COLORS[product.id % PLACEHOLDER_COLORS.length];
  const textSize = compact ? 'text-sm' : 'text-4xl';
  return `<div class="flex h-full w-full items-center justify-center ${color}">
    <span class="${textSize} font-bold text-white/90">${esc(initials(product.name))}</span>
  </div>`;
}

export function productCard(p) {
  const url = `/product/${encodeURIComponent(p.slug)}`;
  const hasDiscount = p.compare_price && p.compare_price > p.price;
  const percent = hasDiscount
    ? Math.round((1 - p.price / p.compare_price) * 100)
    : 0;

  return `<article class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
    <a href="${url}" class="relative block aspect-4/3 overflow-hidden bg-slate-100">
      ${coverHtml(p)}
      ${hasDiscount ? `<span class="absolute left-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">-${percent}%</span>` : ""}
    </a>
    <div class="flex flex-1 flex-col p-4">
      ${p.category_name ? `<span class="text-xs font-semibold uppercase tracking-wide text-indigo-600">${esc(p.category_name)}</span>` : ""}
      <h3 class="mt-1 font-semibold text-slate-900"><a href="${url}" class="hover:text-indigo-600">${esc(p.name)}</a></h3>
      <p class="mt-1 line-clamp-2 text-sm text-slate-600">${esc(p.short_description)}</p>
      <div class="mt-auto flex items-center justify-between pt-4">
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-slate-900">${formatPrice(p.price)}</span>
          ${hasDiscount ? `<span class="text-sm text-slate-400 line-through">${formatPrice(p.compare_price)}</span>` : ""}
        </div>
        <a href="${url}" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">View Product</a>
      </div>
    </div>
  </article>`;
}

// Loading state
export function productSkeletons(count = 4) {
  return Array.from({ length: count })
    .map(
      () => `<div class="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="aspect-4/3 bg-slate-200"></div>
        <div class="space-y-3 p-4">
          <div class="h-3 w-1/3 rounded bg-slate-200"></div>
          <div class="h-4 w-3/4 rounded bg-slate-200"></div>
          <div class="h-3 w-full rounded bg-slate-200"></div>
        </div>
      </div>`,
    )
    .join("");
}

// Error state
export function errorHtml(message = "Something went wrong. Please try again.") {
  return `<div class="col-span-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">${esc(message)}</div>`;
}

export function toast(message, duration = 3500) {
  const el = document.createElement('div');
  el.className =
    'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// Back button: goes to the previous page of this site, or to a fallback page.
// Use it anywhere with: <button type="button" data-back data-fallback="/shop">
export function backButtonHtml(fallback = '/') {
  return `<button type="button" data-back data-fallback="${esc(fallback)}"
    class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">&larr; Back</button>`;
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-back]');
  if (!button) return;

  let cameFromThisSite = false;
  try {
    cameFromThisSite =
      Boolean(document.referrer) &&
      new URL(document.referrer).origin === window.location.origin;
  } catch {
    cameFromThisSite = false;
  }

  if (cameFromThisSite && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = button.dataset.fallback || '/';
  }
});

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}