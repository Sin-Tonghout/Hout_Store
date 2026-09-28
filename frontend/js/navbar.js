import { api } from "./api.js";
import { getCurrentUser, logout } from "./auth.js";
import { getCart } from "./cart.js";
import { esc, STORE_NAME } from "./ui.js";

/*
 * Global customer navigation + footer.
 * Visual redesign only:
 * - Existing authentication preserved
 * - Existing cart behaviour preserved
 * - Existing category API preserved
 * - Existing routes preserved
 */

const ICON = {
  search: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.75"/>
      <path stroke-linecap="round" d="m16 16 4.25 4.25"/>
    </svg>
  `,

  cart: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M3 4h1.5c.55 0 1.03.37 1.16.9l.35 1.43m0 0h13.12c.84 0 1.45.82 1.17 1.62l-1.72 4.93a2 2 0 0 1-1.89 1.34H8.12a2 2 0 0 1-1.94-1.5L6.01 6.33ZM9 18.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm8 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"/>
    </svg>
  `,

  menu: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/>
    </svg>
  `,

  close: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" d="m6 6 12 12M18 6 6 18"/>
    </svg>
  `,

  chevron: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="m6.5 9 5.5 5.5L17.5 9"/>
    </svg>
  `,

  home: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="m3.75 10.5 8.25-7 8.25 7v9a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-9Z"/>
      <path stroke-linecap="round"
        d="M9.25 21v-5.75h5.5V21"/>
    </svg>
  `,

  grid: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1"/>
      <rect x="14" y="4" width="6" height="6" rx="1"/>
      <rect x="4" y="14" width="6" height="6" rx="1"/>
      <rect x="14" y="14" width="6" height="6" rx="1"/>
    </svg>
  `,

  package: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linejoin="round"
        d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/>
      <path stroke-linecap="round" stroke-linejoin="round"
        d="m4.5 7.25 7.5 4 7.5-4M12 11.25V21"/>
    </svg>
  `,

  download: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" d="M12 3.5v11"/>
      <path stroke-linecap="round"
        d="M7.75 10.75 12 15l4.25-4.25"/>
      <path stroke-linecap="round" d="M5 20.5h14"/>
    </svg>
  `,

  user: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25"/>
      <path stroke-linecap="round"
        d="M5.25 20c.55-3.35 3.03-5.25 6.75-5.25s6.2 1.9 6.75 5.25"/>
    </svg>
  `,

  admin: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linejoin="round"
        d="M12 3.5 19 6v5.1c0 4.1-2.45 7.45-7 9.4-4.55-1.95-7-5.3-7-9.4V6l7-2.5Z"/>
      <path stroke-linecap="round"
        d="m9.25 12 1.8 1.8 3.75-3.75"/>
    </svg>
  `,

  logout: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round"
        d="M10 4H5.75A1.75 1.75 0 0 0 4 5.75v12.5A1.75 1.75 0 0 0 5.75 20H10"/>
      <path stroke-linecap="round"
        d="m14 8 4 4-4 4M18 12H9"/>
    </svg>
  `,

  arrow: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" d="M5 12h13"/>
      <path stroke-linecap="round" stroke-linejoin="round"
        d="m13 6 6 6-6 6"/>
    </svg>
  `,
};

const icon = (name, size = "h-5 w-5") =>
  ICON[name].replace("<svg ", `<svg class="${size}" `);

async function loadCategories() {
  try {
    const res = await api("/api/categories");
    return res.data.categories;
  } catch {
    return [];
  }
}

function categoryMenuHtml(categories, mobile = false) {
  if (!categories.length) {
    return `
      <p class="px-4 py-3 text-sm text-slate-500">
        No categories available
      </p>
    `;
  }

  if (mobile) {
    return categories
      .map(
        (category) => `
          <div class="border-b border-slate-100 py-2 last:border-0">

            <a
              href="/shop?category=${encodeURIComponent(category.slug)}"
              class="block rounded-lg px-3 py-2 text-[15px] font-semibold
                     text-slate-700 transition
                     hover:bg-indigo-50 hover:text-indigo-600"
            >
              ${esc(category.name)}
            </a>

            ${(category.children || [])
              .map(
                (child) => `
                  <a
                    href="/shop?category=${encodeURIComponent(child.slug)}"
                    class="block rounded-lg px-3 py-1.5 pl-7 text-[14px]
                           text-slate-500 transition
                           hover:bg-slate-50 hover:text-indigo-600"
                  >
                    ${esc(child.name)}
                  </a>
                `,
              )
              .join("")}

          </div>
        `,
      )
      .join("");
  }

  return categories
    .map(
      (category) => `
        <div class="min-w-40">

          <a
            href="/shop?category=${encodeURIComponent(category.slug)}"
            class="block rounded-lg px-3 py-2 text-[15px] font-semibold
                   text-slate-800 transition
                   hover:bg-indigo-50 hover:text-indigo-600"
          >
            ${esc(category.name)}
          </a>

          ${(category.children || [])
            .map(
              (child) => `
                <a
                  href="/shop?category=${encodeURIComponent(child.slug)}"
                  class="block rounded-lg px-3 py-1.5 pl-3 text-[14px]
                         text-slate-500 transition
                         hover:bg-slate-50 hover:text-indigo-600"
                >
                  ${esc(child.name)}
                </a>
              `,
            )
            .join("")}

        </div>
      `,
    )
    .join("");
}

function searchForm(value, extraClass = "") {
  return `
    <form
      action="/shop"
      method="get"
      role="search"
      class="${extraClass} group relative"
    >

      <span
        class="pointer-events-none absolute left-3.5 top-1/2
               -translate-y-1/2 text-slate-400"
      >
        ${icon("search", "h-5 w-5")}
      </span>

      <input
  type="search"
  name="search"
  value="${esc(value)}"
  placeholder="Search digital products..."
  aria-label="Search products"
  class="h-12 w-full rounded-xl border border-slate-200
         bg-slate-50 pl-11 pr-4
         text-[15px] text-slate-800
         outline-none transition
         placeholder:text-slate-400
         focus:border-indigo-500
         focus:bg-white
         focus:ring-4
         focus:ring-indigo-100"
/>

    </form>
  `;
}

function accountHtml(user, mobile = false) {
  if (!user) {
    if (mobile) {
      return `
        <div class="grid grid-cols-2 gap-3">

         <a
  href="/login"
  class="inline-flex h-10 items-center rounded-xl
         px-3 text-[15px] font-semibold
         text-slate-600 transition
         hover:bg-slate-50
         hover:text-indigo-600"
>
  Log in
</a>

          <a
  href="/register"
  class="inline-flex h-10 items-center rounded-xl
         bg-indigo-600 px-4
         text-[15px] font-semibold
         text-white shadow-sm transition
         hover:bg-indigo-700"
>
  Create account
</a>

        </div>
      `;
    }

    return `
      <div class="flex items-center gap-2">

        <a
          href="/login"
          class="inline-flex h-10 items-center rounded-xl
                 px-3 text-sm font-semibold text-slate-600
                 transition hover:bg-slate-50
                 hover:text-indigo-600"
        >
          Log in
        </a>

        <a
          href="/register"
          class="inline-flex h-10 items-center rounded-xl
                 bg-indigo-600 px-4 text-sm font-semibold
                 text-white shadow-sm transition
                 hover:bg-indigo-700"
        >
          Create account
        </a>

      </div>
    `;
  }

  const firstName = String(user.name || "").split(" ")[0] || "Account";

  const isAdmin = user.role === "admin" || user.role === "super_admin";

  if (mobile) {
    return `
      <div class="rounded-2xl border border-slate-200
                  bg-slate-50 p-3">

        <div class="flex items-center gap-3
                    border-b border-slate-200 pb-3">

          <span
            class="flex h-10 w-10 items-center justify-center
                   rounded-xl bg-indigo-100 text-indigo-600"
          >
            ${icon("user")}
          </span>

          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">
              Hi, ${esc(firstName)}
            </p>

            <p class="text-xs text-slate-500">
              Your account
            </p>
          </div>

        </div>

        <div class="mt-2 grid gap-1">

          ${
            isAdmin
              ? `
                <a
                  href="/admin/dashboard"
                  class="flex items-center gap-3 rounded-xl
                         px-3 py-2.5 text-sm font-medium
                         text-indigo-600 hover:bg-indigo-50"
                >
                  ${icon("admin")}
                  Admin dashboard
                </a>
              `
              : ""
          }

          <a
            href="/orders"
            class="flex items-center gap-3 rounded-xl
                   px-3 py-2.5 text-sm font-medium
                   text-slate-700 hover:bg-white"
          >
            ${icon("package")}
            My orders
          </a>

          <a
            href="/downloads"
            class="flex items-center gap-3 rounded-xl
                   px-3 py-2.5 text-sm font-medium
                   text-slate-700 hover:bg-white"
          >
            ${icon("download")}
            Downloads
          </a>

          <button
            type="button"
            class="js-logout flex w-full items-center gap-3
                   rounded-xl px-3 py-2.5 text-left
                   text-sm font-medium text-slate-700
                   hover:bg-white"
          >
            ${icon("logout")}
            Log out
          </button>

        </div>

      </div>
    `;
  }

  return `
    <div class="relative">

      <button
        id="account-toggle"
        type="button"
        aria-expanded="false"
        class="flex h-10 items-center gap-2 rounded-xl
               border border-slate-200 bg-white px-2.5
               transition hover:border-indigo-200
               hover:bg-indigo-50/40"
      >

        <span
          class="flex h-7 w-7 items-center justify-center
                 rounded-lg bg-indigo-100 text-indigo-600"
        >
          ${icon("user", "h-4 w-4")}
        </span>

        <span
          class="hidden max-w-24 truncate text-sm
                 font-semibold text-slate-700 lg:block"
        >
          ${esc(firstName)}
        </span>

        ${icon("chevron", "h-4 w-4 text-slate-400")}

      </button>

      <div
        id="account-panel"
        class="absolute right-0 top-full z-70 mt-2 hidden
               w-60 overflow-hidden rounded-2xl border
               border-slate-200 bg-white p-2
               shadow-xl shadow-slate-200/60"
      >

        <div class="px-3 py-3">
          <p
            class="text-xs font-medium uppercase
                   tracking-wider text-slate-400"
          >
            Signed in as
          </p>

          <p
            class="mt-1 truncate text-sm font-semibold
                   text-slate-900"
          >
            ${esc(user.name || firstName)}
          </p>
        </div>

        <div class="border-t border-slate-100 pt-1">

          ${
            isAdmin
              ? `
                <a
                  href="/admin/dashboard"
                  class="flex items-center gap-3 rounded-xl
                         px-3 py-2.5 text-sm font-medium
                         text-indigo-600
                         hover:bg-indigo-50"
                >
                  ${icon("admin")}
                  Admin dashboard
                </a>
              `
              : ""
          }

          <a
            href="/orders"
            class="flex items-center gap-3 rounded-xl
                   px-3 py-2.5 text-sm font-medium
                   text-slate-700 hover:bg-slate-50"
          >
            ${icon("package")}
            My orders
          </a>

          <a
            href="/downloads"
            class="flex items-center gap-3 rounded-xl
                   px-3 py-2.5 text-sm font-medium
                   text-slate-700 hover:bg-slate-50"
          >
            ${icon("download")}
            Downloads
          </a>

          <button
            type="button"
            class="js-logout flex w-full items-center gap-3
                   rounded-xl px-3 py-2.5 text-left
                   text-sm font-medium text-slate-700
                   hover:bg-slate-50"
          >
            ${icon("logout")}
            Log out
          </button>

        </div>
      </div>

    </div>
  `;
}

function headerHtml(user, categories) {
  const search =
    new URLSearchParams(window.location.search).get("search") || "";

  const year = new Date().getFullYear();

  return `
    <header
      id="store-header"
      class="sticky top-0 z-50 border-b
             border-slate-200/90 bg-white/95
             shadow-[0_1px_0_rgba(15,23,42,0.03)]
             backdrop-blur"
    >

      <!-- TOP INFORMATION BAR -->
     

      <!-- MAIN HEADER -->
      <div
        class="mx-auto max-w-1400px px-5 lg:px-8"
      >

        <div
          class="flex h-74px items-center gap-4
                 lg:gap-7"
        >

          <!-- BRAND -->
          <a
            href="/"
            class="group flex shrink-0 items-center gap-3"
            aria-label="${esc(STORE_NAME)} home"
          >

            <span
              class="flex h-10 w-10 items-center
                     justify-center rounded-xl bg-indigo-600
                     text-sm font-black text-white shadow-sm
                     transition group-hover:bg-indigo-700"
            >
              ${esc(STORE_NAME).slice(0, 1).toUpperCase()}
            </span>

            <span
              class="hidden text-[20px] font-extrabold
                     tracking-tight text-slate-900
                     sm:block"
            >
              ${esc(STORE_NAME)}
            </span>

          </a>

          <!-- DESKTOP SEARCH -->
          <div
            class="hidden min-w-0 flex-1 md:block
                   md:max-w-xl lg:mx-auto
                   lg:max-w-2xl"
          >
            ${searchForm(search)}
          </div>

          <!-- HEADER ACTIONS -->
          <div
            class="ml-auto flex items-center gap-1.5
                   sm:gap-2"
          >

            <a
              href="/shop"
              class="hidden h-10 items-center
                     rounded-xl px-3 text-sm font-semibold
                     text-slate-600 transition
                     hover:bg-slate-50 hover:text-indigo-600
                     lg:inline-flex"
            >
              Browse
            </a>

            <!-- CART -->
            <a
              href="/cart"
              class="group relative flex h-10 w-10
                     items-center justify-center
                     rounded-xl text-slate-600
                     transition hover:bg-indigo-50
                     hover:text-indigo-600"
              aria-label="Shopping cart"
            >

              ${icon("cart")}

              <span
                id="cart-count"
                class="absolute right-0.5 top-0.5 hidden
                       min-w-18px rounded-full bg-indigo-600
                       px-1 text-center text-[10px]
                       font-bold leading-18px text-white
                       ring-2 ring-white"
              ></span>

            </a>

            <!-- ACCOUNT -->
            <div class="hidden md:block">
              ${accountHtml(user)}
            </div>

            <!-- MOBILE MENU -->
            <button
              id="menu-toggle"
              type="button"
              class="flex h-10 w-10 items-center
                     justify-center rounded-xl
                     text-slate-600 transition
                     hover:bg-slate-50
                     hover:text-indigo-600 md:hidden"
              aria-label="Open menu"
              aria-expanded="false"
            >
              ${icon("menu")}
            </button>

          </div>
        </div>

        <!-- DESKTOP NAVIGATION -->
        <div
          class="hidden border-t border-slate-100
                 md:block"
        >

          <nav
  class="flex h-12 items-center gap-1
         text-[15px] font-semibold"
  aria-label="Primary navigation"
>

            <a
              href="/"
              class="inline-flex h-10 items-center
       gap-2 rounded-xl px-3.5
       text-[15px] font-semibold text-slate-600
       transition
       hover:bg-indigo-50
       hover:text-indigo-600"
            >
              ${icon("home", "h-4 w-4")}
              Home
            </a>

            <a
              href="/shop"
              class="inline-flex h-9 items-center
                     gap-2 rounded-lg px-3
                     text-slate-600 transition
                     hover:bg-indigo-50
                     hover:text-indigo-600"
            >
              ${icon("grid", "h-4 w-4")}
              Shop
            </a>

            <!-- CATEGORIES -->
            <div class="relative">

              <button
                id="cat-toggle"
                type="button"
                aria-expanded="false"
                class="inline-flex h-9 items-center
                       gap-2 rounded-lg px-3
                       text-slate-600 transition
                       hover:bg-indigo-50
                       hover:text-indigo-600"
              >
                Categories
                ${icon("chevron", "h-4 w-4")}
              </button>

              <div
                id="cat-panel"
                class="absolute left-0 top-full z-60
                       mt-2 hidden min-w-460px
                       max-w-650px rounded-2xl border
                       border-slate-200 bg-white p-3
                       shadow-2xl shadow-slate-200/70"
              >

                <div
                  class="mb-2 flex items-center
                         justify-between
                         border-b border-slate-100
                         px-2 pb-2"
                >

                  <div>
                    <p
                      class="text-sm font-bold
                             text-slate-900"
                    >
                      Browse categories
                    </p>

                    <p
                      class="text-xs text-slate-500"
                    >
                      Find the right digital product faster.
                    </p>
                  </div>

                  <a
                    href="/shop"
                    class="text-xs font-semibold
                           text-indigo-600
                           hover:text-indigo-700"
                  >
                    View all
                  </a>

                </div>

                <div
                  class="grid max-h-[55vh]
                         grid-cols-2 gap-1
                         overflow-y-auto p-1"
                >
                  ${categoryMenuHtml(categories)}
                </div>

              </div>

            </div>

            <span
              class="ml-auto hidden text-xs
                     font-medium text-slate-400
                     lg:block"
            >
              Simple. Useful. Instant.
            </span>

          </nav>

        </div>

      </div>

      <!-- MOBILE MENU -->
      <div
        id="mobile-menu"
        class="hidden border-t
               border-slate-200 bg-white md:hidden"
      >

        <div
          class="mx-auto max-w-1400px
                 space-y-4 px-5 py-5 lg:px-8"
        >

          ${searchForm(search)}

          <nav
            class="grid gap-1"
            aria-label="Mobile navigation"
          >

            <a
              href="/"
              class="flex items-center gap-3
                     rounded-xl px-3 py-3
                     text-sm font-semibold
                     text-slate-700
                     hover:bg-indigo-50
                     hover:text-indigo-600"
            >
              ${icon("home")}
              Home
            </a>

            <a
              href="/shop"
              class="flex items-center gap-3
                     rounded-xl px-3 py-3
                     text-sm font-semibold
                     text-slate-700
                     hover:bg-indigo-50
                     hover:text-indigo-600"
            >
              ${icon("grid")}
              Shop
            </a>

            <div
              class="mt-1 rounded-2xl border
                     border-slate-200 p-2"
            >

              <p
                class="px-3 py-2 text-[11px]
                       font-bold uppercase
                       tracking-wider text-slate-400"
              >
                Categories
              </p>

              ${categoryMenuHtml(categories, true)}

            </div>

          </nav>

          <div
            class="border-t border-slate-100 pt-4"
          >
            ${accountHtml(user, true)}
          </div>

        </div>

      </div>

    </header>
  `;
}

function footerHtml() {
  const year = new Date().getFullYear();

  return `
    <footer
      class="mt-16 border-t
             border-slate-200 bg-white"
    >

      <div
        class="mx-auto max-w-1400px
               px-5 lg:px-8"
      >

        <!-- FOOTER MAIN -->
        <div
          class="grid gap-10 py-12
                 md:grid-cols-[1.5fr_1fr_1fr_1fr]
                 lg:py-14"
        >

          <!-- BRAND -->
          <div>

            <a
              href="/"
              class="inline-flex items-center gap-3"
            >

              <span
                class="flex h-10 w-10
                       items-center justify-center
                       rounded-xl bg-indigo-600
                       text-sm font-black text-white"
              >
                ${esc(STORE_NAME).slice(0, 1).toUpperCase()}
              </span>

              <span
                class="text-lg font-extrabold
                       tracking-tight text-slate-900"
              >
                ${esc(STORE_NAME)}
              </span>

            </a>

            <p
              class="mt-4 max-w-sm
                     text-sm leading-6
                     text-slate-500"
            >
              Discover quality digital products
              with a clean shopping experience,
              secure checkout, and instant access
              after purchase.
            </p>

            <a
              href="/shop"
              class="mt-5 inline-flex items-center
                     gap-2 text-sm font-semibold
                     text-indigo-600 transition
                     hover:text-indigo-700"
            >
              Explore the store
              ${icon("arrow", "h-4 w-4")}
            </a>

          </div>

          <!-- STORE -->
          <div>

            <h2
              class="text-sm font-bold
                     text-slate-900"
            >
              Store
            </h2>

            <nav
              class="mt-4 grid gap-3
                     text-sm text-slate-500"
            >

              <a
                href="/"
                class="transition
                       hover:text-indigo-600"
              >
                Home
              </a>

              <a
                href="/shop"
                class="transition
                       hover:text-indigo-600"
              >
                Shop
              </a>

              <a
                href="/cart"
                class="transition
                       hover:text-indigo-600"
              >
                Cart
              </a>

            </nav>

          </div>

          <!-- ACCOUNT -->
          <div>

            <h2
              class="text-sm font-bold
                     text-slate-900"
            >
              Your account
            </h2>

            <nav
              class="mt-4 grid gap-3
                     text-sm text-slate-500"
            >

              <a
                href="/login"
                class="transition
                       hover:text-indigo-600"
              >
                Log in
              </a>

              <a
                href="/register"
                class="transition
                       hover:text-indigo-600"
              >
                Create account
              </a>

              <a
                href="/orders"
                class="transition
                       hover:text-indigo-600"
              >
                My orders
              </a>

              <a
                href="/downloads"
                class="transition
                       hover:text-indigo-600"
              >
                Downloads
              </a>

            </nav>

          </div>

          <!-- BENEFITS -->
          <div>

            <h2
              class="text-sm font-bold
                     text-slate-900"
            >
              Why ${esc(STORE_NAME)}?
            </h2>

            <div
              class="mt-4 grid gap-3
                     text-sm text-slate-500"
            >

              <p>Secure checkout</p>
              <p>Instant digital delivery</p>
              <p>Simple, useful products</p>

            </div>

          </div>

        </div>

        <!-- FOOTER BOTTOM -->
        <div
          class="flex flex-col gap-3
                 border-t border-slate-100
                 py-5 text-xs text-slate-400
                 sm:flex-row sm:items-center
                 sm:justify-between"
        >

          <p>
            &copy; ${year}
            ${esc(STORE_NAME)}.
            All rights reserved.
          </p>

          <p>
            Built for a faster, simpler
            digital shopping experience.
          </p>

        </div>

      </div>

    </footer>
  `;
}

function setCartCount(count) {
  const badge = document.getElementById("cart-count");

  if (!badge) return;

  badge.textContent = count > 99 ? "99+" : String(count);

  badge.classList.toggle("hidden", !(count > 0));
}

window.addEventListener("cart:changed", (event) => {
  setCartCount(event.detail.count);
});

function bindHeader() {
  const menuToggle = document.getElementById("menu-toggle");

  const mobileMenu = document.getElementById("mobile-menu");

  const catToggle = document.getElementById("cat-toggle");

  const catPanel = document.getElementById("cat-panel");

  const accountToggle = document.getElementById("account-toggle");

  const accountPanel = document.getElementById("account-panel");

  /* MOBILE MENU */
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const isHidden = mobileMenu.classList.toggle("hidden");

      menuToggle.setAttribute("aria-expanded", String(!isHidden));

      menuToggle.innerHTML = isHidden ? icon("menu") : icon("close");

      menuToggle.setAttribute(
        "aria-label",
        isHidden ? "Open menu" : "Close menu",
      );
    });
  }

  /* CATEGORY DROPDOWN */
  if (catToggle && catPanel) {
    catToggle.addEventListener("click", (event) => {
      event.stopPropagation();

      const hidden = catPanel.classList.toggle("hidden");

      catToggle.setAttribute("aria-expanded", String(!hidden));

      if (accountPanel) {
        accountPanel.classList.add("hidden");
      }
    });
  }

  /* ACCOUNT DROPDOWN */
  if (accountToggle && accountPanel) {
    accountToggle.addEventListener("click", (event) => {
      event.stopPropagation();

      const hidden = accountPanel.classList.toggle("hidden");

      accountToggle.setAttribute("aria-expanded", String(!hidden));

      if (catPanel) {
        catPanel.classList.add("hidden");
      }
    });
  }

  /* CLICK OUTSIDE */
  document.addEventListener("click", (event) => {
    if (
      catPanel &&
      !catPanel.contains(event.target) &&
      !catToggle?.contains(event.target)
    ) {
      catPanel.classList.add("hidden");

      catToggle?.setAttribute("aria-expanded", "false");
    }

    if (
      accountPanel &&
      !accountPanel.contains(event.target) &&
      !accountToggle?.contains(event.target)
    ) {
      accountPanel.classList.add("hidden");

      accountToggle?.setAttribute("aria-expanded", "false");
    }
  });

  /* ESCAPE */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    catPanel?.classList.add("hidden");

    accountPanel?.classList.add("hidden");

    mobileMenu?.classList.add("hidden");

    menuToggle?.setAttribute("aria-expanded", "false");

    menuToggle?.setAttribute("aria-label", "Open menu");

    if (menuToggle) {
      menuToggle.innerHTML = icon("menu");
    }
  });

  /* LOGOUT */
  document.querySelectorAll(".js-logout").forEach((button) => {
    button.addEventListener("click", () => logout());
  });
}

function ensureLayoutStyles() {
  if (document.getElementById("store-layout-css")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "store-layout-css";

  link.rel = "stylesheet";

  link.href = "/css/store-layout.css";

  document.head.appendChild(link);
}

async function initLayout() {
  ensureLayoutStyles();

  const headerEl = document.getElementById("site-header");

  const footerEl = document.getElementById("site-footer");

  if (footerEl) {
    footerEl.innerHTML = footerHtml();
  }

  if (!headerEl) {
    return;
  }

  const [user, categories] = await Promise.all([
    getCurrentUser(),
    loadCategories(),
  ]);

  headerEl.innerHTML = headerHtml(user, categories);

  bindHeader();

  getCart().catch(() => {});
}

initLayout();
