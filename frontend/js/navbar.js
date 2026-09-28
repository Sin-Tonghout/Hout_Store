import { api } from "./api.js";
import { getCurrentUser, logout } from "./auth.js";
import { getCart } from "./cart.js";
import { esc, STORE_NAME } from "./ui.js";

const svg = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const ICON = {
  search: svg(`<circle cx="11" cy="11" r="6.75"/><path d="m16 16 4.25 4.25"/>`),
  cart: svg(`<path d="M3 4h1.5c.55 0 1.03.37 1.16.9l.35 1.43m0 0h13.12c.84 0 1.45.82 1.17 1.62l-1.72 4.93a2 2 0 0 1-1.89 1.34H8.12a2 2 0 0 1-1.94-1.5L6.01 6.33Z"/><path d="M9 18.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm8 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"/>`),
  menu: svg(`<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>`),
  close: svg(`<path d="m6 6 12 12"/><path d="M18 6 6 18"/>`),
  chevron: svg(`<path d="m6.5 9 5.5 5.5L17.5 9"/>`),
  home: svg(`<path d="m3.75 10.5 8.25-7 8.25 7v9a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-9Z"/><path d="M9.25 21v-5.75h5.5V21"/>`),
  grid: svg(`<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>`),
  package: svg(`<path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4.5 7.25 7.5 4 7.5-4M12 11.25V21"/>`),
  download: svg(`<path d="M12 3.5v11"/><path d="M7.75 10.75 12 15l4.25-4.25"/><path d="M5 20.5h14"/>`),
  user: svg(`<circle cx="12" cy="8" r="3.25"/><path d="M5.25 20c.55-3.35 3.03-5.25 6.75-5.25s6.2 1.9 6.75 5.25"/>`),
  admin: svg(`<path d="M12 3.5 19 6v5.1c0 4.1-2.45 7.45-7 9.4-4.55-1.95-7-5.3-7-9.4V6l7-2.5Z"/><path d="m9.25 12 1.8 1.8 3.75-3.75"/>`),
  logout: svg(`<path d="M10 4H5.75A1.75 1.75 0 0 0 4 5.75v12.5A1.75 1.75 0 0 0 5.75 20H10"/><path d="m14 8 4 4-4 4M18 12H9"/>`),
  arrow: svg(`<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>`),
};

const icon = (name, size = "h-5 w-5") => {
  if (!ICON[name]) return "";
  return ICON[name].replace("<svg ", `<svg class="${size}" `);
};

const brandLetter = () =>
  esc(String(STORE_NAME).slice(0, 1).toUpperCase());

const isActive = (href) =>
  href === "/"
    ? window.location.pathname === "/"
    : window.location.pathname.startsWith(href);

async function loadCategories() {
  try {
    const res = await api("/api/categories");
    return res?.data?.categories || [];
  } catch {
    return [];
  }
}

function navLink(href, iconName, label) {
  return `
    <a href="${href}"
       ${isActive(href) ? 'aria-current="page"' : ""}
       class="nav-link inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold text-ink-2 transition hover:text-primary-600 aria-[current=page]:text-primary-600">
      ${icon(iconName, "h-4 w-4")}${label}
    </a>`;
}

function categoryMenuHtml(categories, mobile = false) {
  if (!categories.length) {
    return `<p class="px-4 py-3 text-sm text-muted">No categories available</p>`;
  }

  const parentCls =
    "block rounded-lg px-3 py-2 text-[15px] font-semibold text-ink transition hover:bg-primary-50 hover:text-primary-600";

  const childCls =
    "block rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-primary-600" +
    (mobile ? " pl-7" : "");

  return categories
    .map(
      (c) => `
        <div class="${mobile ? "border-b border-border py-2 last:border-0" : "min-w-40"}">
          <a href="/shop?category=${encodeURIComponent(c.slug)}" class="${parentCls}">
            ${esc(c.name)}
          </a>
          ${(c.children || [])
            .map(
              (ch) => `
                <a href="/shop?category=${encodeURIComponent(ch.slug)}" class="${childCls}">
                  ${esc(ch.name)}
                </a>`
            )
            .join("")}
        </div>`
    )
    .join("");
}

function searchForm(value, extra = "") {
  return `
    <form action="/shop" method="get" role="search" class="relative ${extra}">
      <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
        ${icon("search")}
      </span>
      <input type="search" name="search" value="${esc(value)}"
        placeholder="Search digital products..." aria-label="Search products"
        class="h-11 w-full rounded-full border-2 border-transparent bg-surface-2 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-primary-500 focus:bg-surface focus:ring-4 focus:ring-primary-100" />
    </form>`;
}

const menuItem = (href, ic, label) => `
  <a href="${href}" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 transition hover:bg-primary-50 hover:text-primary-600">
    ${icon(ic)}${label}
  </a>`;

const logoutButton = `
  <button type="button" class="js-logout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-2 transition hover:bg-accent-50 hover:text-accent-600">
    ${icon("logout")}Log out
  </button>`;

function userLinks(user) {
  const isAdmin =
    user.role === "admin" ||
    user.role === "super_admin";

  return (
    (isAdmin
      ? menuItem("/admin/dashboard", "admin", "Admin dashboard")
      : "") +
    menuItem("/orders", "package", "My orders") +
    menuItem("/downloads", "download", "Downloads") +
    logoutButton
  );
}

function accountHtml(user, mobile = false) {
  if (!user) {
    return `
      <div class="${mobile ? "grid grid-cols-2 gap-3" : "flex items-center gap-2"}">
        <a href="/login" class="btn-secondary">Log in</a>
        <a href="/register" class="btn-primary">Create account</a>
      </div>`;
  }

  const firstName =
    String(user.name || "").split(" ")[0] || "Account";

  if (mobile) {
    return `
      <div class="rounded-2xl border border-border bg-surface-2 p-3">
        <div class="flex items-center gap-3 border-b border-border pb-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            ${icon("user")}
          </span>
          <p class="truncate text-sm font-semibold text-ink">
            Hi, ${esc(firstName)}
          </p>
        </div>
        <div class="mt-2 grid gap-1">
          ${userLinks(user)}
        </div>
      </div>`;
  }

  return `
    <div class="relative">
      <button id="account-toggle" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="account-panel"
        class="flex h-10 items-center gap-2 rounded-full border-2 border-border bg-surface py-1 pl-1 pr-3 transition hover:border-primary-500">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
          ${esc(firstName.slice(0, 1).toUpperCase())}
        </span>
        <span class="hidden max-w-24 truncate text-sm font-semibold text-ink xl:block">
          ${esc(firstName)}
        </span>
        <span id="account-chevron">
          ${icon("chevron", "h-4 w-4 text-muted")}
        </span>
      </button>

      <div id="account-panel" data-open="false"
        class="pop-panel absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-border bg-surface p-2 shadow-[0_12px_28px_rgb(20_18_43/0.12)]">
        <div class="px-3 py-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">
            Signed in as
          </p>
          <p class="mt-1 truncate text-sm font-semibold text-ink">
            ${esc(user.name || firstName)}
          </p>
        </div>
        <div class="border-t border-border pt-1">
          ${userLinks(user)}
        </div>
      </div>
    </div>`;
}

function brandHtml(withName = true) {
  return `
    <a href="/" class="group flex shrink-0 items-center gap-3" aria-label="${esc(STORE_NAME)} home">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-base font-black text-white transition duration-200 group-hover:-rotate-6 group-hover:scale-105">
        ${brandLetter()}
      </span>
      ${
        withName
          ? `<span class="hidden text-xl font-extrabold tracking-tight text-ink sm:block">${esc(STORE_NAME)}</span>`
          : ""
      }
    </a>`;
}

function headerHtml(user, categories) {
  const search =
    new URLSearchParams(window.location.search).get("search") || "";

  return `
    <header id="site-nav" class="site-header" data-scrolled="false">
      <div class="mx-auto flex h-[72px] max-w-[1400px] items-center gap-3 px-5 lg:gap-6 lg:px-8">

        ${brandHtml()}

        <nav class="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          ${navLink("/", "home", "Home")}
          ${navLink("/shop", "grid", "Shop")}

          <div class="relative">
            <button id="cat-toggle" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="cat-panel"
              class="nav-link inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold text-ink-2 transition hover:text-primary-600">
              Categories
              <span id="cat-chevron">
                ${icon("chevron", "h-4 w-4 transition-transform duration-200")}
              </span>
            </button>

            <div id="cat-panel" data-open="false"
              class="pop-panel absolute left-0 top-full z-50 mt-2 w-[min(650px,90vw)] rounded-2xl border border-border bg-surface p-3 shadow-[0_12px_28px_rgb(20_18_43/0.12)]">
              <div class="mb-2 flex items-center justify-between border-b border-border px-2 pb-2">
                <div>
                  <p class="text-sm font-bold text-ink">Browse categories</p>
                  <p class="text-xs text-muted">Find the right digital product faster.</p>
                </div>
                <a href="/shop" class="text-xs font-semibold text-primary-600 hover:text-primary-700">
                  View all
                </a>
              </div>

              <div class="grid max-h-[55vh] grid-cols-2 gap-1 overflow-y-auto p-1">
                ${categoryMenuHtml(categories)}
              </div>
            </div>
          </div>
        </nav>

        <div class="hidden min-w-0 flex-1 md:block md:max-w-md">
          ${searchForm(search)}
        </div>

        <div class="ml-auto flex items-center gap-1.5 sm:gap-2">

          <a href="/cart" aria-label="Cart"
            class="group relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-primary-50 hover:text-primary-600">
            ${icon("cart", "h-[22px] w-[22px] transition-transform duration-200 group-hover:-translate-y-0.5")}
            <span id="cart-count"
              class="absolute -right-0.5 -top-0.5 hidden h-5 min-w-5 rounded-full bg-accent-500 px-1 text-center text-[11px] font-bold leading-5 text-white">
              0
            </span>
          </a>

          <div class="hidden lg:block">
            ${accountHtml(user)}
          </div>

          <button id="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu"
            class="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-primary-50 hover:text-primary-600 lg:hidden">
            ${icon("menu")}
          </button>

        </div>
      </div>
    </header>`;
}

function drawerHtml(user, categories) {
  const search =
    new URLSearchParams(window.location.search).get("search") || "";

  const drawerLink = (href, ic, label) => `
    <a href="${href}" ${isActive(href) ? 'aria-current="page"' : ""}
      class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink-2 transition hover:bg-primary-50 hover:text-primary-600 aria-[current=page]:bg-primary-50 aria-[current=page]:text-primary-600">
      ${icon(ic)}${label}
    </a>`;

  return `
    <div id="mobile-menu" class="drawer-root" data-open="false" aria-hidden="true">
      <div id="drawer-backdrop" class="drawer-backdrop"></div>

      <aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">

        <div class="mb-5 flex items-center justify-between">
          ${brandHtml()}
          <button id="menu-close" type="button" aria-label="Close menu"
            class="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-2">
            ${icon("close")}
          </button>
        </div>

        <div class="md:hidden">
          ${searchForm(search)}
        </div>

        <nav class="mt-4 grid gap-1" aria-label="Mobile navigation">
          ${drawerLink("/", "home", "Home")}
          ${drawerLink("/shop", "grid", "Shop")}

          <div class="mt-2 rounded-2xl border border-border p-2">
            <p class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              Categories
            </p>
            ${categoryMenuHtml(categories, true)}
          </div>
        </nav>

        <div class="mt-5 border-t border-border pt-5">
          ${accountHtml(user, true)}
        </div>

      </aside>
    </div>`;
}

function footerHtml() {
  const year = new Date().getFullYear();

  const link = (href, label) =>
    `<a href="${href}" class="inline-block text-sm text-white/70 transition duration-200 hover:translate-x-1 hover:text-white">${label}</a>`;

  const heading = (text) =>
    `<h2 class="text-xs font-bold uppercase tracking-wider text-white/50">${text}</h2>`;

  return `
    <footer class="mt-20 bg-ink text-white">

      <div class="flex h-1" aria-hidden="true">
        <span class="flex-1 bg-primary-500"></span>
        <span class="flex-1 bg-secondary-500"></span>
        <span class="flex-1 bg-accent-500"></span>
        <span class="flex-1 bg-highlight-500"></span>
      </div>

      <div class="mx-auto max-w-[1400px] px-5 lg:px-8">

        <div class="grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">

          <div>
            <a href="/" class="inline-flex items-center gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-base font-black text-white">
                ${brandLetter()}
              </span>
              <span class="text-lg font-extrabold tracking-tight">
                ${esc(STORE_NAME)}
              </span>
            </a>

            <p class="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Quality digital products with secure checkout and instant access after purchase.
            </p>

            <a href="/shop"
              class="group mt-5 inline-flex items-center gap-2 text-sm font-semibold text-highlight-500 transition hover:text-white">
              Explore the store
              ${icon("arrow", "h-4 w-4 transition-transform duration-200 group-hover:translate-x-1")}
            </a>
          </div>

          <div>
            ${heading("Store")}
            <nav class="mt-4 grid gap-3" aria-label="Store links">
              ${link("/", "Home")}
              ${link("/shop", "Shop")}
              ${link("/cart", "Cart")}
            </nav>
          </div>

          <div>
            ${heading("Your account")}
            <nav class="mt-4 grid gap-3" aria-label="Account links">
              ${link("/login", "Log in")}
              ${link("/register", "Create account")}
              ${link("/orders", "My orders")}
              ${link("/downloads", "Downloads")}
            </nav>
          </div>

          <div>
            ${heading("Why " + esc(STORE_NAME) + "?")}

            <div class="mt-4 grid gap-3 text-sm text-white/70">
              <p>Secure checkout</p>
              <p>Instant digital delivery</p>
              <p>Simple, useful products</p>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <span class="rounded-md border border-white/20 px-2.5 py-1 text-xs font-semibold text-white/80">
                ABA PayWay
              </span>
              <span class="rounded-md border border-white/20 px-2.5 py-1 text-xs font-semibold text-white/80">
                KHQR
              </span>
            </div>
          </div>

        </div>

        <div class="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; ${year} ${esc(STORE_NAME)}. All rights reserved.</p>
          <p>Built for a faster, simpler digital shopping experience.</p>
        </div>

      </div>
    </footer>`;
}

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setCartCount(count) {
  const badge =
    document.getElementById("cart-count");

  if (!badge) return;

  const prev = badge.textContent;

  const safeCount =
    Number.isFinite(Number(count))
      ? Number(count)
      : 0;

  badge.textContent =
    safeCount > 99
      ? "99+"
      : String(safeCount);

  badge.classList.toggle(
    "hidden",
    !(safeCount > 0)
  );

  if (
    safeCount > 0 &&
    prev !== badge.textContent &&
    !reduceMotion()
  ) {
    badge.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.4)" },
        { transform: "scale(1)" },
      ],
      {
        duration: 320,
        easing: "ease-out",
      }
    );
  }
}

window.addEventListener(
  "cart:changed",
  (event) => {
    setCartCount(
      event.detail?.count || 0
    );
  }
);

function watchScroll() {
  const header =
    document.getElementById("site-nav");

  if (
    !header ||
    !("IntersectionObserver" in window)
  ) {
    return;
  }

  const sentinel =
    document.createElement("div");

  sentinel.setAttribute(
    "aria-hidden",
    "true"
  );

  sentinel.className =
    "pointer-events-none absolute left-0 top-0 h-px w-px";

  document.body.prepend(sentinel);

  new IntersectionObserver(
    ([entry]) => {
      header.dataset.scrolled =
        String(!entry.isIntersecting);
    }
  ).observe(sentinel);
}

function ensureBackground() {
  if (
    document.getElementById("bg-shapes")
  ) {
    return;
  }

  const bg =
    document.createElement("div");

  bg.id = "bg-shapes";
  bg.className = "bg-shapes";

  bg.setAttribute(
    "aria-hidden",
    "true"
  );

  bg.innerHTML = `
    <i class="bg-shape s1"></i>
    <i class="bg-shape s2"></i>
    <i class="bg-shape s3"></i>
  `;

  document.body.prepend(bg);
}

function bindHeader() {
  const $ = (id) =>
    document.getElementById(id);

  const menuToggle = $("menu-toggle");
  const drawer = $("mobile-menu");
  const menuClose = $("menu-close");
  const backdrop = $("drawer-backdrop");

  const catToggle = $("cat-toggle");
  const catPanel = $("cat-panel");

  const accToggle = $("account-toggle");
  const accPanel = $("account-panel");

  const catChevron = $("cat-chevron");
  const accChevron = $("account-chevron");

  const setPanel = (
    panel,
    toggle,
    open
  ) => {
    if (!panel) return;

    panel.dataset.open =
      String(open);

    panel.classList.toggle(
      "is-open",
      open
    );

    toggle?.setAttribute(
      "aria-expanded",
      String(open)
    );
  };

  const closeCategories = () => {
    setPanel(
      catPanel,
      catToggle,
      false
    );

    catChevron
      ?.querySelector("svg")
      ?.classList.remove(
        "rotate-180"
      );
  };

  const openCategories = () => {
    setPanel(
      catPanel,
      catToggle,
      true
    );

    catChevron
      ?.querySelector("svg")
      ?.classList.add(
        "rotate-180"
      );
  };

  const closeAccount = () => {
    setPanel(
      accPanel,
      accToggle,
      false
    );

    accChevron
      ?.querySelector("svg")
      ?.classList.remove(
        "rotate-180"
      );
  };

  const openAccount = () => {
    setPanel(
      accPanel,
      accToggle,
      true
    );

    accChevron
      ?.querySelector("svg")
      ?.classList.add(
        "rotate-180"
      );
  };

  const closePanels = () => {
    closeCategories();
    closeAccount();
  };

  const setDrawer = (open) => {
    if (!drawer) return;

    const wasOpen =
      drawer.dataset.open === "true";

    if (wasOpen === open) return;

    drawer.dataset.open =
      String(open);

    drawer.setAttribute(
      "aria-hidden",
      String(!open)
    );

    menuToggle?.setAttribute(
      "aria-expanded",
      String(open)
    );

    menuToggle?.setAttribute(
      "aria-label",
      open
        ? "Close menu"
        : "Open menu"
    );

    document.documentElement.classList.toggle(
      "overflow-hidden",
      open
    );

    if (open) {
      closePanels();
      menuClose?.focus();
    } else {
      menuToggle?.focus();
    }
  };

  menuToggle?.addEventListener(
    "click",
    () => {
      const isOpen =
        drawer?.dataset.open ===
        "true";

      setDrawer(!isOpen);
    }
  );

  menuClose?.addEventListener(
    "click",
    () => setDrawer(false)
  );

  backdrop?.addEventListener(
    "click",
    () => setDrawer(false)
  );

  drawer?.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Tab") return;

      const focusable =
        drawer.querySelectorAll(
          "a[href], button:not([disabled]), input"
        );

      if (!focusable.length) return;

      const first =
        focusable[0];

      const last =
        focusable[
          focusable.length - 1
        ];

      if (
        e.shiftKey &&
        document.activeElement === first
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        document.activeElement === last
      ) {
        e.preventDefault();
        first.focus();
      }
    }
  );

  const desktopMedia =
    window.matchMedia(
      "(min-width: 1024px)"
    );

  const handleBreakpoint = (e) => {
    if (e.matches) {
      setDrawer(false);
    }
  };

  if (
    desktopMedia.addEventListener
  ) {
    desktopMedia.addEventListener(
      "change",
      handleBreakpoint
    );
  } else {
    desktopMedia.addListener(
      handleBreakpoint
    );
  }

  catToggle?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen =
        catPanel?.dataset.open ===
        "true";

      if (isOpen) {
        closeCategories();
        return;
      }

      closeAccount();
      openCategories();
    }
  );

  accToggle?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen =
        accPanel?.dataset.open ===
        "true";

      if (isOpen) {
        closeAccount();
        return;
      }

      closeCategories();
      openAccount();
    }
  );

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;

      if (!(target instanceof Element)) {
        return;
      }

      const clickedInsideCategory =
        target.closest(
          "#cat-panel, #cat-toggle"
        );

      const clickedInsideAccount =
        target.closest(
          "#account-panel, #account-toggle"
        );

      if (!clickedInsideCategory) {
        closeCategories();
      }

      if (!clickedInsideAccount) {
        closeAccount();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") {
        return;
      }

      closePanels();
      setDrawer(false);
    }
  );

  document
    .querySelectorAll(".js-logout")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => logout()
      );
    });
}

function ensureLayoutStyles() {
  if (
    document.getElementById(
      "store-layout-css"
    )
  ) {
    return;
  }

  const link =
    document.createElement("link");

  link.id =
    "store-layout-css";

  link.rel = "stylesheet";

  link.href =
    "/css/store-layout.css";

  document.head.appendChild(link);
}

async function initLayout() {
  ensureLayoutStyles();
  ensureBackground();

  const headerEl =
    document.getElementById(
      "site-header"
    );

  const footerEl =
    document.getElementById(
      "site-footer"
    );

  if (footerEl) {
    footerEl.innerHTML =
      footerHtml();
  }

  if (!headerEl) {
    return;
  }

  headerEl.classList.remove(
    "min-h-16"
  );

  headerEl.classList.add(
    "sticky",
    "top-0",
    "z-40",
    "min-h-[72px]"
  );

  const [
    user,
    categories,
  ] = await Promise.all([
    getCurrentUser(),
    loadCategories(),
  ]);

  headerEl.innerHTML =
    headerHtml(
      user,
      categories
    );

  document
    .getElementById(
      "site-drawer"
    )
    ?.remove();

  const drawerWrap =
    document.createElement(
      "div"
    );

  drawerWrap.id =
    "site-drawer";

  drawerWrap.innerHTML =
    drawerHtml(
      user,
      categories
    );

  document.body.appendChild(
    drawerWrap
  );

  bindHeader();
  watchScroll();

  getCart().catch(() => {});
}

initLayout();

