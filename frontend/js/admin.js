const API_BASE = window.__APP_CONFIG__?.API_BASE || "http://localhost:4000/api";
const ADMIN_TOKEN_KEY = "cb365_admin_token";
const ADMIN_ORDER_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled"
];

const state = {
  token: localStorage.getItem(ADMIN_TOKEN_KEY) || ""
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const qs = (selector) => document.querySelector(selector);

const request = async (endpoint, options = {}) => {
  const { headers = {}, ...rest } = options;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    ...rest
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { message: "Unexpected error" }
    }));
    throw new Error(error.error?.message || "Unexpected error");
  }

  return response.json();
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const humanizeStatus = (status) =>
  String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const setAdminToken = (token) => {
  state.token = token || "";
  if (state.token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, state.token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

const adminHeaders = () => {
  if (!state.token) return {};
  return {
    Authorization: `Bearer ${state.token}`
  };
};

const setAdminLoginMessage = (message, isError = false) => {
  const el = qs("#admin-login-message");
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#8d2525" : "var(--accent-strong)";
};

const setAdminDashboardMessage = (message, isError = false) => {
  const el = qs("#admin-dashboard-message");
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#8d2525" : "var(--accent-strong)";
};

const renderAdminAuthState = (isLoggedIn) => {
  const loginCard = qs("#admin-login-card");
  const dashboard = qs("#admin-dashboard");
  const actions = qs("#admin-actions");

  if (loginCard) loginCard.hidden = isLoggedIn;
  if (dashboard) dashboard.hidden = !isLoggedIn;
  if (actions) actions.hidden = !isLoggedIn;
};

const clearAdminDashboard = () => {
  const metrics = qs("#admin-metrics");
  const currentOrders = qs("#admin-current-orders");
  const inTransitOrders = qs("#admin-in-transit-orders");

  if (metrics) metrics.innerHTML = "";
  if (currentOrders) currentOrders.innerHTML = "";
  if (inTransitOrders) inTransitOrders.innerHTML = "";
  setAdminDashboardMessage("");
};

const renderAdminMetrics = (summary) => {
  const metrics = qs("#admin-metrics");
  if (!metrics) return;

  metrics.innerHTML = `
    <article class="metric-card">
      <div class="metric-label">Current Orders</div>
      <div class="metric-value">${summary.currentOrdersCount}</div>
    </article>
    <article class="metric-card">
      <div class="metric-label">Orders In Transit</div>
      <div class="metric-value">${summary.inTransitOrdersCount}</div>
    </article>
    <article class="metric-card">
      <div class="metric-label">Day Earning</div>
      <div class="metric-value">${currency.format(summary.dayEarnings)}</div>
    </article>
    <article class="metric-card">
      <div class="metric-label">Month Earning</div>
      <div class="metric-value">${currency.format(summary.monthEarnings)}</div>
    </article>
    <article class="metric-card">
      <div class="metric-label">Year Earning</div>
      <div class="metric-value">${currency.format(summary.yearEarnings)}</div>
    </article>
  `;
};

const renderAdminOrders = (orders, selector, enableActions = false) => {
  const container = qs(selector);
  if (!container) return;

  if (!orders.length) {
    container.innerHTML = "<p class='admin-order-meta'>No orders found.</p>";
    return;
  }

  container.innerHTML = orders
    .map((order) => {
      const itemsHtml = order.items.length
        ? `<ul class="admin-order-items">${order.items
            .map(
              (item) =>
                `<li>${escapeHtml(item.name)} x ${item.quantity} (${currency.format(item.lineTotal)})</li>`
            )
            .join("")}</ul>`
        : "<p class='admin-order-meta'>No items available.</p>";

      const statusOptions = ADMIN_ORDER_STATUSES.map(
        (status) =>
          `<option value="${status}" ${
            status === order.status ? "selected" : ""
          }>${humanizeStatus(status)}</option>`
      ).join("");

      const actionHtml = enableActions
        ? `
          <div class="admin-order-actions">
            <select data-admin-status>
              ${statusOptions}
            </select>
            <button
              class="btn ghost"
              type="button"
              data-admin-update="${order.orderId}"
            >
              Update Status
            </button>
          </div>
        `
        : "";

      return `
        <article class="admin-order-card" data-order-id="${order.orderId}">
          <div class="admin-order-header">
            <span class="admin-order-id">Order #${order.orderId}</span>
            <span class="status-badge ${order.status}">
              ${humanizeStatus(order.status)}
            </span>
          </div>
          <p class="admin-order-meta">
            ${escapeHtml(order.customerName)} • ${escapeHtml(order.phone)}
          </p>
          <p class="admin-order-meta">
            Pickup order
          </p>
          <p class="admin-order-meta">
            Placed: ${new Date(order.createdAt).toLocaleString()}
          </p>
          <p class="admin-order-meta">
            Total: ${currency.format(order.totals.total)}
          </p>
          ${itemsHtml}
          ${actionHtml}
        </article>
      `;
    })
    .join("");
};

const renderDashboard = (dashboard) => {
  renderAdminMetrics(dashboard.summary);
  renderAdminOrders(dashboard.currentOrders || [], "#admin-current-orders", true);
  renderAdminOrders(
    dashboard.inTransitOrders || [],
    "#admin-in-transit-orders",
    false
  );
};

const loadAdminDashboard = async () => {
  const hasToken = Boolean(state.token);
  renderAdminAuthState(hasToken);

  if (!hasToken) {
    clearAdminDashboard();
    return;
  }

  setAdminDashboardMessage("Loading admin dashboard...");

  try {
    const result = await request("/admin/dashboard", {
      headers: adminHeaders()
    });
    renderDashboard(result.data);
    setAdminDashboardMessage("");
  } catch (error) {
    if (/token|auth|expired/i.test(error.message)) {
      setAdminToken("");
      renderAdminAuthState(false);
      clearAdminDashboard();
      setAdminLoginMessage("Session expired. Please login again.", true);
      return;
    }
    setAdminDashboardMessage(error.message, true);
  }
};

const handleAdminLogin = () => {
  const form = qs("#admin-login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    const data = Object.fromEntries(new FormData(form));
    setAdminLoginMessage("Signing in...");

    try {
      const result = await request("/admin/login", {
        method: "POST",
        body: JSON.stringify({
          username: data.username,
          password: data.password
        })
      });
      setAdminToken(result.data.token);
      form.reset();
      setAdminLoginMessage("");
      renderAdminAuthState(true);
      await loadAdminDashboard();
    } catch (error) {
      setAdminLoginMessage(error.message, true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
};

const handleAdminControls = () => {
  const logoutButton = qs("#admin-logout");
  const refreshButton = qs("#admin-refresh");
  const currentOrders = qs("#admin-current-orders");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      setAdminToken("");
      renderAdminAuthState(false);
      clearAdminDashboard();
      setAdminLoginMessage("Logged out.");
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      loadAdminDashboard();
    });
  }

  if (currentOrders) {
    currentOrders.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-admin-update]");
      if (!button) return;

      const orderId = button.getAttribute("data-admin-update");
      const card = button.closest("[data-order-id]");
      const statusSelect = card?.querySelector("[data-admin-status]");
      const status = statusSelect?.value;
      if (!status || !orderId) return;

      button.disabled = true;
      setAdminDashboardMessage(`Updating order #${orderId}...`);

      try {
        await request(`/orders/${orderId}/status`, {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ status })
        });
        setAdminDashboardMessage(
          `Order #${orderId} updated to ${humanizeStatus(status)}.`
        );
        await loadAdminDashboard();
      } catch (error) {
        setAdminDashboardMessage(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }
};

const init = () => {
  handleAdminLogin();
  handleAdminControls();
  loadAdminDashboard();
};

init();
