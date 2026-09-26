import { api } from './api.js';

const ADMIN_ROLES = ['admin', 'super_admin'];

// Where a user lands after logging in: admins go to the dashboard
function homeFor(user) {
  return user && ADMIN_ROLES.includes(user.role) ? '/admin/dashboard' : '/';
}

export async function getCurrentUser() {
  try {
    const res = await api('/api/auth/me');
    return res.data.user;
  } catch {
    return null; // not logged in
  }
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/';
  }
}

// A ?next= address, only if it is a page on this site
function nextParam() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function bindAuthForm(formId, endpoint, buildBody) {
  const form = document.getElementById(formId);
  if (!form) return;

  const errorBox = document.getElementById('form-error');
  const button = form.querySelector('button[type="submit"]');

  // already logged in? go to the right place
  getCurrentUser().then((user) => {
    if (user) window.location.replace(homeFor(user));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');

    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Please wait...';

    try {
      const res = await api(endpoint, { method: 'POST', body: buildBody(new FormData(form)) });
      window.location.href = nextParam() || homeFor(res.data.user);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      button.disabled = false;
      button.textContent = label;
    }
  });
}

bindAuthForm('login-form', '/api/auth/login', (data) => ({
  email: data.get('email'),
  password: data.get('password'),
}));

bindAuthForm('register-form', '/api/auth/register', (data) => ({
  name: data.get('name'),
  email: data.get('email'),
  password: data.get('password'),
}));