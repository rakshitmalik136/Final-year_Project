const API_BASE = window.__APP_CONFIG__?.API_BASE || "http://localhost:4000/api";
const WHATSAPP_NUMBER = window.__APP_CONFIG__?.WHATSAPP_NUMBER || "";
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
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f6c9b3'/%3E%3Cstop offset='100%25' stop-color='%23f8f1e9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='400' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Manrope, sans-serif' font-size='32' fill='%236f4e37'%3ECakes%20n%20Bakes%20365%3C/text%3E%3C/svg%3E";

const state = {
  categories: [],
  activeCategory: "All",
  menuCache: {},
  cart: {
    items: [],
    totals: { subtotal: 0, tax: 0, total: 0 }
  },
  admin: {
    token: localStorage.getItem(ADMIN_TOKEN_KEY) || ""
  }
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const sessionKey = "cb365_session";

const getSessionId = () => {
  let id = localStorage.getItem(sessionKey);
  if (!id) {
    id = `cb365-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(sessionKey, id);
  }
  return id;
};

const sessionId = getSessionId();

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

const sanitizeWhatsAppNumber = (value) =>
  String(value || "").replace(/\D/g, "");

const buildWhatsAppLink = (message) => {
  const digits = sanitizeWhatsAppNumber(WHATSAPP_NUMBER);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
};

const toast = (message) => {
  const el = qs("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(el.dataset.timer);
  const timer = window.setTimeout(() => el.classList.remove("show"), 2200);
  el.dataset.timer = timer;
};

const setActiveNav = (page) => {
  qsa(".nav-links a").forEach((link) => {
    const target = link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("active", target === page);
  });
};

const setActivePage = (page) => {
  qsa(".page").forEach((section) => {
    section.classList.toggle("active", section.dataset.page === page);
  });
  setActiveNav(page);
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (page === "cart" || page === "checkout") {
    refreshCart();
  }

  if (page === "admin") {
    loadAdminDashboard();
  }
};

const handleRouting = () => {
  const page = window.location.hash.replace("#", "") || "home";
  setActivePage(page);
};

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

const loadCategories = async () => {
  try {
    const result = await request("/categories");
    state.categories = result.data;
  } catch (error) {
    state.categories = [
      { id: 1, name: "Bakery" },
      { id: 2, name: "Fast Food" },
      { id: 3, name: "Snacks" },
      { id: 4, name: "Drinks" }
    ];
  }

  renderCategoryTabs();
};

const renderCategoryTabs = () => {
  const container = qs("#category-tabs");
  if (!container) return;

  const categories = ["All", ...state.categories.map((c) => c.name)];
  container.innerHTML = "";

  categories.forEach((name) => {
    const button = document.createElement("button");
    button.textContent = name;
    button.classList.toggle("active", name === state.activeCategory);
    button.addEventListener("click", () => {
      state.activeCategory = name;
      renderCategoryTabs();
      loadMenu(name);
    });
    container.appendChild(button);
  });
};

const loadMenu = async (category) => {
  const menuState = qs("#menu-state");
  if (menuState) menuState.textContent = "Loading menu...";

  const key = category && category !== "All" ? category : "all";

  if (state.menuCache[key]) {
    renderMenu(state.menuCache[key]);
    if (menuState) menuState.textContent = "";
    return;
  }

  try {
    const query = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    const result = await request(`/menu${query}`);
    state.menuCache[key] = result.data;
    renderMenu(result.data);
    if (menuState) menuState.textContent = "";
  } catch (error) {
    if (menuState) {
      menuState.textContent = `Unable to load menu: ${error.message}`;
    }
  }
};

const renderMenu = (items) => {
  const grid = qs("#menu-grid");
  if (!grid) return;

  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = "<p>No items found for this category.</p>";
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "menu-card";
    card.innerHTML = `
      <img src="${item.image_url || FALLBACK_IMAGE}" alt="${item.name}" />
      <div class="content">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="price">${currency.format(Number(item.price))}</div>
        <button class="btn ghost" data-id="${item.id}">Add to cart</button>
      </div>
    `;

    const img = card.querySelector("img");
    img.onerror = () => {
      img.src = FALLBACK_IMAGE;
    };

    card.querySelector("button").addEventListener("click", () => {
      addToCart(item.id);
    });

    grid.appendChild(card);
  });
};

const refreshCart = async () => {
  try {
    const result = await request(`/cart/${sessionId}`);
    state.cart = result.data;
    renderCart();
    renderCartSummary();
    renderCheckoutSummary();
    updateCartCount();
  } catch (error) {
    toast("Unable to refresh cart");
  }
};

const updateCartCount = () => {
  const count = state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const badge = qs("#cart-count");
  if (badge) badge.textContent = count;
};

const addToCart = async (productId) => {
  try {
    await request(`/cart/${sessionId}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 })
    });
    toast("Added to cart");
    refreshCart();
  } catch (error) {
    toast(error.message);
  }
};

const updateCartItem = async (itemId, quantity) => {
  try {
    await request(`/cart/${sessionId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity })
    });
    refreshCart();
  } catch (error) {
    toast(error.message);
  }
};

const removeCartItem = async (itemId) => {
  try {
    await request(`/cart/${sessionId}/items/${itemId}`, {
      method: "DELETE"
    });
    refreshCart();
  } catch (error) {
    toast(error.message);
  }
};

const renderCart = () => {
  const container = qs("#cart-items");
  if (!container) return;

  container.innerHTML = "";

  if (!state.cart.items.length) {
    container.innerHTML = `
      <div class="summary-card">
        <h3>Your cart is empty</h3>
        <p>Add your favorite cakes, snacks, or drinks.</p>
        <a href="#menu" class="btn primary" data-link>Browse menu</a>
      </div>
    `;
    return;
  }

  state.cart.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "cart-item";
    card.innerHTML = `
      <header>
        <div>
          <strong>${item.name}</strong>
          <div class="price">${currency.format(item.unitPrice)}</div>
        </div>
        <button class="btn ghost" data-remove="${item.id}">Remove</button>
      </header>
      <p>${item.description}</p>
      <div class="quantity-controls">
        <button data-action="decrease" data-id="${item.id}">-</button>
        <strong>${item.quantity}</strong>
        <button data-action="increase" data-id="${item.id}">+</button>
      </div>
    `;

    card.querySelector("[data-remove]").addEventListener("click", () => {
      removeCartItem(item.id);
    });

    card.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "increase" && item.quantity >= 20) {
          toast("Maximum 20 per item");
          return;
        }
        const newQty = action === "increase" ? item.quantity + 1 : item.quantity - 1;
        if (newQty <= 0) {
          removeCartItem(item.id);
        } else {
          updateCartItem(item.id, newQty);
        }
      });
    });

    container.appendChild(card);
  });
};

const renderCartSummary = () => {
  const summary = qs("#cart-summary");
  if (!summary) return;

  if (!state.cart.items.length) {
    summary.innerHTML = "";
    return;
  }

  summary.innerHTML = `
    <h3>Order summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>${currency.format(state.cart.totals.subtotal)}</span></div>
    <div class="summary-row"><span>Tax</span><span>${currency.format(state.cart.totals.tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${currency.format(state.cart.totals.total)}</span></div>
    <a href="#checkout" class="btn primary" data-link>Checkout</a>
  `;
};

const renderCheckoutSummary = () => {
  const summary = qs("#checkout-summary");
  if (!summary) return;

  if (!state.cart.items.length) {
    summary.innerHTML = `
      <h3>Order summary</h3>
      <p>Your cart is empty.</p>
      <a href="#menu" class="btn primary" data-link>Browse menu</a>
    `;
    return;
  }

  const itemsList = state.cart.items
    .map(
      (item) => `
        <div class="summary-row">
          <span>${item.name} × ${item.quantity}</span>
          <span>${currency.format(item.lineTotal)}</span>
        </div>
      `
    )
    .join("");

  summary.innerHTML = `
    <h3>Order summary</h3>
    ${itemsList}
    <div class="summary-row"><span>Subtotal</span><span>${currency.format(state.cart.totals.subtotal)}</span></div>
    <div class="summary-row"><span>Tax</span><span>${currency.format(state.cart.totals.tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${currency.format(state.cart.totals.total)}</span></div>
  `;
};

const handleCheckout = () => {
  const form = qs("#checkout-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = qs("#checkout-message");

    if (!state.cart.items.length) {
      if (message) message.textContent = "Your cart is empty.";
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    const whatsappOptIn = data.whatsappOptIn === "on";

    try {
      const result = await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          customerName: data.customerName,
          phone: data.phone,
          address: data.address,
          notes: data.notes || "",
          whatsappOptIn
        })
      });

      form.reset();
      if (message) {
        message.textContent = `Order placed! Your order ID is ${result.data.orderId}.`;
      }
      showWhatsAppOrderLink(result.data.orderId);
      toast("Order placed successfully");
      refreshCart();
    } catch (error) {
      if (message) message.textContent = error.message;
      toast(error.message);
    }
  });
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
  state.admin.token = token || "";
  if (state.admin.token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, state.admin.token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

const adminHeaders = () => {
  if (!state.admin.token) return {};
  return {
    Authorization: `Bearer ${state.admin.token}`
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
            ${escapeHtml(order.address)}
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
  const hasToken = Boolean(state.admin.token);
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
      toast("Admin login successful");
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
      toast("Admin logged out");
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

const hydrateWhatsAppLinks = () => {
  const links = qsa("[data-whatsapp]");
  const hasNumber = Boolean(sanitizeWhatsAppNumber(WHATSAPP_NUMBER));
  const notes = qsa("[data-whatsapp-note]");

  if (!hasNumber) {
    links.forEach((link) => {
      link.style.display = "none";
    });
    notes.forEach((note) => {
      note.style.display = "none";
    });
    return;
  }

  links.forEach((link) => {
    const message = link.dataset.message || "Hi! I would like to place an order.";
    const href = buildWhatsAppLink(message);
    if (!href) {
      link.style.display = "none";
      return;
    }
    link.setAttribute("href", href);
  });
};

const showWhatsAppOrderLink = (orderId) => {
  const container = qs("#whatsapp-cta");
  if (!container) return;
  const href = buildWhatsAppLink(
    `Hi! I just placed order #${orderId}. Please share live updates.`
  );
  if (!href) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <a class="btn ghost" href="${href}" target="_blank" rel="noopener">
      Track on WhatsApp
    </a>
  `;
};

const initNav = () => {
  const toggle = qs(".nav-toggle");
  const nav = qs(".nav-links");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
    });
  }

  qsa("[data-link]").forEach((link) => {
    link.addEventListener("click", () => {
      if (nav) nav.classList.remove("open");
    });
  });
};

const init = () => {
  initNav();
  handleAdminLogin();
  handleAdminControls();
  handleRouting();
  window.addEventListener("hashchange", handleRouting);

  hydrateWhatsAppLinks();
  loadCategories();
  loadMenu("All");
  refreshCart();
  handleCheckout();
};

init();
