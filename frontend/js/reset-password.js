import { api } from './api.js';

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const form = document.getElementById('reset-password-form');
const errorBox = document.getElementById('form-error');
const noTokenBox = document.getElementById('no-token');

if (!token) {
  form.classList.add('hidden');
  noTokenBox.classList.remove('hidden');
} else {
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');

    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password !== confirmPassword) {
      errorBox.textContent = 'Passwords do not match.';
      errorBox.classList.remove('hidden');
      return;
    }

    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Please wait...';

    try {
      await api('/api/auth/reset-password', { method: 'POST', body: { token, password } });
      window.location.href = '/login?reset=success';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      button.disabled = false;
      button.textContent = label;
    }
  });
}
