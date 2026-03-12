# AlertHive — Architecture & Design Document

**Author:** Suman Chakraborty  
**Version:** 1.0.0  
**Last Updated:** March 2026  
**Classification:** Internal — FedEx ITO

---

## 1. System Overview

AlertHive is structured as a **monorepo** containing three independently deployable applications:

| Application | Technology | Port | Purpose |
|---|---|---|---|
| `alerthive-api` | Node.js + Express | 4000 | REST API, WebSocket, event streaming |
| `alerthive-web` | React + Vite | 5173 | Browser-based operator dashboard |
| `alerthive` | React Native + Expo | — | Mobile app for on-call engineers |

---

## 2. Backend Architecture (`alerthive-api`)

### 2.1 Layered Design

```
HTTP Request
     │
     ▼
┌─────────────────────────────┐
│       Middleware Pipeline   │
│  Helmet → CORS → Morgan     │
│  → RateLimiter → Auth(JWT)  │
└───────────────┬─────────────┘
                │
                ▼
┌─────────────────────────────┐
│         Router Layer        │
│  /auth /alerts /tickets...  │
└───────────────┬─────────────┘
                │
                ▼
┌─────────────────────────────┐
│       Controller Layer      │
│  Request parsing, Zod       │
│  validation, response shaping│
└───────────────┬─────────────┘
                │
                ▼
┌─────────────────────────────┐
│        Service Layer        │
│  Business logic, queries,   │
│  Kafka publish, cache ops   │
└───────────────┬─────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
  ┌──────────┐    ┌──────────┐
  │  Prisma  │    │  Redis   │
  │  (SQLite/│    │  (cache) │
  │  Postgres)    └──────────┘
  └──────────┘
```

### 2.2 Middleware Stack

| Middleware | Library | Function |
|---|---|---|
| Security headers | `helmet` | Sets `X-Frame-Options`, `CSP`, `HSTS`, etc. |
| CORS | `cors` | Restricts origins to configured whitelist |
| Compression | `compression` | Gzip response compression |
| Request logging | `morgan` | Combined log format in production |
| Rate limiting | Custom (Redis) | 100 req/min per IP on `/api/v1` |
| Authentication | Custom JWT | Validates `Bearer` token on protected routes |
| Error handling | Custom | Zod errors → 400, unhandled → 500 |

### 2.3 Authentication Flow

```
POST /auth/login
      │
      ▼
Compare bcrypt(password, hash) ─── No ──▶ 401 Unauthorized
      │
      Yes
      │
      ▼
Generate JWT { sub: userId, orgId, role }
      │
      ▼
Return { token, user }
      │
      ─── Subsequent requests ───
      │
      ▼
isAuthenticated middleware
  → Verify JWT signature
  → Attach req.user = { id, orgId, role }
  → Pass to controller
```

### 2.4 WebSocket Architecture

AlertHive maintains persistent WebSocket connections per organisation for real-time broadcasts:

```typescript
// Server-side broadcast
broadcast(orgId: string, event: { event: string; data: any })
  // Sends to all connected sockets in the same org
```

**Events broadcast in real-time:**

| Event | Trigger |
|---|---|
| `ticket.created` | New ticket submitted |
| `ticket.updated` | Ticket status/priority changed |
| `alert.created` | Inbound alert received |
| `incident.updated` | Incident status change |

### 2.5 Kafka Event Streaming

Kafka is used for durable, async event publishing. Topics follow the pattern `alerthive.<entity>.<action>`:

| Topic | Published When |
|---|---|
| `alerthive.alert.created` | New alert ingested |
| `alerthive.incident.created` | Incident opened |
| `alerthive.ticket.created` | Ticket raised |

> In local development without Kafka, events are gracefully dropped with a warning log. No data is lost from the API's perspective.

---

## 3. Frontend Architecture (`alerthive-web`)

### 3.1 Component Hierarchy

```
App.tsx
├── AuthProvider (AuthContext)
│   └── TicketProvider (TicketContext)
│       └── Router
│           ├── /signin          → SignIn.tsx
│           ├── /signup          → SignUp.tsx
│           └── ProtectedRoute
│               └── Layout.tsx
│                   ├── Sidebar.tsx
│                   └── <main>
│                       ├── /               → Dashboard.tsx
│                       ├── /alerts         → Alerts.tsx
│                       ├── /alerts/:id     → AlertDetail.tsx
│                       ├── /incidents      → Incidents.tsx
│                       ├── /incidents/:id  → IncidentDetail.tsx
│                       ├── /tickets        → Tickets.tsx
│                       ├── /tickets/:id    → TicketDetail.tsx
│                       ├── /tickets/new    → RaiseTicket.tsx
│                       ├── /oncall         → OnCall.tsx
│                       ├── /problems       → Problems.tsx
│                       ├── /changes        → Changes.tsx
│                       ├── /postmortems    → Postmortems.tsx
│                       ├── /analytics      → Analytics.tsx
│                       ├── /sla            → SLASettings.tsx
│                       ├── /escalation     → EscalationPolicies.tsx
│                       ├── /routing        → AlertRouting.tsx
│                       ├── /heartbeats     → Heartbeats.tsx
│                       ├── /maintenance    → MaintenanceWindows.tsx
│                       ├── /channels       → NotificationChannels.tsx
│                       ├── /playbooks      → Playbooks.tsx
│                       ├── /integrations   → Integrations.tsx
│                       ├── /knowledge      → KnowledgeBase.tsx
│                       ├── /catalog        → ServiceCatalog.tsx
│                       └── /settings       → Settings.tsx
```

### 3.2 State Management

| State | Mechanism | Scope |
|---|---|---|
| Authentication | `AuthContext` (React Context + sessionStorage) | App-wide |
| Tickets | `TicketContext` (React Context + API) | App-wide |
| UI State (filters, modals) | Local `useState` | Per-component |
| Real-time updates | WebSocket client → Context updates | App-wide |

### 3.3 API Communication

All API calls are centralised through `src/lib/api.ts`:

```typescript
// Authenticated GET
const data = await apiGet('/alerts?status=open');

// Authenticated POST
const ticket = await apiPost('/tickets', { title, description, priority });
```

The `api.ts` helper:
- Prepends `VITE_API_BASE_URL` to all paths
- Attaches `Authorization: Bearer <token>` automatically
- Handles 401 responses by redirecting to sign-in

---

## 4. Design System — FedEx Brand

### 4.1 Color Palette

AlertHive uses the **FedEx Purple & Orange Promise** brand identity:

| Token | Hex | Usage |
|---|---|---|
| `primary` (FedEx Purple) | `#4D148C` | Logo, nav active states, brand elements |
| `primaryDark` | `#3A0F6B` | Purple hover states |
| `primaryLight` | `#6B29B8` | Purple tints |
| `accent` (FedEx Orange) | `#FF6200` | CTA buttons, links, severity high, toggles |
| `accentDark` | `#CC4E00` | Orange hover states |
| Background | `#0D0A18` | Page background |
| Surface | `#160D2A` | Card/panel backgrounds |
| Surface Light | `#1E1440` | Input backgrounds |
| Border | `#261852` | Dividers and outlines |

### 4.2 Severity Color Coding

| Severity | Color | Token |
|---|---|---|
| Critical | `#FF4757` | `critical` |
| High | `#FF6200` | `high` (FedEx Orange) |
| Medium | `#FFA502` | `medium` |
| Low | `#2ED573` | `low` |
| Info | `#1E90FF` | `info` |

### 4.3 Typography

- **Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`
- **Headings:** `font-bold` (700) for section titles, `font-semibold` (600) for card titles
- **Body:** Regular (400) for content, `text-sm` (14px) for dense data views

---

## 5. Database Schema

AlertHive uses **Prisma ORM** with SQLite in development and PostgreSQL in production.

### Core Entities

```
User
 ├── id (cuid)
 ├── name
 ├── email (unique)
 ├── passwordHash
 ├── role: admin | developer | end_user
 └── orgId → Organisation

Organisation
 ├── id
 ├── slug (unique)
 └── name

Alert
 ├── id
 ├── title
 ├── description
 ├── status: open | acknowledged | closed
 ├── priority: critical | high | medium | low
 ├── source (Dynatrace, manual, etc.)
 ├── tags[]
 └── orgId → Organisation

Ticket
 ├── id
 ├── title
 ├── description
 ├── status: open | in_progress | resolved | closed
 ├── priority: critical | high | medium | low
 ├── createdById → User
 ├── assignedToId → User
 └── orgId → Organisation

TicketComment
 ├── id
 ├── content
 ├── authorId → User
 └── ticketId → Ticket

Incident
 ├── id
 ├── title
 ├── severity
 ├── status: detected | investigating | identified | monitoring | resolved
 └── orgId → Organisation

SLAPolicy
 ├── id
 ├── name
 ├── priority
 ├── responseTimeMinutes
 ├── resolutionTimeMinutes
 └── orgId → Organisation
```

---

## 6. Security Considerations

| Area | Approach |
|---|---|
| **Authentication** | Stateless JWT with configurable expiry |
| **Password storage** | bcrypt with salt rounds ≥ 10 |
| **HTTP headers** | `helmet` sets `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` |
| **Rate limiting** | 100 req/min/IP via Redis sliding window |
| **Input validation** | Zod schema validation on all request bodies |
| **CORS** | Strict origin whitelist; no wildcard in production |
| **SQL injection** | Impossible with Prisma ORM parameterised queries |
| **Webhook authentication** | Pre-shared secret in `X-AlertHive-Secret` header |
| **Secrets management** | All secrets via environment variables; never committed to source |

---

## 7. Scalability Architecture

### Horizontal Scaling

The API is stateless (JWT auth, no server-side sessions) and scales horizontally behind a load balancer. WebSocket affinity is handled via Redis pub/sub for multi-instance deployments.

### Caching Strategy

| Data | Cache | TTL |
|---|---|---|
| Alert lists | Redis | 30 seconds |
| User profiles | Redis | 5 minutes |
| Analytics aggregates | Redis | 2 minutes |

### Event-Driven Decoupling

Long-running tasks (email delivery, notification dispatch) are published to Kafka and processed asynchronously by consumers, ensuring API response times stay under 15ms.

---

*Document version 1.0 · Suman Chakraborty · FedEx ITO · March 2026*
