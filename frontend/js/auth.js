import { api } from "./api.js";

const ADMIN_ROLES = ["admin", "super_admin"];

// Where a user lands after logging in: admins go to the dashboard
function homeFor(user) {
  return user && ADMIN_ROLES.includes(user.role) ? "/admin/dashboard" : "/";
}

export async function getCurrentUser() {
  try {
    const res = await api("/api/auth/me", { allowUnauthorized: true });
    return res ? res.data.user : null;
  } catch {
    return null; // not logged in
  }
}

export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/";
  }
}

// A ?next= address, only if it is a page on this site
function nextParam() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

// Shared by the email form and the social buttons: redirect on success,
// show the error box on failure.
async function completeSignIn(request) {
  const errorBox = document.getElementById("form-error");
  try {
    const res = await request();
    window.location.href = nextParam() || homeFor(res.data.user);
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    } else {
      alert(err.message);
    }
  }
}

function bindAuthForm(formId, endpoint, buildBody) {
  const form = document.getElementById(formId);
  if (!form) return;

  const errorBox = document.getElementById("form-error");
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.classList.add("hidden");

    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Please wait...";

    await completeSignIn(() =>
      api(endpoint, { method: "POST", body: buildBody(new FormData(form)) }),
    );

    button.disabled = false;
    button.textContent = label;
  });
}

bindAuthForm("login-form", "/api/auth/login", (data) => ({
  email: data.get("email"),
  password: data.get("password"),
  rememberMe: data.get("rememberMe") === "on",
}));

bindAuthForm("register-form", "/api/auth/register", (data) => ({
  name: data.get("name"),
  email: data.get("email"),
  password: data.get("password"),
}));

// Already logged in? Skip the form entirely.
if (
  document.getElementById("login-form") ||
  document.getElementById("register-form")
) {
  getCurrentUser().then((user) => {
    if (user) window.location.replace(homeFor(user));
  });
}

// ---------------------------------------------------------------------
// Google sign-in
//
// Loads Google Identity Services and uses the OAuth2 token-client popup
// flow, so it works with our own custom-styled button instead of Google's
// stock one. The access token is verified server-side in
// backend/services/auth.service.js before any session is created.
// ---------------------------------------------------------------------
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function bindGoogleLogin(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const { data } = await api("/api/auth/google/config");
      if (!data.clientId) {
        throw new Error("Google sign-in is not configured yet.");
      }

      await loadScript("https://accounts.google.com/gsi/client");

      const client = google.accounts.oauth2.initTokenClient({
        client_id: data.clientId,
        scope: "openid email profile",
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            button.disabled = false;
            return;
          }
          completeSignIn(() =>
            api("/api/auth/google", {
              method: "POST",
              body: { accessToken: tokenResponse.access_token },
            }),
          ).finally(() => {
            button.disabled = false;
          });
        },
      });

      client.requestAccessToken();
    } catch (err) {
      button.disabled = false;
      const errorBox = document.getElementById("form-error");
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
      } else {
        alert(err.message);
      }
    }
  });
}

// ---------------------------------------------------------------------
// Telegram sign-in
//
// Loads the Telegram Login Widget script and calls its JS auth() API
// directly, so it works with our own custom-styled button instead of
// Telegram's stock iframe button. Requires the bot's domain to be set via
// @BotFather -> /setdomain. The signed payload is verified server-side in
// backend/utils/telegramAuth.js before any session is created.
// ---------------------------------------------------------------------
async function bindTelegramLogin(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const { data } = await api("/api/auth/telegram/config");
      if (!data.botId) {
        throw new Error("Telegram sign-in is not configured yet.");
      }

      await loadScript("https://telegram.org/js/telegram-widget.js?22");

      if (!window.Telegram || !window.Telegram.Login) {
        throw new Error("Could not load Telegram sign-in. Please try again.");
      }

      window.Telegram.Login.auth(
        { bot_id: data.botId, request_access: "write" },
        (telegramUser) => {
          button.disabled = false;
          if (!telegramUser) return; // user closed the popup / declined

          completeSignIn(() =>
            api("/api/auth/telegram", { method: "POST", body: telegramUser }),
          );
        },
      );
    } catch (err) {
      button.disabled = false;
      const errorBox = document.getElementById("form-error");
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
      } else {
        alert(err.message);
      }
    }
  });
}

bindGoogleLogin("google-login");
bindTelegramLogin("telegram-login");

// ---------------------------------------------------------------------
// Forgot password (on forgot-password.html)
// ---------------------------------------------------------------------
const forgotForm = document.getElementById("forgot-password-form");
if (forgotForm) {
  const errorBox = document.getElementById("form-error");
  const successBox = document.getElementById("form-success");
  const button = forgotForm.querySelector('button[type="submit"]');

  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.classList.add("hidden");
    successBox.classList.add("hidden");

    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Please wait...";

    try {
      const res = await api("/api/auth/forgot-password", {
        method: "POST",
        body: { email: new FormData(forgotForm).get("email") },
      });
      successBox.textContent = res.message;
      successBox.classList.remove("hidden");
      forgotForm.reset();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}
