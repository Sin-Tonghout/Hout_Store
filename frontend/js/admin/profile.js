import { api } from '../api.js';
import { esc, formatDate, toast } from '../ui.js';
import { getCurrentUser } from '../auth.js';
import { renderTopbar } from './layout.js';

const $ = (id) => document.getElementById(id);

const ROLE_LABELS = { admin: 'Admin', super_admin: 'Super admin', customer: 'Customer' };

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function showError(boxId, message) {
  const box = $(boxId);
  box.textContent = message;
  box.classList.remove('hidden');
}

function hideError(boxId) {
  $(boxId).classList.add('hidden');
}

function renderCard(user) {
  $('profile-card').innerHTML = `
    <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">${esc(initials(user.name))}</div>
    <h2 class="mt-4 text-lg font-semibold text-slate-900">${esc(user.name)}</h2>
    <p class="text-sm text-slate-500">${esc(user.email)}</p>
    <span class="mt-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">${esc(ROLE_LABELS[user.role] || user.role)}</span>
    <p class="mt-4 text-xs text-slate-500">Member since ${esc(formatDate(user.created_at))}</p>`;
}

async function init() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login?next=/admin/profile';
    return;
  }
  renderCard(user);
  $('name').value = user.name;
}

// Change name
$('name-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError('name-error');

  const name = $('name').value.trim();
  if (name.length < 2) return showError('name-error', 'Name must be at least 2 characters');

  const button = event.target.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const res = await api('/api/account/profile', { method: 'PUT', body: { name } });
    renderCard(res.data.user);
    renderTopbar(res.data.user);
    toast('Name updated');
  } catch (err) {
    showError('name-error', err.message);
  } finally {
    button.disabled = false;
  }
});

// Change password
$('password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError('password-error');

  const current = $('current_password').value;
  const next = $('new_password').value;
  const confirm = $('confirm_password').value;

  if (!current) return showError('password-error', 'Enter your current password');
  if (next.length < 8) return showError('password-error', 'New password must be at least 8 characters');
  if (next !== confirm) return showError('password-error', 'The new passwords do not match');

  const button = event.target.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    await api('/api/account/password', {
      method: 'PUT',
      body: { current_password: current, new_password: next },
    });
    event.target.reset();
    toast('Password changed');
  } catch (err) {
    showError('password-error', err.message);
  } finally {
    button.disabled = false;
  }
});

init();