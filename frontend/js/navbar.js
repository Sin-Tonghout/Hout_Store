import { api } from './api.js';
import { getCurrentUser, logout } from './auth.js';
import { getCart } from './cart.js';
import { esc, STORE_NAME } from './ui.js';

const ICON_CART = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>`;
const ICON_MENU = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
const ICON_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>`;

async function loadCategories() {
  try {
    const res = await api('/api/categories');
    return res.data.categories;
  } catch {
    return [];
  }
}

function authHtml(user, desktop = false) {
  if (user) {
    const firstName = String(user.name).split(' ')[0];
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const nameClass = desktop ? 'hidden text-sm text-slate-600 lg:inline' : 'text-sm text-slate-600';

    return `${isAdmin ? '<a href="/admin/dashboard" class="text-sm font-medium text-indigo-600 hover:underline">Admin</a>' : ''}
            <a href="/orders" class="text-sm font-medium text-slate-600 hover:text-indigo-600">My Orders</a>
      <a href="/downloads" class="text-sm font-medium text-slate-600 hover:text-indigo-600">Downloads</a>
      <span class="${nameClass}">Hi, ${esc(firstName)}</span>
      <button type="button" class="js-logout text-sm font-medium text-slate-600 hover:text-indigo-600">Log out</button>`;
  }
  return `<a href="/login" class="text-sm font-medium text-slate-600 hover:text-indigo-600">Log in</a>
    <a href="/register" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Sign up</a>`;
}

function searchForm(value, extraClass) {
  return `<form action="/shop" method="get" role="search" class="${extraClass}">
    <input type="search" name="search" value="${esc(value)}" placeholder="Search products" aria-label="Search products"
      class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200" />
  </form>`;
}

function categoryMenuHtml(categories, mobile) {
  const parentClass = mobile
    ? 'block py-1.5 pl-4 text-sm font-medium text-slate-700 hover:text-indigo-600'
    : 'block px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 hover:text-indigo-600';
  const childClass = mobile
    ? 'block py-1 pl-8 text-sm text-slate-500 hover:text-indigo-600'
    : 'block py-1.5 pl-8 pr-4 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600';

  return categories
    .map((c) => {
      const parent = `<a href="/shop?category=${encodeURIComponent(c.slug)}" class="${parentClass}">${esc(c.name)}</a>`;
      const children = (c.children || [])
        .map(
          (child) =>
            `<a href="/shop?category=${encodeURIComponent(child.slug)}" class="${childClass}">${esc(child.name)}</a>`
        )
        .join('');
      return parent + children;
    })
    .join('');
}

function headerHtml(user, categories) {
  const search = new URLSearchParams(window.location.search).get('search') || '';
  const desktopCategories = categoryMenuHtml(categories, false);
  const mobileCategories = categoryMenuHtml(categories, true);

  return `<header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
      <a href="/" class="text-xl font-bold text-indigo-600">${esc(STORE_NAME)}</a>

      <nav class="ml-4 hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
        <a href="/" class="hover:text-indigo-600">Home</a>
        <a href="/shop" class="hover:text-indigo-600">Shop</a>
        <div class="relative">
          <button id="cat-toggle" type="button" class="flex items-center gap-1 hover:text-indigo-600">Categories ${ICON_CHEVRON}</button>
          <div id="cat-panel" class="absolute left-0 top-full z-50 mt-2 hidden w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
            ${desktopCategories || '<p class="px-4 py-2 text-sm text-slate-500">No categories</p>'}
          </div>
        </div>
      </nav>

      <div class="flex-1"></div>

      ${searchForm(search, 'hidden w-56 md:block')}

      <a href="/cart" class="relative text-slate-600 hover:text-indigo-600" aria-label="Cart">
        ${ICON_CART}
        <span id="cart-count" class="absolute -right-2 -top-2 hidden min-w-5 rounded-full bg-indigo-600 px-1 text-center text-xs font-bold leading-5 text-white"></span>
      </a>

      <div class="hidden items-center gap-3 md:flex">${authHtml(user, true)}</div>

      <button id="menu-toggle" type="button" class="text-slate-600 md:hidden" aria-label="Menu" aria-expanded="false">${ICON_MENU}</button>
    </div>

    <div id="mobile-menu" class="hidden border-t border-slate-200 bg-white px-4 py-4 md:hidden">
      ${searchForm(search, 'mb-4')}
      <nav class="space-y-1 text-sm font-medium text-slate-700">
        <a href="/" class="block py-1.5 hover:text-indigo-600">Home</a>
        <a href="/shop" class="block py-1.5 hover:text-indigo-600">Shop</a>
        <p class="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Categories</p>
        ${mobileCategories}
      </nav>
      <div class="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4">${authHtml(user)}</div>
    </div>
  </header>`;
}

function footerHtml() {
  return `<footer class="mt-12 border-t border-slate-200 bg-white">
    <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-semibold text-slate-900">${esc(STORE_NAME)}</p>
        <p>Digital Products. Simple. Useful. Instant.</p>
      </div>
      <nav class="flex gap-4">
        <a href="/" class="hover:text-indigo-600">Home</a>
        <a href="/shop" class="hover:text-indigo-600">Shop</a>
      </nav>
      <p>&copy; ${new Date().getFullYear()} ${esc(STORE_NAME)}. All rights reserved.</p>
    </div>
  </footer>`;
}

function setCartCount(count) {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.classList.toggle('hidden', !(count > 0));
}

// Any page can change the cart, and the number here follows
window.addEventListener('cart:changed', (event) => setCartCount(event.detail.count));

function bindHeader() {
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const catToggle = document.getElementById('cat-toggle');
  const catPanel = document.getElementById('cat-panel');

  menuToggle.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.toggle('hidden');
    menuToggle.setAttribute('aria-expanded', String(!isHidden));
  });

  catToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    catPanel.classList.toggle('hidden');
  });

  document.addEventListener('click', (event) => {
    if (!catPanel.contains(event.target)) catPanel.classList.add('hidden');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      catPanel.classList.add('hidden');
      mobileMenu.classList.add('hidden');
    }
  });

  document.querySelectorAll('.js-logout').forEach((button) => {
    button.addEventListener('click', () => logout());
  });
}

async function initLayout() {
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');

  if (footerEl) footerEl.innerHTML = footerHtml();
  if (!headerEl) return;

  const [user, categories] = await Promise.all([getCurrentUser(), loadCategories()]);
  headerEl.innerHTML = headerHtml(user, categories);
  bindHeader();

  getCart().catch(() => {}); // shows the cart number
}

initLayout();