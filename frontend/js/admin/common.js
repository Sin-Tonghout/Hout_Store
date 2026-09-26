import { esc } from '../ui.js';

// "E-books / Paid" for a sub-category, "E-books" for a top-level category
export function categoryLabel(category) {
  return category.parent_name
    ? `${category.parent_name} / ${category.name}`
    : category.name;
}

// Same idea for a product row
export function productCategoryPath(product) {
  if (!product.category_name) return '-';
  return product.parent_category_name
    ? `${product.parent_category_name} / ${product.category_name}`
    : product.category_name;
}

// <option> list for category selects (product form and product filter)
export function categoryOptionsHtml(categories) {
  return categories
    .map(
      (c) =>
        `<option value="${c.id}">${esc(categoryLabel(c))}${c.status === 'inactive' ? ' (inactive)' : ''}</option>`
    )
    .join('');
}