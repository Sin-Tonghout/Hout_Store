import { api } from '../api.js';

const $ = (id) => document.getElementById(id);

// This just reflects .env values you already know you set; it does not
// reveal the token itself.
async function loadStatus() {
  try {
    const { data } = await api('/api/admin/dashboard'); // any authenticated call confirms the session
  } catch {
    // ignore; this call is only used to make sure the page has a valid session
  }
  $('config-status').innerHTML = `
    <div class="flex justify-between"><dt class="text-slate-600">How to check</dt><dd class="text-slate-500">Click "Send test notification" below</dd></div>`;
}

$('send-test').addEventListener('click', async () => {
  const button = $('send-test');
  const box = $('test-result');
  box.classList.add('hidden');
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    await api('/api/admin/telegram/test', { method: 'POST' });
    box.className = 'mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700';
    box.textContent = 'Test message sent. Check your Telegram chat.';
    box.classList.remove('hidden');
  } catch (err) {
    box.className = 'mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700';
    box.textContent = err.message;
    box.classList.remove('hidden');
  } finally {
    button.disabled = false;
    button.textContent = 'Send test notification';
  }
});

loadStatus();