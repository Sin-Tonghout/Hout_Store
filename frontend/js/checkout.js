import { api } from "./api.js";
import { getCurrentUser } from "./auth.js";
import { getCart } from "./cart.js";
import { esc, formatPrice } from "./ui.js";

const root = document.getElementById("checkout-root");

function goToLogin() {
  window.location.href = "/login?next=/checkout";
}

function emptyHtml() {
  return `<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
    <p class="text-lg font-semibold text-slate-800">Your cart is empty</p>
    <p class="mt-1 text-sm text-slate-500">Add a product before checking out.</p>
    <a href="/shop" class="btn-primary mt-5 inline-block">Browse products</a>
  </div>`;
}

function render(user, cart) {
  const s = cart.summary;

  root.innerHTML = `<div class="grid gap-6 lg:grid-cols-3">
    <div class="min-w-0 space-y-6 lg:col-span-2">

      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-semibold text-slate-900">Customer information</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label class="form-label">Name</label>
            <input type="text" value="${esc(user.name)}" disabled class="form-input bg-slate-50 text-slate-600" />
          </div>
          <div>
            <label class="form-label">Email</label>
            <input type="text" value="${esc(user.email)}" disabled class="form-input bg-slate-50 text-slate-600" />
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">Your order and downloads are saved to this account. Digital products need no shipping address.</p>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-semibold text-slate-900">Payment method</h2>
        <div class="mt-4 space-y-3">
          <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-4 has-checked:border-indigo-500 has-checked:bg-indigo-50">
            <input type="radio" name="payment_method" value="demo" checked class="mt-1" />
            <span>
              <span class="block font-medium text-slate-900">Demo Payment</span>
              <span class="block text-sm text-slate-500">A test payment used while the store is being built.</span>
            </span>
          </label>
                    <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-4 has-checked:border-indigo-500 has-checked:bg-indigo-50">
            <input type="radio" name="payment_method" value="aba_payway" class="mt-1" />
            <span>
              <span class="block font-medium text-slate-900">ABA PayWay</span>
              <span class="block text-sm text-slate-500">Pay securely with ABA PAY, KHQR or card.</span>
            </span>
          </label>
        </div>
      </section>
    </div>

    <aside class="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <h2 class="font-semibold text-slate-900">Order summary</h2>
      <ul class="mt-4 divide-y divide-slate-100 text-sm">
        ${cart.items
          .map(
            (item) => `<li class="flex justify-between gap-3 py-2">
              <span class="min-w-0 text-slate-700">${esc(item.name)} <span class="text-slate-400">&times; ${item.quantity}</span></span>
              <span class="shrink-0 font-medium text-slate-900">${formatPrice(item.subtotal)}</span>
            </li>`,
          )
          .join("")}
      </ul>
      <dl class="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm">
        <div class="flex justify-between"><dt class="text-slate-600">Subtotal</dt><dd>${formatPrice(s.subtotal)}</dd></div>
        ${s.discount > 0 ? `<div class="flex justify-between"><dt class="text-slate-600">Discount</dt><dd>-${formatPrice(s.discount)}</dd></div>` : ""}
        <div class="flex justify-between text-base font-bold text-slate-900"><dt>Total</dt><dd>${formatPrice(s.total)}</dd></div>
      </dl>

      <div id="checkout-error" class="mt-4 hidden rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"></div>

      <button id="place-order" type="button" class="btn-primary mt-5 w-full">Place Order</button>
      <a href="/cart" class="mt-3 block text-center text-sm font-medium text-indigo-600 hover:underline">Edit cart</a>
    </aside>
  </div>`;

  const button = root.querySelector("#place-order");
  const errorBox = root.querySelector("#checkout-error");

  button.addEventListener("click", async () => {
    errorBox.classList.add("hidden");
    button.disabled = true;
    button.textContent = "Placing order...";

    try {
      const method = root.querySelector(
        'input[name="payment_method"]:checked',
      ).value;
      const { data } = await api("/api/orders", {
        method: "POST",
        body: { payment_method: method },
      });
      window.location.href =
        method === "aba_payway"
          ? `/orders/${data.order.id}/pay/aba`
          : `/orders/${data.order.id}/pay`;
    } catch (err) {
      if (err.status === 401) return goToLogin();

      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
      button.disabled = false;
      button.textContent = "Place Order";
    }
  });
}

async function init() {
  root.innerHTML = '<p class="py-10 text-center text-slate-500">Loading...</p>';

  const user = await getCurrentUser();
  if (!user) return goToLogin();

  try {
    const cart = await getCart();
    if (!cart.items.length) {
      root.innerHTML = emptyHtml();
      return;
    }
    render(user, cart);
  } catch (err) {
    root.innerHTML =
      '<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load checkout. Please refresh the page.</div>';
  }
}

init();
