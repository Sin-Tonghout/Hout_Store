import { api } from '../api.js';
import { toast } from '../ui.js';

const $ = (id) => document.getElementById(id);
const form = $('settings-form');
const errorBox = $('settings-error');

function fill(settings) {
  $('store_name').value = settings.store_name || '';
  $('store_tagline').value = settings.store_tagline || '';
  $('receipt_footer').value = settings.receipt_footer || '';
  $('download_max_count').value = settings.download_max_count || 5;
  $('download_expiry_days').value = settings.download_expiry_days || 7;
}

async function init() {
  try {
    const { data } = await api('/api/admin/settings');
    fill(data.settings);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.add('hidden');

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const { data } = await api('/api/admin/settings', {
      method: 'PUT',
      body: {
        store_name: $('store_name').value.trim(),
        store_tagline: $('store_tagline').value.trim(),
        receipt_footer: $('receipt_footer').value.trim(),
        download_max_count: Number($('download_max_count').value),
        download_expiry_days: Number($('download_expiry_days').value),
      },
    });
    fill(data.settings);
    toast('Settings saved');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    button.disabled = false;
  }
});

init();