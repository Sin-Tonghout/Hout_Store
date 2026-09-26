import { api } from "../api.js";
import { esc, formatPrice, formatFileSize, coverHtml, toast } from "../ui.js";
import { categoryOptionsHtml, productCategoryPath } from "./common.js";

const PER_PAGE = 10;
const state = { search: "", status: "", category: "", page: 1 };

const rows = document.getElementById("product-rows");
const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("filter-search");
const statusSelect = document.getElementById("filter-status");
const categorySelect = document.getElementById("filter-category");

const BADGES = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-slate-200 text-slate-600",
};

function messageRow(text) {
  return `<tr><td colspan="6" class="px-4 py-10 text-center text-slate-500">${esc(text)}</td></tr>`;
}

function rowHtml(p) {
  const toggleLabel = p.status === "published" ? "Unpublish" : "Publish";

  return `<tr>
    <td class="px-4 py-3">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">${coverHtml(p, true)}</div>
        <div class="min-w-0">
          <p class="font-medium text-slate-900">${esc(p.name)}${p.featured ? ' <span class="text-xs font-semibold text-indigo-600">Featured</span>' : ""}</p>
          <p class="text-xs text-slate-500">${esc(p.slug)}</p>
        </div>
      </div>
    </td>
        <td class="px-4 py-3 text-slate-600">${esc(productCategoryPath(p))}</td>
    <td class="px-4 py-3 text-slate-900">${formatPrice(p.price)}</td>
    <td class="px-4 py-3"><span class="rounded-full px-2 py-0.5 text-xs font-semibold ${BADGES[p.status] || ""}">${esc(p.status)}</span></td>
    <td class="px-4 py-3 text-slate-600">${
      p.has_file
        ? `${esc(p.file_type || "FILE")} ${esc(formatFileSize(p.file_size))}`
        : '<span class="text-red-600">No file</span>'
    }</td>
    <td class="px-4 py-3">
            <div class="flex justify-end gap-2 whitespace-nowrap">
        <a href="/admin/products/${p.id}/edit" class="btn-sm btn-sm-indigo">Edit</a>
        <button type="button" data-action="toggle" data-id="${p.id}" data-status="${esc(p.status)}" class="btn-sm ${p.status === 'published' ? 'btn-sm-gray' : 'btn-sm-green'}">${toggleLabel}</button>
        <button type="button" data-action="delete" data-id="${p.id}" data-name="${esc(p.name)}" class="btn-sm btn-sm-red">Delete</button>
      </div>
    </td>
  </tr>`;
}

function renderPagination({ page, totalPages, total }) {
  if (totalPages <= 1) {
    pagination.innerHTML = `<span class="text-sm text-slate-500">${total} product${total === 1 ? "" : "s"}</span>`;
    return;
  }
  const button = (label, target, disabled) =>
    `<button type="button" data-page="${target}" ${disabled ? "disabled" : ""}
      class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">${label}</button>`;

  pagination.innerHTML = `${button("Previous", page - 1, page <= 1)}
    <span class="text-sm text-slate-600">Page ${page} of ${totalPages}</span>
    ${button("Next", page + 1, page >= totalPages)}`;
}

async function load() {
  rows.innerHTML = messageRow("Loading...");

  const query = new URLSearchParams({ page: state.page, limit: PER_PAGE });
  if (state.search) query.set("search", state.search);
  if (state.status) query.set("status", state.status);
  if (state.category) query.set("category_id", state.category);

  try {
    const { data } = await api(`/api/admin/products?${query}`);
    rows.innerHTML = data.products.length
      ? data.products.map(rowHtml).join("")
      : messageRow("No products found");
    renderPagination(data.pagination);
  } catch (err) {
    rows.innerHTML = messageRow(err.message);
  }
}

// Filters
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = searchInput.value.trim();
    state.page = 1;
    load();
  }, 300);
});
statusSelect.addEventListener("change", () => {
  state.status = statusSelect.value;
  state.page = 1;
  load();
});
categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  state.page = 1;
  load();
});

pagination.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (!button || button.disabled) return;
  state.page = Number(button.dataset.page);
  load();
});

// Publish / unpublish / delete
rows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;

  try {
    if (button.dataset.action === "toggle") {
      const next =
        button.dataset.status === "published" ? "draft" : "published";
      await api(`/api/products/${id}/status`, {
        method: "PATCH",
        body: { status: next },
      });
      toast(next === "published" ? "Product published" : "Product unpublished");
    } else if (button.dataset.action === "delete") {
      if (
        !window.confirm(
          `Delete "${button.dataset.name}"? This cannot be undone.`,
        )
      )
        return;
      await api(`/api/products/${id}`, { method: "DELETE" });
      toast("Product deleted");
    }
    await load();
  } catch (err) {
    toast(err.message);
  }
});

async function init() {
  const flash = sessionStorage.getItem("flash");
  if (flash) {
    toast(flash);
    sessionStorage.removeItem("flash");
  }

  try {
    const { data } = await api("/api/admin/categories");
    categorySelect.innerHTML =
      '<option value="">All categories</option>' +
      categoryOptionsHtml(data.categories);
  } catch (err) {
    // the list still works without the category filter
  }

  load();
}

init();
