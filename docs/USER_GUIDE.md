# AlertHive — User Guide

**Author:** Suman Chakraborty  
**Version:** 1.0.0  
**Last Updated:** March 2026  
**Classification:** Internal — FedEx ITO

---

## Getting Started

### Signing In

Navigate to the AlertHive web application and sign in with your credentials. The login screen displays available demo accounts for evaluation.

| Role | What you can do |
|---|---|
| **Admin** | Full access to all platform features, user management, configuration |
| **Developer** | Operational access — alerts, incidents, ITSM, analytics |
| **End User** | Raise and track your own tickets only |

---

## Dashboard

The Dashboard provides an at-a-glance operational view for administrators and developers.

### Key Metrics (Top Row)

| Card | Description |
|---|---|
| **Open Alerts** | Total alerts currently open across the organisation |
| **Critical** | Active alerts rated as critical severity |
| **Active Incidents** | Incidents not yet resolved |
| **Acknowledged** | Alerts that have been acknowledged by a responder |

### ITSM KPIs

| Card | Description |
|---|---|
| **Open Problems** | Problems under investigation |
| **Known Errors** | Problems with documented workarounds |
| **Pending Changes** | Change requests awaiting approval |
| **Emergency Changes** | Emergency changes currently in progress |

### Quick Actions

Shortcut buttons for the most common on-call tasks:
- **New Alert** — Create a manual alert
- **New Incident** — Open a new incident immediately
- **Send Alert** — Navigate to the Alerts page
- **On-Call** — View current on-call rotation

---

## Alerts

### Viewing Alerts

Navigate to **Alerts** in the sidebar. Each alert card displays:
- **Title** and source system
- **Priority badge**: Critical, High, Medium, Low
- **Status**: Open, Acknowledged, Closed
- **Timestamp** of last update

### Alert Actions

Click any alert to open its detail view. Available actions:

| Action | Description |
|---|---|
| **Acknowledge** | Confirm you are aware of and responding to this alert |
| **Snooze** | Temporarily suppress the alert for a set duration |
| **Escalate** | Bump the priority and notify the next escalation tier |
| **Close** | Mark the alert as resolved and no longer active |

### Filtering Alerts

Use the filter controls at the top of the Alerts page:
- Filter by **Status** (Open, Acknowledged, Closed)
- Filter by **Priority** (Critical, High, Medium, Low)

---

## Incidents

Incidents represent confirmed service disruptions involving one or more alerts.

### Creating an Incident

1. Navigate to **Incidents → New Incident**
2. Fill in:
   - **Title** — Concise description of the outage
   - **Severity** — P1 (Critical) through P4 (Low)
   - **Affected Services** — Services impacted
   - **Initial Summary** — Brief technical description
3. Assign the incident commander and notify the response team

### Incident Lifecycle

```
Detected → Investigating → Identified → Monitoring → Resolved
```

| Status | Meaning |
|---|---|
| **Detected** | Alert triggered; investigation not yet started |
| **Investigating** | Team is actively working on root cause |
| **Identified** | Root cause known; fix in progress |
| **Monitoring** | Fix deployed; monitoring for stability |
| **Resolved** | Fully resolved; no further action needed |

### Incident Timeline

Each incident records a full activity timeline including:
- Status transitions with timestamps
- Responder assignments
- Comments and updates
- Linked alerts and tickets

---

## Tickets

### Raising a Ticket (All Roles)

End Users access this through **Raise Ticket** in the sidebar. Other roles access it from **Tickets → New**.

1. Enter a **Title** describing the issue
2. Provide a detailed **Description**
3. Select **Priority**:
   - **Critical** — Production down, data loss risk
   - **High** — Major functionality broken
   - **Medium** — Degraded functionality
   - **Low** — Minor issue, cosmetic
4. Add **Tags** for categorisation
5. Submit

### Tracking a Ticket

From the **Tickets** page, you can:
- Search by title or tag
- Filter by status and priority
- Click any ticket to view its full detail, history, and comments

### Adding Comments

Open a ticket and scroll to the **Comments** section. Type your update and click **Send**.

---

## On-Call

The On-Call page displays the current rotation schedule and team contacts.

- **Active on-call members** are highlighted with an orange indicator
- **Contact information** (phone, email) for immediate reachout
- **Schedule view** showing upcoming rotation handoffs

---

## ITSM — Problems, Changes & Postmortems

> Available to **Admin** and **Developer** roles only.

### Problem Management

Problems represent recurring or complex issues with an identified root cause.

- Create a Problem from a recurring alert pattern
- Attach related incidents and alerts
- Document the **workaround** (if known before the fix)
- Mark as a **Known Error** once root cause is confirmed
- Close the Problem after the permanent fix is deployed

### Change Management (RFC)

All significant infrastructure and application changes go through the Change Request (RFC) workflow:

1. **Create RFC** — Detail the change scope, risk, rollback plan
2. **CAB Review** — Change Advisory Board reviews and approves
3. **Schedule** — Set implementation window (respect Maintenance Windows)
4. **Implement** — Execute the change
5. **Close** — Document outcome (success / partial / rollback)

**Change Types:**

| Type | Use When |
|---|---|
| **Standard** | Pre-approved, low-risk routine changes |
| **Normal** | Requires CAB review before implementation |
| **Emergency** | Urgent fix for production impact; retrospective CAB review |

### Postmortems

After every P1/P2 incident, conduct a blameless postmortem:

1. Navigate to **Postmortems → New**
2. Complete the template:
   - **Incident Timeline** — What happened, in sequence
   - **Root Cause** — The underlying technical cause
   - **Contributing Factors** — Environmental or process factors
   - **Impact** — Duration, users affected, revenue impact
   - **Action Items** — Preventive measures with owners and due dates
3. Share the postmortem link with stakeholders

---

## Analytics & Reporting

### Dashboard Metrics

The **Analytics** page shows:

- **Alert volume** by priority over your selected time range (7d / 30d / 90d)
- **SLA Compliance Rate** — Percentage of tickets resolved within SLA
- **Resolution Time Distribution** — Average time to resolve by priority
- **Top Resolvers** — Leaderboard of team members by tickets closed

### Exporting Data

Click **Export CSV** to download the filtered dataset to a spreadsheet.

### Email Reports

1. Click the **Email Report** button
2. Enter the recipient email address
3. Click **Send Report**

The report will be queued and delivered with the filtered analytics data as a CSV attachment.

---

## SLA Policies

Administrators configure SLA policies under **SLA Policies**:

| Field | Description |
|---|---|
| **Policy Name** | Descriptive label (e.g., "P1 — Production Critical") |
| **Priority** | Ticket priority this policy applies to |
| **Response Time** | Max time from ticket creation to first response |
| **Resolution Time** | Max time from creation to resolution |
| **Enabled** | Toggle to activate/deactivate |

---

## Escalation Policies

Escalation policies define what happens when an alert is not acknowledged within a time threshold:

1. **Level 1** — Notify the primary on-call engineer
2. **Level 2** (if no response after X minutes) — Notify the secondary engineer or team lead
3. **Level 3** (if still no response) — Notify the manager

Configure under **Escalation Policies → New Policy**.

---

## Integrations — Dynatrace Setup

1. Open **Integrations** and locate the **Dynatrace** panel
2. Expand the **Webhook Setup Guide**
3. Copy the generated webhook URL:
   ```
   http://<your-server>:4000/api/v1/webhooks/dynatrace/fedex-ito
   ```
4. In Dynatrace: **Settings → Integrations → Problem Notifications → Custom Integration**
5. Paste the webhook URL
6. Add header: `X-AlertHive-Secret: <your-secret>`
7. Set trigger: `Problem opened`
8. Save and test

New Dynatrace problems will now automatically create alerts in AlertHive with the appropriate severity mapping.

---

## Settings

Access your profile and preferences via **Settings** in the sidebar:

- **Profile** — View your name, email, role, and team assignment
- **Notification Preferences** — Choose how you receive alerts (email, Slack, push)
- **Appearance** — Theme preferences
- **Security** — Change password, view active sessions

---

*Document version 1.0 · Suman Chakraborty · FedEx ITO · March 2026*
