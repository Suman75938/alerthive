# AlertHive — API Reference

**Author:** Suman Chakraborty  
**Version:** 1.0.0  
**Base URL:** `http://localhost:4000/api/v1`  
**Last Updated:** March 2026  
**Classification:** Internal — FedEx ITO

---

## Authentication

All endpoints (except `/auth/login`, `/auth/register`, `/health`, and `/webhooks/*`) require a valid JWT passed as a Bearer token.

**Request Header:**

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /auth/login` and expire after the configured duration (default: `7d` in development, `8h` in production).

---

## Common Response Shapes

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 142,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required",
    "details": [ ... ]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Validation error |
| `401` | Unauthenticated |
| `403` | Forbidden (insufficient role) |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Health

### `GET /health`

Returns server health and dependency status. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "ts": "2026-03-10T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "dependencies": {
    "redis": "connected",
    "kafka": "connected",
    "database": "connected"
  }
}
```

---

## Authentication Endpoints

### `POST /auth/login`

Authenticate a user and receive a JWT token.

**Request Body:**

```json
{
  "email": "admin@alerthive.com",
  "password": "REDACTED_SEED_PASSWORD"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u-001",
      "name": "Suman Chakraborty",
      "email": "admin@alerthive.com",
      "role": "admin",
      "orgId": "org-001"
    }
  }
}
```

---

### `POST /auth/register`

Register a new user account.

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane.doe@company.com",
  "password": "securepassword123",
  "role": "developer"
}
```

**Response `201`:** Same shape as login response.

---

### `GET /auth/me`

Returns the authenticated user's profile.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "u-001",
    "name": "Suman Chakraborty",
    "email": "admin@alerthive.com",
    "role": "admin",
    "orgId": "org-001"
  }
}
```

---

## Alerts

### `GET /alerts`

List alerts for the authenticated user's organisation.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | `open \| acknowledged \| closed` | No | Filter by status |
| `priority` | `critical \| high \| medium \| low` | No | Filter by priority |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Results per page (default: 20, max: 100) |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "alert-001",
      "title": "Response time degraded — payment-service",
      "description": "P95 latency exceeded 2000ms threshold",
      "status": "open",
      "priority": "high",
      "source": "Dynatrace",
      "tags": ["payment", "prod", "latency"],
      "createdAt": "2026-03-10T08:30:00.000Z",
      "updatedAt": "2026-03-10T08:30:00.000Z"
    }
  ],
  "meta": { "total": 43, "page": 1, "pageSize": 20, "totalPages": 3 }
}
```

---

### `POST /alerts`

Create a new alert.

**Request Body:**

```json
{
  "title": "Database connection pool exhausted",
  "description": "All 100 connections are in use. New requests are queuing.",
  "priority": "critical",
  "source": "manual",
  "tags": ["database", "prod"]
}
```

**Response `201`:** Full alert object.

---

### `GET /alerts/:id`

Get a single alert by ID.

---

### `PATCH /alerts/:id`

Update an alert's status or priority.

**Request Body (all fields optional):**

```json
{
  "status": "acknowledged",
  "priority": "high"
}
```

---

## Tickets

### `GET /tickets`

List tickets.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |
| `assignedToId` | string | Filter by assigned user ID |
| `page` | number | Pagination |
| `pageSize` | number | Items per page |

---

### `POST /tickets`

Create a ticket.

**Request Body:**

```json
{
  "title": "Login page returning 504",
  "description": "Users unable to sign in since 09:45 UTC. Error: Gateway Timeout.",
  "priority": "critical",
  "assignedToId": "u-002",
  "tags": ["auth", "prod", "p1"]
}
```

**Response `201`:** Full ticket object. Also broadcasts `ticket.created` WebSocket event.

---

### `GET /tickets/:id`

Get ticket details including all comments.

---

### `PATCH /tickets/:id`

Update ticket fields.

**Request Body (all optional):**

```json
{
  "status": "in_progress",
  "priority": "high",
  "assignedToId": "u-003"
}
```

Broadcasts `ticket.updated` WebSocket event.

---

### `POST /tickets/:id/comments`

Add a comment to a ticket.

**Request Body:**

```json
{
  "content": "Identified the issue — certificate expired on the auth service load balancer."
}
```

**Response `201`:** Comment object with author details.

---

## Incidents

### `GET /incidents`

List incidents for the organisation.

---

### `POST /incidents`

Create a new incident.

**Request Body:**

```json
{
  "title": "Payment Service Outage — Production",
  "severity": "critical",
  "description": "payment-service pods are crash-looping. Transactions failing.",
  "affectedServices": ["payment-service", "checkout-api"]
}
```

---

### `PATCH /incidents/:id`

Update incident status or details.

---

## Analytics

### `GET /analytics/summary`

Get aggregated alert and ticket statistics.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `range` | `7d \| 30d \| 90d` | Time range (default: `30d`) |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "ticketCount": 142,
    "resolvedCount": 118,
    "slaCompliance": 89.4,
    "avgResolutionHours": 4.2,
    "volumeByPriority": {
      "critical": 12,
      "high": 38,
      "medium": 61,
      "low": 31
    }
  }
}
```

---

### `GET /analytics/top-resolvers`

Returns the top 10 users ranked by tickets resolved in the selected period.

---

### `POST /analytics/email-report`

Queue an analytics report for email delivery.

**Request Body:**

```json
{
  "email": "admin@alerthive.com",
  "range": "30d",
  "ticketCount": 142,
  "csvData": "id,title,priority,status,createdAt\n..."
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "message": "Report queued for delivery to admin@alerthive.com"
  }
}
```

---

## Users

### `GET /users`

List users in the organisation. Admin only.

---

### `GET /users/:id`

Get a user profile.

---

### `PATCH /users/:id`

Update user details. Admin only.

---

## SLA Policies

### `GET /sla/policies`

List SLA policies.

---

### `POST /sla/policies`

Create an SLA policy.

**Request Body:**

```json
{
  "name": "P1 — Production Critical",
  "priority": "critical",
  "responseTimeMinutes": 15,
  "resolutionTimeMinutes": 60,
  "enabled": true
}
```

---

### `PATCH /sla/policies/:id`

Update an SLA policy (enable/disable, adjust thresholds).

---

## Webhooks (Inbound)

Webhook endpoints accept external system payloads. They **do not** use JWT authentication. Instead, authentication is via a pre-shared secret in the request header.

### Security Header

```
X-AlertHive-Secret: <ALERTHIVE_WEBHOOK_SECRET>
```

If `ALERTHIVE_WEBHOOK_SECRET` is not set in the environment, the check is skipped (development mode only).

---

### `POST /webhooks/dynatrace/:orgSlug`

Receive a Dynatrace problem notification and create a corresponding AlertHive alert.

**Path Parameters:**

| Param | Description |
|---|---|
| `orgSlug` | Your organisation slug (e.g., `fedex-ito`) |

**Request Body (Dynatrace format):**

```json
{
  "State": "OPEN",
  "ProblemTitle": "Response time degraded on payment-service",
  "ProblemSeverity": "PERFORMANCE",
  "Tags": ["payment", "prod"],
  "ImpactedEntities": ["payment-service-pod-1"],
  "ImpactedEntityNames": ["PROCESS_GROUP_INSTANCE-abc123"]
}
```

**Severity Mapping:**

| Dynatrace `ProblemSeverity` | AlertHive Priority |
|---|---|
| `AVAILABILITY` | `critical` |
| `ERROR` | `high` |
| `PERFORMANCE` | `high` |
| `RESOURCE_CONTENTION` | `medium` |
| `CUSTOM_ALERT` | `medium` |
| `MONITORING_UNAVAILABLE` | `low` |

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "alertId": "alert-xyz",
    "message": "Alert created from Dynatrace problem"
  }
}
```

> Only problems with `"State": "OPEN"` create alerts. `"State": "RESOLVED"` payloads are acknowledged but ignored.

---

## WebSocket Events

Connect to the WebSocket server at `ws://localhost:4000`.

After connecting, authenticate by sending:

```json
{
  "type": "auth",
  "token": "<JWT>"
}
```

**Inbound Events (server → client):**

| Event | Payload | Trigger |
|---|---|---|
| `ticket.created` | Full ticket object | New ticket submitted |
| `ticket.updated` | Updated ticket object | Ticket status/priority changed |
| `alert.created` | Full alert object | Alert ingested (manual or webhook) |
| `incident.updated` | Updated incident object | Incident status change |

---

## Rate Limiting

All endpoints under `/api/v1` are subject to rate limiting:

- **Limit:** 100 requests per minute per IP address
- **Headers returned:**
  - `X-RateLimit-Limit` — Maximum requests in window
  - `X-RateLimit-Remaining` — Requests remaining in current window
  - `X-RateLimit-Reset` — UTC timestamp when the window resets
- **Response on exceeded:** `HTTP 429 Too Many Requests`

---

*Document version 1.0 · Suman Chakraborty · FedEx ITO · March 2026*
