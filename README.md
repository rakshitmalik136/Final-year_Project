# Cakes n Bakes 365

Production-ready full-stack web app for a local bakery + fast food shop.

## Stack
- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js, Express
- Database: PostgreSQL

## Folder Structure
- `frontend/` static client
- `backend/` Express API
- `backend/sql/schema.sql` database schema + seed data
- `docker-compose.yml` optional container setup

## Local Setup (No Docker)

### 1) Database
```bash
createdb cakesnbakes
psql -d cakesnbakes -f backend/sql/schema.sql
```

### 2) Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
Update `DATABASE_URL` and `CLIENT_ORIGIN` in `backend/.env` if needed.

Optional WhatsApp updates: set `WHATSAPP_*` values in `backend/.env` (see `.env.example`).

### 3) Frontend
```bash
cd frontend
python -m http.server 8081
```
Open `http://localhost:8081`.

If your API is not at `http://localhost:4000/api`, update `frontend/config.js`.
To enable the WhatsApp button, set `WHATSAPP_NUMBER` in `frontend/config.js` (digits only).

## Docker
```bash
docker compose up --build
```
Frontend (HTTPS): `https://localhost`
Frontend (direct container HTTP): `http://localhost:8081`
Backend via HTTPS proxy: `https://localhost/api/health`
Backend direct container: `http://localhost:4000/api/health`
Admin page: `https://localhost/#admin`
Note: In Docker, the frontend proxies `/api` to the backend automatically.
Note: The proxy creates a self-signed certificate on first boot, so your browser will show a warning unless you trust that cert locally.

```env
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-strong-password
ADMIN_AUTH_SECRET=your-random-long-secret
ADMIN_TOKEN_TTL_SECONDS=43200
```

### Access From Other Devices (LAN)
1. Find your host machine IP (example: `192.168.1.50`).
2. Set these in project root `.env`:
```env
CLIENT_ORIGIN=https://192.168.1.50,http://192.168.1.50,https://localhost,http://localhost:8081,http://localhost
SSL_CN=192.168.1.50
SSL_ALT_NAMES=DNS:localhost,IP:127.0.0.1,IP:192.168.1.50
```
3. Recreate proxy cert volume and restart:
```bash
docker compose down
docker volume rm new-project_nginx-certs
docker compose up --build
```
4. Open from any device on same network:
`https://192.168.1.50`

For no browser warnings on all devices, use a real domain + publicly trusted TLS certificate (for example Let's Encrypt).

## CI/CD with Jenkins

This repository includes a root `Jenkinsfile` for CI/CD with Docker Compose.

### Pipeline Stages
1. Checkout source from SCM.
2. Validate Docker + Docker Compose availability on the Jenkins agent.
3. Prepare `.env`:
   - if `ENV_FILE_CREDENTIALS_ID` is set, load that Jenkins secret file as `.env`
   - otherwise use local `.env` if present, or fallback to `.env.ci.example`
4. Run backend install + static parse checks (`npm ci` + `node --check`).
5. Build Docker images (`docker compose build --pull`).
6. Deploy containers (`docker compose up -d --build --remove-orphans`) when `DEPLOY=true`.
7. Run smoke checks when `SMOKE_TEST=true`.
8. Always print `docker compose ps`; print recent container logs on failure.

### Jenkins Agent Requirements
- Docker Engine + `docker compose` plugin
- Node.js and npm
- Jenkins user permission to access Docker socket (commonly by being in the `docker` group)

### Job Setup (Pipeline From SCM)
1. Create a Jenkins Pipeline job (or Multibranch Pipeline).
2. Point SCM to this repository.
3. Keep script path as `Jenkinsfile`.
4. Add optional Jenkins credential (Secret file) containing root `.env` values.
5. Pass that credential ID in the `ENV_FILE_CREDENTIALS_ID` build parameter.

### Useful Build Parameters
- `DEPLOY` (default `true`): deploy containers after build.
- `SMOKE_TEST` (default `true`): run health checks after deploy.
- `ENV_FILE_CREDENTIALS_ID` (default empty): secret `.env` file credential ID.
- `COMPOSE_PROJECT_NAME` (default `cakesnbakes`): compose project namespace.

### Git Push Auto-Trigger
1. In Jenkins, enable webhook-based builds for your Git provider.
2. Add the repository webhook to your Jenkins webhook endpoint.
3. Push to the tracked branch; Jenkins will run the pipeline automatically.

Note: Jenkins commonly runs on `http://<host>:8080`; this app's direct frontend port is `8081`, so they do not conflict.

## API Endpoints
Base URL: `/api`

### Health
`GET /health`
```json
{ "status": "ok" }
```

### Categories
`GET /categories`
```json
{
  "data": [
    { "id": 1, "name": "Bakery" },
    { "id": 2, "name": "Fast Food" }
  ]
}
```

### Menu Items
`GET /menu?category=Bakery`
```json
{
  "data": [
    {
      "id": 1,
      "name": "Chocolate Truffle Cake",
      "description": "Rich chocolate sponge layered with silky ganache.",
      "price": "550.00",
      "image_url": "https://...",
      "category": "Bakery"
    }
  ]
}
```

### Cart
`GET /cart/{sessionId}`
```json
{
  "data": {
    "sessionId": "cb365-abc123",
    "items": [],
    "totals": { "subtotal": 0, "tax": 0, "total": 0 }
  }
}
```

`POST /cart/{sessionId}/items`
```json
{ "productId": 1, "quantity": 1 }
```

`PATCH /cart/{sessionId}/items/{itemId}`
```json
{ "quantity": 2 }
```

`DELETE /cart/{sessionId}/items/{itemId}`

### Orders
`POST /orders`
```json
{
  "sessionId": "cb365-abc123",
  "customerName": "Riya Sharma",
  "phone": "9319426397",
  "address": "Cakes n Bakes 365, Mehrauli ND-30",
  "notes": "Less spicy please",
  "whatsappOptIn": true
}
```
Response:
```json
{
  "data": {
    "orderId": 10,
    "createdAt": "2026-02-10T12:00:00.000Z",
    "customerName": "Riya Sharma",
    "phone": "9319426397",
    "address": "Cakes n Bakes 365, Mehrauli ND-30",
    "notes": "Less spicy please",
    "whatsappOptIn": true,
    "items": [
      {
        "productId": 1,
        "name": "Chocolate Truffle Cake",
        "quantity": 1,
        "unitPrice": 550,
        "lineTotal": 550
      }
    ],
    "totals": { "subtotal": 550, "tax": 0, "total": 550 },
    "status": "placed"
  }
}
```

`PATCH /orders/{orderId}/status`
```json
{ "status": "preparing" }
```
Note: This endpoint now requires admin bearer token.

### Admin
`POST /admin/login`
```json
{ "username": "admin", "password": "admin123" }
```
`GET /admin/dashboard` (Bearer token required)
Response includes:
- current orders list
- in-transit orders list
- day/month/year earnings

### WhatsApp Webhook
Incoming WhatsApp messages (Twilio) should be configured to:
`POST /api/whatsapp/inbound`

Send `STATUS <order id>` from WhatsApp to get a live update.

If you already have a database, add the opt-in column:
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
```

## Admin-Friendly Product Updates
Add or edit products directly in the database. Example:
```sql
INSERT INTO products (category_id, name, description, price)
SELECT id, 'New Item', 'Description', 123
FROM categories WHERE name = 'Bakery';
```

## Notes
- The frontend uses a session id stored in `localStorage` for cart tracking.
- Menu data is loaded dynamically from the API.
