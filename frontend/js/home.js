import { api } from './api.js';
import { esc, productCard, productSkeletons, errorHtml } from './ui.js';

const featuredGrid = document.getElementById('featured-grid');
const categoriesGrid = document.getElementById('categories-grid');

async function loadFeatured() {
  featuredGrid.innerHTML = productSkeletons(4);
  try {
    const { data } = await api('/api/products?featured=1&limit=4');
    featuredGrid.innerHTML = data.products.length
      ? data.products.map(productCard).join('')
      : '<p class="col-span-full text-slate-500">No featured products yet.</p>';
  } catch (err) {
    featuredGrid.innerHTML = errorHtml('Could not load featured products.');
  }
}

async function loadCategories() {
  try {
    const { data } = await api('/api/categories');
    categoriesGrid.innerHTML = data.categories
      .map(
        (c) => `<a href="/shop?category=${encodeURIComponent(c.slug)}"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50">
          <span class="block font-semibold text-slate-900">${esc(c.name)}</span>
          <span class="mt-1 block text-xs text-slate-500">${c.product_count} product${c.product_count === 1 ? '' : 's'}</span>
        </a>`
      )
      .join('');
  } catch (err) {
    categoriesGrid.innerHTML = errorHtml('Could not load categories.');
  }
}

loadFeatured();
loadCategories();