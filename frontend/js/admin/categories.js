import { api } from "../api.js";
import { esc, toast } from "../ui.js";

const $ = (id) => document.getElementById(id);

const form = $("category-form");
const rows = $("category-rows");
const errorBox = $("form-error");

let categories = [];
let editingId = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function fillParentSelect() {
  // only top-level categories can be parents (and never the category being edited)
  const parents = categories.filter(
    (c) => c.parent_id === null && c.id !== editingId,
  );
  $("parent_id").innerHTML =
    '<option value="">None (top-level category)</option>' +
    parents
      .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
      .join("");
}

function rowHtml(c) {
  const isChild = c.parent_id !== null;
  const nameCell = isChild
    ? `<td class="py-3 pl-10 pr-4 text-slate-900">&#8627; ${esc(c.name)}</td>`
    : `<td class="px-4 py-3 font-medium text-slate-900">${esc(c.name)}</td>`;
  const badge =
    c.status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-200 text-slate-600";

  return `<tr>
    ${nameCell}
    <td class="px-4 py-3 text-slate-600">${esc(c.slug)}</td>
    <td class="px-4 py-3 text-slate-600">${esc(c.parent_name || "-")}</td>
    <td class="px-4 py-3 text-slate-600">${c.product_count}</td>
    <td class="px-4 py-3"><span class="rounded-full px-2 py-0.5 text-xs font-semibold ${badge}">${esc(c.status)}</span></td>
    <td class="px-4 py-3">
      <div class="flex justify-end gap-2 whitespace-nowrap">
        <button type="button" data-action="edit" data-id="${c.id}" class="btn-sm btn-sm-indigo">Edit</button>
        <button type="button" data-action="delete" data-id="${c.id}" data-name="${esc(c.name)}" class="btn-sm btn-sm-red">Delete</button>
      </div>
    </td>
  </tr>`;
}

async function load() {
  try {
    const { data } = await api("/api/admin/categories");
    categories = data.categories;
    rows.innerHTML = categories.length
      ? categories.map(rowHtml).join("")
      : '<tr><td colspan="6" class="px-4 py-10 text-center text-slate-500">No categories yet</td></tr>';
    fillParentSelect();
  } catch (err) {
    rows.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-red-600">${esc(err.message)}</td></tr>`;
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  errorBox.classList.add("hidden");
  $("form-title").textContent = "Add category";
  $("cancel-edit").classList.add("hidden");
  $("parent_id").disabled = false;
  $("parent-hint").classList.add("hidden");
  fillParentSelect();
}

function startEdit(category) {
  editingId = category.id;
  errorBox.classList.add("hidden");
  fillParentSelect();

  $("form-title").textContent = "Edit category";
  $("cancel-edit").classList.remove("hidden");
  $("name").value = category.name;
  $("slug").value = category.slug;
  $("parent_id").value = category.parent_id ? String(category.parent_id) : "";
  $("status").value = category.status;
  $("description").value = category.description || "";

  // a category that has sub-categories must stay top-level
  const hasChildren = categories.some((c) => c.parent_id === category.id);
  $("parent_id").disabled = hasChildren;
  $("parent-hint").classList.toggle("hidden", !hasChildren);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.classList.add("hidden");

  const name = $("name").value.trim();
  if (!name) return showError("Enter the category name");

  const body = {
    name,
    slug: $("slug").value.trim(),
    parent_id: $("parent_id").value || null,
    description: $("description").value.trim(),
    status: $("status").value,
  };

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    if (editingId) {
      await api(`/api/categories/${editingId}`, { method: "PUT", body });
      toast("Category updated");
    } else {
      await api("/api/categories", { method: "POST", body });
      toast("Category created");
    }
    resetForm();
    await load();
  } catch (err) {
    showError(err.message);
  } finally {
    button.disabled = false;
  }
});

$("cancel-edit").addEventListener("click", resetForm);

rows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);

  if (button.dataset.action === "edit") {
    const category = categories.find((c) => c.id === id);
    if (category) startEdit(category);
    return;
  }

  if (button.dataset.action === "delete") {
    if (!window.confirm(`Delete category "${button.dataset.name}"?`)) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      toast("Category deleted");
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      toast(err.message);
    }
  }
});

load();
