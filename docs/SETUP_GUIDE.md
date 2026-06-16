# AlertHive — Setup & Operations Guide

**Author:** Suman Chakraborty  
**Version:** 1.0.0  
**Last Updated:** March 2026  
**Classification:** Internal — FedEx ITO

---

## Prerequisites

Before setting up AlertHive, ensure the following are installed on your machine:

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18.x LTS | `node --version` |
| npm | 9.x | `npm --version` |
| Git | 2.x | `git --version` |
| Docker (optional) | 24.x | `docker --version` |
| Redis (optional) | 7.x | `redis-server --version` |

---

## Local Development Setup

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd AlertHive
```

### Step 2 — Configure the API

```bash
cd alerthive-api
npm install
```

Create a `.env` file in `alerthive-api/`:

```env
NODE_ENV=development
PORT=4000
API_BASE=/api/v1
DATABASE_URL="file:./dev.db"
JWT_SECRET=dev-only-secret-change-this
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
```

> **Note:** Redis and Kafka entries can be omitted in local development. The server will start without them.

### Step 3 — Seed the Database

The seed script creates the SQLite database and populates demo users, organisations, alerts, incidents, and tickets.

```bash
cd alerthive-api
npx ts-node src/db/seed.ts
```

Expected output:

```
✅ Organisation: FedEx ITO
✅ Users: Suman Chakraborty, Mike Johnson, Alex Rivera, Emily Watson, Jordan Lee, Casey Morgan
✅ Alerts: 12 seeded
✅ Incidents: 4 seeded
✅ Tickets: 8 seeded

Admin:     admin@alerthive.com / REDACTED_SEED_PASSWORD
Developer: mike@alerthive.com / dev123
End User:  jordan@example.com / user123
```

### Step 4 — Start the API Server

```bash
cd alerthive-api
npm run dev
```

Confirm startup:

```
[INFO] AlertHive API started on http://localhost:4000
[INFO] WebSocket server initialised
[WARN] Redis connection failed – running without cache (development mode)
[WARN] Kafka connection failed – events will not be published (development mode)
```

Validate health:

```bash
curl http://localhost:4000/api/v1/health
# → {"status":"ok","dependencies":{"redis":"unavailable","kafka":"unavailable","database":"connected"}}
```

### Step 5 — Start the Web Application

```bash
cd alerthive-web
npm install
npx vite --port 5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser and sign in with the demo Admin credentials.

---

## Docker Compose Setup

For a fully isolated environment including Redis and Kafka:

```bash
# From the AlertHive root directory
docker-compose up --build
```

This starts:

| Service | Port |
|---|---|
| `alerthive-api` | 4000 |
| `alerthive-web` | 5173 |
| `redis` | 6379 |
| `zookeeper` | 2181 |
| `kafka` | 9092 |

To stop all services:

```bash
docker-compose down
# To also delete persistent volumes:
docker-compose down -v
```

---

## Database Management

### Re-seed (Reset to Clean State)

```bash
cd alerthive-api
# Delete the existing database
Remove-Item dev.db -ErrorAction SilentlyContinue   # PowerShell
# or: rm dev.db                                      # bash

# Re-run migrations and seed
npx prisma migrate deploy
npx ts-node src/db/seed.ts
```

### Generate Prisma Client (after schema changes)

```bash
cd alerthive-api
npx prisma generate
```

### Run Migrations

```bash
cd alerthive-api
# Development (creates a migration file)
npx prisma migrate dev --name your-migration-name

# Production
npx prisma migrate deploy
```

### Open Prisma Studio (Database GUI)

```bash
cd alerthive-api
npx prisma studio
# Opens at http://localhost:5555
```

---

## Running Tests

### API Performance Tests (Artillery)

```bash
cd alerthive-api

# Start the API first
npm run dev &

# Run smoke test (quick sanity check, ~30 seconds)
node tests/load/perf-runner.mjs smoke

# Run full load test (30 concurrent users, 3 minutes)
node tests/load/perf-runner.mjs load

# Run benchmark (throughput ceiling, 15 seconds)
node tests/load/perf-runner.mjs benchmark
```

Results are saved to `tests/load/last-<type>-result.txt`.

---

## Production Deployment

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=4000
API_BASE=/api/v1

# Use PostgreSQL in production
DATABASE_URL="postgresql://user:password@host:5432/alerthive?schema=public"

# Strong random JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=<32-byte-random-string>
JWT_EXPIRES_IN=8h

# Only allow your production frontend domain
CORS_ORIGINS=https://alerthive.yourcompany.com

# Redis
REDIS_URL=redis://<azure-cache-host>:6380?tls=true

# Kafka (Azure Event Hubs compatible)
KAFKA_BROKER=<eventhubs-namespace>.servicebus.windows.net:9093
KAFKA_CLIENT_ID=alerthive-api
KAFKA_GROUP_ID=alerthive-consumers

# Webhook security
ALERTHIVE_WEBHOOK_SECRET=<strong-random-secret>
```

### Build the Frontend for Production

```bash
cd alerthive-web

# Create production build
npm run build

# Preview the production build locally
npx vite preview --port 5173
```

Output is at `alerthive-web/dist/` — serve via nginx, Azure Static Web Apps, or any CDN.

### Production nginx Configuration (API Reverse Proxy)

```nginx
server {
  listen 443 ssl;
  server_name api.alerthive.yourcompany.com;

  ssl_certificate     /etc/ssl/certs/cert.pem;
  ssl_certificate_key /etc/ssl/private/key.pem;

  location /api/v1/ {
    proxy_pass         http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## Monitoring & Observability

### API Health Endpoint

```
GET /api/v1/health
```

Integrate this with your uptime monitor (Azure Monitor, Prometheus, etc.) to alert on degraded state.

### Log Levels

Logs are structured via the internal `logger` utility (winston-compatible):

| Level | Used For |
|---|---|
| `error` | Unhandled exceptions, DB failures |
| `warn` | Missing optional dependencies (Redis, Kafka) |
| `info` | Server startup, DB connection, shutdown |
| `http` | Incoming HTTP requests (via morgan) |
| `debug` | Detailed logic tracing (dev only) |

Set `LOG_LEVEL=debug` in `.env` for verbose output during development.

### Recommended Azure Observability Stack

- **Azure Monitor** — infrastructure metrics
- **Application Insights** — APM, distributed tracing, exception tracking
- **Log Analytics Workspace** — centralised log querying (KQL)
- **Azure Alerts** — threshold-based alerting on CPU, memory, error rate

---

## Troubleshooting

### API fails to start: `EADDRINUSE :4000`

Another process is already using port 4000.

```powershell
# Find the process
netstat -ano | findstr :4000

# Kill it (replace <PID> with actual PID)
Stop-Process -Id <PID> -Force
```

### `Invalid email or password` on login

1. Confirm the database was seeded: `npx ts-node src/db/seed.ts`
2. If you changed admin email, clear browser `sessionStorage` (DevTools → Application → Session Storage → Clear All)
3. Use a private/incognito window to avoid cached credentials

### Kafka connection errors on startup

Expected in local development. The API logs warnings but continues normally. No action required.

### TypeScript compilation errors in web app

```bash
cd alerthive-web
npx tsc --noEmit
```

Fix any reported errors before running `npx vite build`.

---

*Document version 1.0 · Suman Chakraborty · FedEx ITO · March 2026*
