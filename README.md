# AlertHive — Enterprise Incident Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-purple?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/status-production--ready-brightgreen?style=for-the-badge" alt="Status"/>
  <img src="https://img.shields.io/badge/license-MIT-orange?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/badge/node-%3E%3D18-blue?style=for-the-badge" alt="Node"/>
</p>

> **AlertHive** is a full-stack, enterprise-grade incident management and alerting platform designed for operations teams at scale. Built on the **FedEx Technology Infrastructure** stack, it unifies alert routing, on-call scheduling, ticketing, SLA tracking, and real-time notifications into a single pane of glass.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Role-Based Access Control](#role-based-access-control)
- [Integrations](#integrations)
- [Performance](#performance)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Author](#author)

---

## Overview

AlertHive addresses the operational challenge of managing high-volume alert streams across distributed systems. By consolidating alert ingestion, intelligent routing, on-call scheduling, ITSM workflows, and analytics into one coherent platform, it reduces mean time to respond (MTTR) and eliminates alert fatigue.

### Key Goals

| Goal | Description |
|---|---|
| **Unified Visibility** | Single dashboard for all alerts, incidents, problems, and changes |
| **Intelligent Routing** | Rule-based alert routing with priority scoring and escalation chains |
| **ITSM Alignment** | Full problem/change/postmortem lifecycle following ITIL practices |
| **Real-Time Collaboration** | WebSocket-powered live updates for distributed response teams |
| **Extensible** | Webhook-based integrations with tools like Dynatrace, PagerDuty, and Datadog |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                 │
│                                                                        │
│   alerthive-web  (React + Vite)        alerthive  (React Native)      │
│   Web Dashboard (:5173)                Mobile App (Expo)               │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ REST + WebSocket
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                    │
│                                                                        │
│   alerthive-api  Node.js + Express (:4000)                            │
│   ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────────┐ │
│   │ Auth (JWT) │  │  Routes  │  │ Controllers│  │   Middleware    │ │
│   └────────────┘  └──────────┘  └────────────┘  └─────────────────┘ │
│   ┌────────────┐  ┌──────────┐  ┌────────────┐                       │
│   │  Services  │  │ WebSocket│  │  Prisma ORM│                       │
│   └────────────┘  └──────────┘  └────────────┘                       │
└───────┬──────────────────┬───────────────────────────────────────────┘
        │                  │
   ┌────▼────┐        ┌────▼────────────────────┐
   │ SQLite  │        │   Redis (cache/sessions) │
   │ (Prisma)│        └─────────────────────────┘
   └─────────┘
        │
   ┌────▼────────────┐
   │   Apache Kafka  │
   │ (event streaming│
   │  async alerts)  │
   └─────────────────┘
```

### Data Flow

1. **Inbound Alerts** arrive via REST API or webhook (Dynatrace, etc.)
2. **Alert Routing Engine** evaluates rules and assigns priority/team
3. **On-Call Scheduler** identifies the active responder
4. **Notification Service** dispatches via configured channels (email, Slack, PagerDuty)
5. **WebSocket Broadcast** pushes real-time updates to all connected clients
6. **Kafka Producer** publishes events for downstream consumers and audit logs

---

## Tech Stack

### Frontend (`alerthive-web`)

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | Component framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.4.1 | Build tooling & dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| React Router | 6.x | Client-side routing |
| Lucide React | latest | Icon system |
| Axios | latest | HTTP client |

### Backend (`alerthive-api`)

| Technology | Version | Purpose |
|---|---|---|
| Node.js | ≥18.x | Runtime |
| Express | 4.x | HTTP framework |
| TypeScript | 5.x | Type safety |
| Prisma ORM | 5.x | Database access layer |
| SQLite | — | Development database |
| Redis | 7.x | Caching & rate limiting |
| Apache Kafka | — | Async event streaming |
| ws | latest | WebSocket server |
| Zod | 3.x | Request validation |
| JSON Web Token | — | Authentication |
| Bcrypt | — | Password hashing |
| Helmet | — | HTTP security headers |

### Mobile (`alerthive`)

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.79.x | Mobile framework |
| Expo | 53.x | Development platform |
| TypeScript | 5.x | Type safety |

---

## Features

### Core Platform

- **Real-Time Dashboard** — Live KPIs: open alerts, active incidents, SLA health, on-call status
- **Alert Management** — Acknowledge, snooze, escalate, and close alerts with audit trail
- **Incident Management** — Full lifecycle from detection to postmortem with severity classification
- **On-Call Scheduling** — Rotation viewer, team contacts, and override management
- **Ticket System** — Create, assign, track, and comment on support tickets
- **SLA Policies** — Configurable SLA tiers with breach alerting and compliance reporting

### ITSM Module

- **Problem Management** — Root cause tracking, known error database, workaround documentation
- **Change Management** — RFC workflow with approval gates, CAB scheduling, and rollback plans
- **Postmortems** — Blameless incident reviews with action item tracking
- **Knowledge Base** — Searchable runbooks and resolution guides
- **Service Catalog** — Self-service portal for infrastructure and application services

### Operations Toolkit

- **Escalation Policies** — Multi-level escalation chains with configurable time thresholds
- **Alert Routing** — Rule-based routing by severity, source, tag, and team
- **Heartbeat Monitoring** — Dead man's switch health checks for critical processes
- **Maintenance Windows** — Scheduled suppression of alerts during planned downtime
- **Notification Channels** — Email, Slack, PagerDuty, Microsoft Teams, webhooks
- **Playbooks** — Step-by-step resolution guides attached to alert types
- **Integrations** — Native Dynatrace webhook receiver; extensible to other APM/monitoring tools

### Analytics & Reporting

- **Analytics Dashboard** — Alert volume, resolution times, top resolvers, SLA compliance
- **CSV Export & Email Reports** — Download or email filtered analytics data
- **Performance Benchmarks** — p99 < 13 ms, 14,336 RPS capacity (see [Performance](#performance))

---

## Project Structure

```
AlertHive/
├── alerthive-web/              # React web application
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   │   ├── AlertCard.tsx
│   │   │   ├── IncidentCard.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatCard.tsx
│   │   ├── context/            # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   └── TicketContext.tsx
│   │   ├── data/               # Mock/seed data
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities (api.ts, etc.)
│   │   ├── pages/              # Route-level page components
│   │   ├── theme/              # Design tokens
│   │   │   └── colors.ts       # FedEx Purple & Orange palette
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── alerthive-api/              # Node.js REST API
│   ├── src/
│   │   ├── config/             # Redis, Kafka, app config
│   │   ├── controllers/        # Request handlers
│   │   │   ├── alertController.ts
│   │   │   ├── analyticsController.ts
│   │   │   ├── authController.ts
│   │   │   ├── incidentController.ts
│   │   │   ├── ticketController.ts
│   │   │   └── ...
│   │   ├── db/
│   │   │   ├── prisma.ts       # Prisma client singleton
│   │   │   └── seed.ts         # Database seeder
│   │   ├── messaging/          # Kafka producer/consumer
│   │   ├── middleware/         # Auth, error handling, rate limiting
│   │   ├── routes/             # Express routers
│   │   │   ├── index.ts        # Route aggregator
│   │   │   ├── alerts.ts
│   │   │   ├── auth.ts
│   │   │   ├── analytics.ts
│   │   │   ├── incidents.ts
│   │   │   ├── tickets.ts
│   │   │   ├── webhooks.ts     # Inbound webhook receiver
│   │   │   └── ...
│   │   ├── services/           # Business logic
│   │   ├── types/              # Shared TypeScript types
│   │   ├── utils/              # Logger, helpers
│   │   ├── websocket/          # WebSocket broadcast
│   │   └── index.ts            # Application entry point
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   │   └── load/               # Artillery performance tests
│   └── package.json
│
├── alerthive/                  # React Native mobile app
│   ├── app/                    # Expo Router screens
│   ├── components/             # Mobile UI components
│   └── package.json
│
├── docker-compose.yml          # Full-stack containerized setup
└── README.md                   # This file
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| (Optional) Redis | 7.x |
| (Optional) Kafka | 3.x |
| (Optional) Docker | 24.x |

> **Note:** Redis and Kafka are optional for local development. The API starts successfully without them and will log connection warnings.

### 1 — Clone and navigate

```bash
git clone <repository-url>
cd AlertHive
```

### 2 — Start the API

```bash
cd alerthive-api
npm install

# Seed the database with demo users and data
npx ts-node src/db/seed.ts

# Start development server
npm run dev
# API available at http://localhost:4000
```

### 3 — Start the Web App

```bash
cd alerthive-web
npm install

npx vite --port 5173
# Web app available at http://localhost:5173
```

### 4 — (Optional) Start the Mobile App

```bash
cd alerthive
npm install
npx expo start
```

### Using Docker Compose

```bash
# Start all services (API, web, Redis, Kafka, Zookeeper)
docker-compose up --build

# Stop all services
docker-compose down
```

---

## Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@alerthive.com` | `REDACTED_SEED_PASSWORD` | Full platform access |
| **Developer** | `mike@alerthive.com` | `dev123` | Alerts, incidents, ITSM |
| **End User** | `jordan@example.com` | `user123` | Tickets only |

---

## Environment Variables

### `alerthive-api/.env`

```env
# Application
NODE_ENV=development
PORT=4000
API_BASE=/api/v1

# Database (Prisma)
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Redis (optional in development)
REDIS_URL=redis://localhost:6379

# Kafka (optional in development)
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=alerthive-api
KAFKA_GROUP_ID=alerthive-consumers

# Webhook Security (Dynatrace and other integrations)
ALERTHIVE_WEBHOOK_SECRET=your-webhook-secret-here
```

### `alerthive-web/.env`

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

---

## API Reference

**Base URL:** `http://localhost:4000/api/v1`

All authenticated endpoints require the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | ❌ | Authenticate and receive JWT |
| `POST` | `/auth/register` | ❌ | Register a new user |
| `GET` | `/auth/me` | ✅ | Get the current authenticated user |
| `POST` | `/auth/logout` | ✅ | Invalidate session |

**Login Request:**
```json
{
  "email": "admin@alerthive.com",
  "password": "REDACTED_SEED_PASSWORD"
}
```

**Login Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "u-001",
      "name": "Suman Chakraborty",
      "email": "admin@alerthive.com",
      "role": "admin"
    }
  }
}
```

---

### Alerts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/alerts` | ✅ | List alerts (filterable by status, priority) |
| `POST` | `/alerts` | ✅ | Create a new alert |
| `GET` | `/alerts/:id` | ✅ | Get alert details |
| `PATCH` | `/alerts/:id` | ✅ | Update alert status/priority |
| `DELETE` | `/alerts/:id` | ✅ | Delete alert (admin only) |

**Query Parameters for `GET /alerts`:**

| Param | Type | Values |
|---|---|---|
| `status` | string | `open`, `acknowledged`, `closed` |
| `priority` | string | `critical`, `high`, `medium`, `low` |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20) |

---

### Tickets

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/tickets` | ✅ | List tickets |
| `POST` | `/tickets` | ✅ | Create ticket |
| `GET` | `/tickets/:id` | ✅ | Get ticket with comments |
| `PATCH` | `/tickets/:id` | ✅ | Update ticket |
| `POST` | `/tickets/:id/comments` | ✅ | Add comment to ticket |

---

### Incidents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/incidents` | ✅ | List incidents |
| `POST` | `/incidents` | ✅ | Create incident |
| `GET` | `/incidents/:id` | ✅ | Get incident details |
| `PATCH` | `/incidents/:id` | ✅ | Update incident |

---

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/summary` | ✅ | Alert volume, resolution stats, SLA compliance |
| `GET` | `/analytics/top-resolvers` | ✅ | Top performers by tickets resolved |
| `POST` | `/analytics/email-report` | ✅ | Queue CSV analytics report for email delivery |

**Email Report Request:**
```json
{
  "email": "admin@alerthive.com",
  "range": "30d",
  "ticketCount": 142,
  "csvData": "..."
}
```

---

### Webhooks (Inbound)

Webhook endpoints do **not** require JWT authentication. They use a pre-shared secret header instead.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/webhooks/dynatrace/:orgSlug` | Header secret | Receive Dynatrace problem events |

**Dynatrace Webhook Header:**

```
X-AlertHive-Secret: <ALERTHIVE_WEBHOOK_SECRET>
```

**Dynatrace Payload Example:**

```json
{
  "State": "OPEN",
  "ProblemTitle": "Response time degraded on payment-service",
  "ProblemSeverity": "PERFORMANCE",
  "Tags": ["payment", "prod"],
  "ImpactedEntities": ["payment-service-pod-1"]
}
```

---

### Health Check

```
GET /health
```

```json
{
  "status": "ok",
  "ts": "2026-03-10T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "redis": "connected",
    "kafka": "connected",
    "database": "connected"
  }
}
```

---

## Role-Based Access Control

AlertHive implements three roles with distinct permission scopes:

| Permission | Admin | Developer | End User |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ❌ |
| Alerts | ✅ | ✅ | ❌ |
| Incidents | ✅ | ✅ | ❌ |
| On-Call | ✅ | ✅ | ❌ |
| Tickets (all) | ✅ | ✅ | Own only |
| Raise Ticket | ✅ | ✅ | ✅ |
| Problems | ✅ | ✅ | ❌ |
| Changes | ✅ | ✅ | ❌ |
| Postmortems | ✅ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ❌ |
| SLA Policies | ✅ | ✅ | ❌ |
| Escalation Policies | ✅ | ✅ | ❌ |
| Alert Routing | ✅ | ✅ | ❌ |
| Heartbeats | ✅ | ✅ | ❌ |
| Maintenance Windows | ✅ | ✅ | ❌ |
| Notification Channels | ✅ | ✅ | ❌ |
| Playbooks | ✅ | ✅ | ❌ |
| Integrations | ✅ | ✅ | ❌ |
| Knowledge Base | ✅ | ✅ | ❌ |
| Service Catalog | ✅ | ✅ | ❌ |
| Settings | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ |

---

## Integrations

### Dynatrace

AlertHive provides a native inbound webhook integration with Dynatrace:

1. In Dynatrace, navigate to **Settings → Integrations → Problem Notifications**
2. Select **Custom Integration**
3. Set the webhook URL:
   ```
   http://<your-server>:4000/api/v1/webhooks/dynatrace/<orgSlug>
   ```
4. Add the authentication header:
   ```
   X-AlertHive-Secret: <your-webhook-secret>
   ```
5. Set **trigger condition** to `Problem opened`

**Severity Mapping:**

| Dynatrace Severity | AlertHive Priority |
|---|---|
| `AVAILABILITY` | `critical` |
| `ERROR` | `high` |
| `PERFORMANCE` | `high` |
| `RESOURCE_CONTENTION` | `medium` |
| `CUSTOM_ALERT` | `medium` |
| `MONITORING_UNAVAILABLE` | `low` |

### Extensible Webhook Architecture

Additional monitoring tools can be integrated by creating new route handlers in `alerthive-api/src/routes/webhooks.ts` following the same pattern.

---

## Performance

From the latest Artillery performance test against the development environment (Node.js v24.11.1):

| Test Suite | Requests | Failures | p99 Latency | Peak RPS |
|---|---|---|---|---|
| Benchmark | 215,044 | 0 | 13 ms | **14,336** |
| Load (30 concurrent users) | 17,518 | 0 | 10.1 ms | 100 |
| Smoke | ~120 | 0 | 742 ms | 2 |

> Full report at [`alerthive-api/tests/load/PERFORMANCE_REPORT.md`](alerthive-api/tests/load/PERFORMANCE_REPORT.md)

**Key Production Capacity Estimates (3-pod AKS):**

| Deployment | Estimated RPS | Estimated Daily Requests |
|---|---|---|
| 3 pods × 2 vCPU | ~3,000–5,000 | ~260M |
| 3 pods × 4 vCPU | ~6,000–10,000 | ~520M |

---

## Deployment

### Docker Compose (All-in-One)

```bash
docker-compose up --build -d
```

Services started:
- `alerthive-api` — REST API on port 4000
- `alerthive-web` — Web frontend on port 5173
- `redis` — Redis on port 6379
- `zookeeper` — Kafka dependency
- `kafka` — Kafka broker on port 9092

### AKS / Kubernetes Production

Recommended production topology:

```
                    ┌──────────────┐
                    │ Azure Load   │
                    │   Balancer   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌─────────┐  ┌─────────┐  ┌─────────┐
       │  Pod 1  │  │  Pod 2  │  │  Pod 3  │
       │  API    │  │  API    │  │  API    │
       └────┬────┘  └────┬────┘  └────┬────┘
            └────────────┼────────────┘
                         │
            ┌────────────┼────────────┐
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │  Azure Cache │         │   Azure SQL  │
    │  for Redis   │         │   or CosmosDB│
    └──────────────┘         └──────────────┘
```

**Deployment Checklist:**

- [ ] Set `NODE_ENV=production`
- [ ] Use managed PostgreSQL (Azure Database for PostgreSQL)
- [ ] Use Azure Cache for Redis
- [ ] Use Azure Event Hubs (Kafka-compatible) for streaming
- [ ] Configure `ALERTHIVE_WEBHOOK_SECRET` in Key Vault
- [ ] Set strong `JWT_SECRET` (≥32 random bytes)
- [ ] Enable HTTPS / TLS termination at ingress
- [ ] Configure CORS whitelist to frontend domain only
- [ ] Enable Azure Monitor and Application Insights

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Commit Message Convention

| Prefix | Use |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `perf:` | Performance improvement |
| `refactor:` | Code restructuring without behavior change |
| `docs:` | Documentation update |
| `test:` | Adding or updating tests |
| `chore:` | Build, tooling, or dependency updates |

---

## Author

**Suman Chakraborty**  
*Platform Engineer — FedEx ITO*  
📧 [admin@alerthive.com](mailto:admin@alerthive.com)

> *"Built with the FedEx Purple & Orange Promise — reliability you can count on."*

---

<p align="center">
  <strong>AlertHive</strong> — Powered by the FedEx Technology Platform<br/>
  <sub>© 2026 FedEx ITO · Internal Use Only</sub>
</p>
