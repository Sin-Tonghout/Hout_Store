import { api } from "./api.js";
import {
  esc,
  formatPrice,
  formatFileSize,
  coverHtml,
  productCard,
  toast,
  backButtonHtml,
} from "./ui.js";
import { STORE_NAME } from "./ui.js";
import { addToCart, getCart } from './cart.js';

const root = document.getElementById("product-root");
const slug = decodeURIComponent(
  window.location.pathname.split("/").filter(Boolean).pop() || "",
);

function renderNotFound() {
  document.title = `Product not found | ${STORE_NAME}`;
  root.innerHTML = `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
    <p class="text-lg font-semibold text-slate-800">Product not found</p>
    <p class="mt-1 text-sm text-slate-500">It may have been removed or the link is wrong.</p>
    <a href="/shop" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Back to the shop</a>
  </div>`;
}

function renderProduct({ product: p, related }) {
  document.title = `${p.name} | ${STORE_NAME}`;

  const hasDiscount = p.compare_price && p.compare_price > p.price;
  const percent = hasDiscount
    ? Math.round((1 - p.price / p.compare_price) * 100)
    : 0;

  const meta = [
    ["Category", p.category_name],
    ["Version", p.version],
    ["File type", p.file_type],
    ["File size", p.file_size ? formatFileSize(p.file_size) : null],
  ].filter(([, value]) => value);

  root.innerHTML = `
      <div class="mb-4">${backButtonHtml('/shop')}</div>
    <nav class="text-sm text-slate-500" aria-label="Breadcrumb">
      <a href="/" class="hover:text-indigo-600">Home</a> /
      <a href="/shop" class="hover:text-indigo-600">Shop</a> /
            ${p.parent_category_name ? `<a href="/shop?category=${encodeURIComponent(p.parent_category_slug)}" class="hover:text-indigo-600">${esc(p.parent_category_name)}</a> /` : ""}
      ${p.category_name ? `<a href="/shop?category=${encodeURIComponent(p.category_slug)}" class="hover:text-indigo-600">${esc(p.category_name)}</a> /` : ""}
      <span class="text-slate-700">${esc(p.name)}</span>
    </nav>

    <div class="mt-6 grid gap-8 lg:grid-cols-2">
      <div class="aspect-4/3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">${coverHtml(p)}</div>

      <div>
        ${p.category_name ? `<span class="text-xs font-semibold uppercase tracking-wide text-indigo-600">${esc(p.category_name)}</span>` : ""}
        <h1 class="mt-1 text-3xl font-bold text-slate-900">${esc(p.name)}</h1>
        ${p.short_description ? `<p class="mt-3 text-slate-600">${esc(p.short_description)}</p>` : ""}

        <dl class="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white text-sm">
          ${meta
            .map(
              ([
                label,
                value,
              ]) => `<div class="flex justify-between px-4 py-2.5">
                <dt class="text-slate-500">${label}</dt><dd class="font-medium text-slate-800">${esc(value)}</dd>
              </div>`,
            )
            .join("")}
        </dl>

        <div class="mt-6 flex flex-wrap items-baseline gap-3">
          <span class="text-3xl font-bold text-slate-900">${formatPrice(p.price)}</span>
          ${
            hasDiscount
              ? `<span class="text-lg text-slate-400 line-through">${formatPrice(p.compare_price)}</span>
                 <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Save ${percent}%</span>`
              : ""
          }
        </div>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <button id="add-to-cart" type="button" class="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">Add to Cart</button>
          <button id="buy-now" type="button" class="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-100">Buy Now</button>
        </div>

        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>&#10003; Instant digital download after payment</li>
          <li>&#10003; Secure download link in your account</li>
          <li>&#10003; Receipt for every order</li>
        </ul>
      </div>
    </div>

    ${
      p.description
        ? `<section class="mt-12">
            <h2 class="text-xl font-bold text-slate-900">About this product</h2>
            <div class="mt-3 max-w-3xl whitespace-pre-line leading-relaxed text-slate-700">${esc(p.description)}</div>
          </section>`
        : ""
    }

    ${
      related.length
        ? `<section class="mt-12">
            <h2 class="text-xl font-bold text-slate-900">Related Products</h2>
            <div class="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">${related.map(productCard).join("")}</div>
          </section>`
        : ""
    }
  `;

   root.querySelector('#add-to-cart').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await addToCart(p.id, 1);
      toast('Added to cart');
    } catch (err) {
      toast(err.message);
    } finally {
      button.disabled = false;
    }
  });

  // Buy Now: make sure the product is in the cart (once), then go to checkout
  root.querySelector('#buy-now').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const cart = await getCart();
      if (!cart.items.some((item) => item.product_id === p.id)) {
        await addToCart(p.id, 1);
      }
      window.location.href = '/checkout';
    } catch (err) {
      toast(err.message);
      button.disabled = false;
    }
  });
}

async function load() {
  root.innerHTML = '<p class="py-20 text-center text-slate-500">Loading...</p>';
  try {
    const { data } = await api(`/api/products/${encodeURIComponent(slug)}`);
    renderProduct(data);
  } catch (err) {
    if (err.status === 404) {
      renderNotFound();
    } else {
      root.innerHTML =
        '<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load this product. Please refresh the page.</div>';
    }
  }
}

load();
