import { esc, STORE_NAME } from '../ui.js';
import { getCurrentUser, logout } from '../auth.js';

const ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/telegram', label: 'Telegram' },
  { href: '/admin/settings', label: 'Settings' },
];

const ICON_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4 text-slate-500"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>`;

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

// ---------- Sidebar ----------

function sidebarHtml() {
  const currentPath = window.location.pathname;

  const links = ITEMS.map((item) => {
    const active = currentPath.startsWith(item.href);
    const style = active
      ? 'bg-indigo-600 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white';
    return `<a href="${item.href}" class="rounded-lg px-3 py-2 text-sm font-medium ${style}">${item.label}</a>`;
  }).join('');

  return `<div class="px-4 py-4">
      <a href="/admin/dashboard" class="text-lg font-bold text-white">${esc(STORE_NAME)}</a>
      <p class="text-xs text-slate-400">Admin</p>
    </div>
    <nav class="flex flex-wrap gap-1 px-3 pb-3 md:flex-col">${links}</nav>
    <div class="border-t border-slate-800 px-4 py-3 text-sm md:mt-6">
      <a href="/" class="text-slate-300 hover:text-white">View store</a>
    </div>`;
}

// ---------- Top navbar ----------

function topbarHtml(user) {
  const name = user ? user.name : '';
  const email = user ? user.email : '';

  return `<div class="flex h-14 items-center justify-between px-4 md:px-8">
    <p class="text-sm font-medium text-slate-500">Admin panel</p>

    <div class="relative">
      <button id="profile-toggle" type="button" aria-haspopup="true" aria-expanded="false"
        class="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 hover:bg-slate-50">
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">${esc(initials(name))}</span>
        <span class="hidden max-w-32 truncate text-sm font-medium text-slate-700 sm:block">${esc(name)}</span>
        ${ICON_CHEVRON}
      </button>

      <div id="profile-menu" class="absolute right-0 top-full z-30 mt-2 hidden w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        <div class="border-b border-slate-100 px-4 py-3">
          <p class="truncate text-sm font-semibold text-slate-900">${esc(name)}</p>
          <p class="truncate text-xs text-slate-500">${esc(email)}</p>
        </div>
        <a href="/admin/profile" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Profile</a>
        <button type="button" id="profile-logout" class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50">Log out</button>
      </div>
    </div>
  </div>`;
}

function bindTopbar() {
  const toggle = document.getElementById('profile-toggle');
  const menu = document.getElementById('profile-menu');

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const isHidden = menu.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', String(!isHidden));
  });

  document.getElementById('profile-logout').addEventListener('click', () => logout());
}

// Also used by the profile page to refresh the badge after a name change
export function renderTopbar(user) {
  const topbar = document.getElementById('admin-topbar');
  if (!topbar) return;
  topbar.innerHTML = topbarHtml(user);
  bindTopbar();
}

// Close the dropdown when clicking elsewhere or pressing Escape
document.addEventListener('click', (event) => {
  const menu = document.getElementById('profile-menu');
  if (menu && !menu.contains(event.target)) menu.classList.add('hidden');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.classList.add('hidden');
  }
});

// ---------- Start ----------

const sidebar = document.getElementById('admin-sidebar');
if (sidebar) sidebar.innerHTML = sidebarHtml();

renderTopbar(null);
getCurrentUser().then((user) => renderTopbar(user));