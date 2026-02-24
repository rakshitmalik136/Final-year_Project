# Cakes n Bakes 365

A full-stack web app for a local bakery and fast food shop.

## Stack

- **Frontend:** HTML, CSS, Vanilla JS (served via Nginx)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Proxy:** Nginx (HTTPS, Basic Auth for admin)

---

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+
- Docker + Docker Compose *(for containerized setup)*

---

## Running Without Docker

### 1. Database

```bash
createdb cakesnbakes
psql -d cakesnbakes -f backend/sql/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and required ADMIN_* vars
npm run dev
```

Backend runs at `http://localhost:4000`.

### 3. Frontend

```bash
cd frontend
python -m http.server 8081
```

Frontend runs at `http://localhost:8081`.  
If your API is not at `http://localhost:4000/api`, update `frontend/config.js`.

---

## Running With Docker

```bash
cp .env.ci.example .env
# Edit .env — fill in ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_AUTH_SECRET, ADMIN_VIEW_USER, ADMIN_VIEW_PASSWORD
docker compose up --build
```

| URL | Description |
|-----|-------------|
| `https://localhost` | Frontend (HTTPS via proxy) |
| `http://localhost:8081` | Frontend (direct, localhost only) |
| `https://localhost/api/health` | Backend health check |
| `https://localhost/admin` | Admin dashboard (Basic Auth protected) |

> The proxy generates a self-signed certificate on first boot. Your browser will show a security warning — this is expected for local dev.

---

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `ADMIN_AUTH_SECRET` | Secret for signing admin JWT tokens |
| `ADMIN_TOKEN_TTL_SECONDS` | Token expiry in seconds (default: `43200`) |
| `ADMIN_VIEW_USER` | HTTP Basic Auth username for `/admin` |
| `ADMIN_VIEW_PASSWORD` | HTTP Basic Auth password for `/admin` |
| `DATABASE_URL` | PostgreSQL connection string |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated) |

For WhatsApp order notifications (optional), also set `WHATSAPP_ACCOUNT_SID`, `WHATSAPP_AUTH_TOKEN`, `WHATSAPP_FROM`, and `WHATSAPP_DEFAULT_COUNTRY_CODE`.

---

## LAN Access (Docker)

To access from other devices on the same network:

1. Find your machine's IP (e.g. `192.168.1.50`).
2. Set in `.env`:
   ```
   CLIENT_ORIGIN=https://192.168.1.50,http://192.168.1.50,https://localhost,http://localhost:8081,http://localhost
   SSL_CN=192.168.1.50
   SSL_ALT_NAMES=DNS:localhost,IP:127.0.0.1,IP:192.168.1.50
   ```
3. Recreate the cert volume and restart:
   ```bash
   docker compose down
   docker volume rm cakesnbakes_nginx-certs
   docker compose up --build
   ```

---

## Backend Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `pg` | PostgreSQL client |
| `zod` | Request validation |
| `helmet` | Security headers |
| `cors` | CORS middleware |
| `morgan` | Request logging |
| `dotenv` | Environment config |
| `nodemon` *(dev)* | Auto-restart on file change |

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/categories` | List categories |
| `GET` | `/api/menu?category=Bakery` | List menu items |
| `GET` | `/api/cart/:sessionId` | Get cart |
| `POST` | `/api/cart/:sessionId/items` | Add item to cart |
| `PATCH` | `/api/cart/:sessionId/items/:itemId` | Update item quantity |
| `DELETE` | `/api/cart/:sessionId/items/:itemId` | Remove item |
| `POST` | `/api/orders` | Place order |
| `PATCH` | `/api/orders/:orderId/status` | Update order status *(admin token required)* |
| `POST` | `/api/admin/login` | Admin login |
| `GET` | `/api/admin/dashboard` | Admin dashboard *(admin token required)* |
| `POST` | `/api/whatsapp/inbound` | Twilio WhatsApp webhook |
