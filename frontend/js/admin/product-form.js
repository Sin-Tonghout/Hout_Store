import { api } from '../api.js';
import { formatFileSize, coverHtml } from '../ui.js';
import { categoryOptionsHtml } from './common.js';

const MAX_COVER = 2 * 1024 * 1024;
const MAX_FILE = 500 * 1024 * 1024;

const $ = (id) => document.getElementById(id);

const form = $('product-form');
const errorBox = $('form-error');

// /admin/products/12/edit  ->  edit mode. /admin/products/new  ->  create mode.
const match = window.location.pathname.match(/^\/admin\/products\/(\d+)\/edit$/);
const productId = match ? match[1] : null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fill(p) {
  $('name').value = p.name || '';
  $('slug').value = p.slug || '';
  $('category_id').value = p.category_id ? String(p.category_id) : '';
  $('short_description').value = p.short_description || '';
  $('description').value = p.description || '';
  $('price').value = p.price;
  $('compare_price').value = p.compare_price ?? '';
  $('version').value = p.version || '';
  $('status').value = p.status;
  $('featured').checked = Boolean(p.featured);

  const coverBox = $('cover-current');
  coverBox.classList.remove('hidden');
  if (p.cover_image) {
    coverBox.innerHTML = `<div class="h-24 w-32 overflow-hidden rounded-lg border border-slate-200">${coverHtml(p)}</div>`;
    $('remove-cover-wrap').classList.remove('hidden');
    $('remove-cover-wrap').classList.add('flex');
  } else {
    coverBox.innerHTML = '<p class="text-sm text-slate-500">No cover image yet.</p>';
  }

  $('file-current').textContent = p.has_file
    ? `Current file: ${p.file_type || 'FILE'}, ${formatFileSize(p.file_size)}. Choose a new file only if you want to replace it.`
    : 'No file uploaded yet.';
}

async function init() {
  try {
    const { data } = await api('/api/admin/categories');
    $('category_id').innerHTML =
      '<option value="">No category</option>' + categoryOptionsHtml(data.categories);

    if (!productId) {
      $('file-current').textContent = 'No file uploaded yet.';
      return;
    }

    $('form-title').textContent = 'Edit product';
    document.title = 'Edit product | Admin';

    const res = await api(`/api/admin/products/${productId}`);
    fill(res.data.product);
  } catch (err) {
    showError(err.message);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.add('hidden');

  const cover = $('cover_image').files[0];
  const file = $('digital_file').files[0];

  if (!$('name').value.trim()) return showError('Enter the product name');
  if ($('price').value === '') return showError('Enter a price');
  if (cover && cover.size > MAX_COVER) return showError('Cover image must be 2 MB or smaller');
  if (file && file.size > MAX_FILE) return showError('Digital file must be 500 MB or smaller');

  const data = new FormData(form);
  data.set('featured', $('featured').checked ? '1' : '0');

  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  button.disabled = true;
  button.textContent = file ? 'Uploading... please wait' : 'Saving...';

  try {
    await api(productId ? `/api/products/${productId}` : '/api/products', {
      method: productId ? 'PUT' : 'POST',
      body: data,
    });
    sessionStorage.setItem('flash', productId ? 'Product updated' : 'Product created');
    window.location.href = '/admin/products';
  } catch (err) {
    showError(err.message);
    button.disabled = false;
    button.textContent = label;
  }
});

init();