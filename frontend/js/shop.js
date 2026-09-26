import { api } from './api.js';
import { productCard, productSkeletons, errorHtml, esc } from './ui.js';

const PER_PAGE = 9;

const params = new URLSearchParams(window.location.search);
const state = {
  search: params.get('search') || '',
  category: params.get('category') || '',
  sort: params.get('sort') || 'newest',
  page: Math.max(1, parseInt(params.get('page'), 10) || 1),
};

const grid = document.getElementById('product-grid');
const chips = document.getElementById('category-chips');
const subChips = document.getElementById('subcategory-chips');
const resultCount = document.getElementById('result-count');
const sortSelect = document.getElementById('sort-select');
const pagination = document.getElementById('pagination');

// Build a shop URL from the current filters, changing only what is given
function buildUrl(overrides = {}) {
  const next = { ...state, ...overrides };
  const query = new URLSearchParams();
  if (next.search) query.set('search', next.search);
  if (next.category) query.set('category', next.category);
  if (next.sort && next.sort !== 'newest') query.set('sort', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  const text = query.toString();
  return text ? `/shop?${text}` : '/shop';
}

// categories (with children) -> one flat list
function flatten(categories) {
  return categories.flatMap((c) => [c, ...(c.children || [])]);
}

function renderChips(categories) {
  const chip = (label, slug, active, size) => {
    const style = active
      ? 'border-indigo-600 bg-indigo-600 text-white'
      : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400';
    return `<a href="${esc(buildUrl({ category: slug, page: 1 }))}"
      class="rounded-full border font-medium ${size} ${style}">${esc(label)}</a>`;
  };

  const subChip = (label, slug, active) => {
    const style = active
      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400';
    return `<a href="${esc(buildUrl({ category: slug, page: 1 }))}"
      class="rounded-full border px-3 py-1 text-xs font-medium ${style}">${esc(label)}</a>`;
  };

  // the top-level category that is selected, or that owns the selected sub-category
  const activeTop = categories.find(
    (c) => c.slug === state.category || (c.children || []).some((child) => child.slug === state.category)
  );

  chips.innerHTML =
    chip('All', '', state.category === '', 'px-4 py-1.5 text-sm') +
    categories
      .map((c) => chip(c.name, c.slug, Boolean(activeTop) && activeTop.id === c.id, 'px-4 py-1.5 text-sm'))
      .join('');

  if (activeTop && activeTop.children.length) {
    subChips.className = 'mt-3 flex flex-wrap gap-2';
    subChips.innerHTML =
      subChip(`All ${activeTop.name}`, activeTop.slug, state.category === activeTop.slug) +
      activeTop.children.map((child) => subChip(child.name, child.slug, state.category === child.slug)).join('');
  } else {
    subChips.className = '';
    subChips.innerHTML = '';
  }
}

function renderCount(total, categories) {
  const parts = [`${total} product${total === 1 ? '' : 's'}`];
  const category = flatten(categories).find((c) => c.slug === state.category);
  if (category) parts.push(`in ${category.name}`);
  if (state.search) parts.push(`matching "${state.search}"`);
  resultCount.textContent = parts.join(' ');
}

function renderPagination({ page, totalPages }) {
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  const link = (label, target, disabled) =>
    disabled
      ? `<span class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-300">${label}</span>`
      : `<a href="${esc(buildUrl({ page: target }))}" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100">${label}</a>`;

  pagination.innerHTML = `${link('Previous', page - 1, page <= 1)}
    <span class="text-sm text-slate-600">Page ${page} of ${totalPages}</span>
    ${link('Next', page + 1, page >= totalPages)}`;
}

function emptyState() {
  return `<div class="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
    <p class="font-medium text-slate-700">No products found</p>
    <p class="mt-1 text-sm text-slate-500">Try a different search or category.</p>
    <a href="/shop" class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Clear filters</a>
  </div>`;
}

async function load() {
  sortSelect.value = state.sort;
  grid.innerHTML = productSkeletons(PER_PAGE);

  const query = new URLSearchParams({ page: state.page, limit: PER_PAGE, sort: state.sort });
  if (state.search) query.set('search', state.search);
  if (state.category) query.set('category', state.category);

  try {
    const [categoriesRes, productsRes] = await Promise.all([
      api('/api/categories'),
      api(`/api/products?${query}`),
    ]);

    const categories = categoriesRes.data.categories;
    const { products, pagination: info } = productsRes.data;

    // page number too high (for example ?page=99): go to the last page
    if (!products.length && info.total > 0 && state.page > info.totalPages) {
      window.location.replace(buildUrl({ page: info.totalPages }));
      return;
    }

    renderChips(categories);
    renderCount(info.total, categories);
    grid.innerHTML = products.length ? products.map(productCard).join('') : emptyState();
    renderPagination(info);
  } catch (err) {
    resultCount.textContent = '';
    grid.innerHTML = errorHtml('Could not load products. Please refresh the page.');
  }
}

sortSelect.addEventListener('change', () => {
  window.location.href = buildUrl({ sort: sortSelect.value, page: 1 });
});

load();