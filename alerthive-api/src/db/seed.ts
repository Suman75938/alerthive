/**
 * Database seeder – populates a fresh database with demo data
 * Run: npm run db:seed
 */

import { PrismaClient, UserRole, AlertPriority, AlertStatus, IncidentStatus, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const now = new Date();
const future = (minutes: number) => new Date(now.getTime() + minutes * 60000);
const past   = (minutes: number) => new Date(now.getTime() - minutes * 60000);

async function main() {
  console.log('🌱  Seeding AlertHive database...');

  // ── Organisation ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'fedex-ito' },
    update: {},
    create: { name: 'FedEx ITO', slug: 'fedex-ito' },
  });
  console.log(`✅  Org: ${org.name}`);

  // ── Users ─────────────────────────────────────────────────────
  const seeds = [
    { name: 'Suman Chakraborty', email: 'suman75938@gmail.com', password: 'Ah@2026#Sx!kR9', role: UserRole.admin },
    { name: 'Mike Johnson',  email: 'mike@alerthive.com',  password: 'dev123',  role: UserRole.developer },
    { name: 'Alex Rivera',   email: 'alex@alerthive.com',  password: 'dev123',  role: UserRole.developer },
    { name: 'Emily Watson',  email: 'emily@alerthive.com', password: 'dev123',  role: UserRole.developer },
    { name: 'Jordan Lee',    email: 'jordan@example.com',  password: 'user123', role: UserRole.end_user },
    { name: 'Casey Morgan',  email: 'casey@example.com',   password: 'user123', role: UserRole.end_user },
  ];
  const users = await Promise.all(seeds.map(async (s) => {
    const hash = await bcrypt.hash(s.password, 10);
    return prisma.user.upsert({
      where: { email_orgId: { email: s.email, orgId: org.id } },
      update: {},
      create: { orgId: org.id, name: s.name, email: s.email, passwordHash: hash, role: s.role },
    });
  }));
  console.log(`✅  Users: ${users.map((u) => u.name).join(', ')}`);
  const [sarah, mike, alex, emily, jordan, casey] = users;

  // ── SLA Policies ──────────────────────────────────────────────
  await Promise.all([
    { severity: AlertPriority.critical, responseTimeMinutes: 15,   resolutionTimeMinutes: 60,    escalateAfterMinutes: 30,   description: 'P1 – Service down, immediate business impact' },
    { severity: AlertPriority.high,     responseTimeMinutes: 60,   resolutionTimeMinutes: 240,   escalateAfterMinutes: 120,  description: 'P2 – Significant degradation, workaround exists' },
    { severity: AlertPriority.medium,   responseTimeMinutes: 240,  resolutionTimeMinutes: 1440,  escalateAfterMinutes: 480,  description: 'P3 – Partial impact, standard priority' },
    { severity: AlertPriority.low,      responseTimeMinutes: 480,  resolutionTimeMinutes: 4320,  escalateAfterMinutes: 1440, description: 'P4 – Minor issue, low business impact' },
    { severity: AlertPriority.info,     responseTimeMinutes: 1440, resolutionTimeMinutes: 10080, escalateAfterMinutes: 2880, description: 'P5 – Informational, no immediate action needed' },
  ].map((p) => prisma.slaPolicy.upsert({
    where: { orgId_severity: { orgId: org.id, severity: p.severity } },
    update: {}, create: { orgId: org.id, ...p },
  })));
  console.log('✅  SLA policies');

  // ── Teams & On-Call Schedules ──────────────────────────────────
  const sre = await prisma.team.upsert({
    where: { id: 'team-sre-1' }, update: {},
    create: { id: 'team-sre-1', orgId: org.id, name: 'SRE Team', description: 'Site Reliability Engineering' },
  });
  const platform = await prisma.team.upsert({
    where: { id: 'team-platform-1' }, update: {},
    create: { id: 'team-platform-1', orgId: org.id, name: 'Platform Team', description: 'Core Platform & Infrastructure' },
  });
  const security = await prisma.team.upsert({
    where: { id: 'team-security-1' }, update: {},
    create: { id: 'team-security-1', orgId: org.id, name: 'Security Team', description: 'Cyber-Security & Compliance' },
  });
  await prisma.teamMember.createMany({
    skipDuplicates: true,
    data: [
      { teamId: sre.id,      userId: sarah.id, isOnCall: true },
      { teamId: sre.id,      userId: mike.id },
      { teamId: platform.id, userId: alex.id,  isOnCall: true },
      { teamId: platform.id, userId: emily.id },
      { teamId: security.id, userId: sarah.id },
      { teamId: security.id, userId: mike.id },
    ],
  });
  await prisma.onCallSchedule.createMany({
    skipDuplicates: false,
    data: [
      { teamId: sre.id,      name: 'SRE Primary On-Call',      rotationType: 'weekly',  currentOnCallId: sarah.id, nextOnCallId: mike.id,  rotationStart: past(10080),  rotationEnd: future(10080) },
      { teamId: platform.id, name: 'Platform Rotation',        rotationType: 'weekly',  currentOnCallId: alex.id,  nextOnCallId: emily.id, rotationStart: past(5040),   rotationEnd: future(5040) },
      { teamId: security.id, name: 'Security On-Call Cover',   rotationType: 'monthly', currentOnCallId: mike.id,  nextOnCallId: sarah.id, rotationStart: past(20160),  rotationEnd: future(20160) },
    ],
  });
  console.log('✅  Teams + OnCall schedules');

  // ── Alerts ────────────────────────────────────────────────────
  const alert1 = await prisma.alert.create({
    data: { orgId: org.id, title: 'Payment gateway returning 500 errors', message: 'Production payment service returning HTTP 500. All checkout flows affected.', source: 'Dynatrace', priority: AlertPriority.critical, status: AlertStatus.open, tags: ['payments', 'prod'] },
  });
  const alert2 = await prisma.alert.create({
    data: { orgId: org.id, title: 'CPU spike on app-server-03', message: 'CPU > 95% for 10+ minutes.', source: 'Prometheus', priority: AlertPriority.high, status: AlertStatus.acknowledged, assigneeId: mike.id, acknowledgedById: mike.id, acknowledgedAt: past(30), tags: ['infra', 'cpu'] },
  });
  await prisma.alert.createMany({ data: [
    { orgId: org.id, title: 'SSL certificate expiring in 7 days',      message: 'api.fedex-ito.internal SSL cert expires soon.',          source: 'CertMonitor',    priority: AlertPriority.medium,   status: AlertStatus.open,         tags: ['ssl', 'security'] },
    { orgId: org.id, title: 'Disk usage at 85% on db-primary',         message: 'Primary DB disk at 85%.',                               source: 'Grafana',        priority: AlertPriority.medium,   status: AlertStatus.acknowledged,  tags: ['database', 'storage'] },
    { orgId: org.id, title: 'Deployment pipeline failed on main',      message: 'main → prod deployment failed at build stage.',         source: 'GitHub Actions', priority: AlertPriority.high,     status: AlertStatus.open,         tags: ['ci-cd', 'deploy'] },
    { orgId: org.id, title: 'Kubernetes pod CrashLoopBackOff',         message: 'shipment-api pod crashing every 30 s.',                 source: 'Kubernetes',     priority: AlertPriority.critical, status: AlertStatus.open,         tags: ['k8s', 'prod'] },
    { orgId: org.id, title: 'Database replication lag > 120 s',        message: 'Replica db-replica-02 is 120 s behind primary.',        source: 'Prometheus',     priority: AlertPriority.high,     status: AlertStatus.open,         tags: ['database', 'replication'] },
    { orgId: org.id, title: 'Redis memory usage at 90%',               message: 'Cache evictions starting; potential data loss risk.',   source: 'Grafana',        priority: AlertPriority.medium,   status: AlertStatus.acknowledged,  tags: ['redis', 'cache'] },
    { orgId: org.id, title: 'Suspicious login attempt detected',       message: '47 failed logins from IP 185.220.101.5 in 5 minutes.', source: 'Cloudflare',     priority: AlertPriority.high,     status: AlertStatus.open,         tags: ['security', 'auth'] },
    { orgId: org.id, title: 'API latency P99 > 2 s',                  message: 'tracking-api P99 latency exceeded 2 s SLO.',           source: 'Datadog',        priority: AlertPriority.medium,   status: AlertStatus.open,         tags: ['performance', 'api'] },
    { orgId: org.id, title: 'Nightly ETL job failed',                  message: 'analytics-etl-job did not complete within window.',    source: 'Airflow',         priority: AlertPriority.low,     status: AlertStatus.open,         tags: ['etl', 'analytics'] },
    { orgId: org.id, title: 'Load balancer health check degraded',     message: '2 of 6 upstream nodes marked unhealthy.',              source: 'CloudWatch',     priority: AlertPriority.high,     status: AlertStatus.open,         tags: ['infra', 'lb'] },
  ]});
  console.log('✅  Alerts');

  // ── Incidents ─────────────────────────────────────────────────
  const inc1 = await prisma.incident.create({
    data: { orgId: org.id, title: 'Payment Service Outage', description: 'Complete payment processing outage affecting all FedEx checkout flows. Customers unable to complete purchases.', status: IncidentStatus.investigating, priority: AlertPriority.critical, assigneeId: sarah.id, responders: [sarah.id, mike.id] },
  });
  const inc2 = await prisma.incident.create({
    data: { orgId: org.id, title: 'Database Replication Failure', description: 'Primary-replica replication broken on db cluster. Read queries served stale data.', status: IncidentStatus.identified, priority: AlertPriority.high, assigneeId: mike.id, responders: [mike.id, alex.id] },
  });
  await prisma.incident.create({
    data: { orgId: org.id, title: 'Kubernetes Cluster Degraded', description: 'Multiple pods in CrashLoopBackOff on prod-us-east-1. Shipment service unavailable.', status: IncidentStatus.monitoring, priority: AlertPriority.critical, assigneeId: alex.id, responders: [alex.id, emily.id] },
  });
  await prisma.incident.create({
    data: { orgId: org.id, title: 'Email Notification Service Down', description: 'Alert and ticket email delivery failing since 22:00 UTC.', status: IncidentStatus.resolved, priority: AlertPriority.medium, assigneeId: emily.id, responders: [emily.id], resolvedAt: past(180) },
  });
  await prisma.incident.create({
    data: { orgId: org.id, title: 'Suspicious Account Takeover Attempt', description: 'Coordinated credential-stuffing attack targeting customer accounts.', status: IncidentStatus.triggered, priority: AlertPriority.high, assigneeId: sarah.id, responders: [sarah.id, mike.id] },
  });
  await prisma.incidentAlert.createMany({
    skipDuplicates: true,
    data: [
      { incidentId: inc1.id, alertId: alert1.id },
      { incidentId: inc2.id, alertId: alert2.id },
    ],
  });
  await prisma.timelineEvent.createMany({ data: [
    { incidentId: inc1.id, type: 'created',      message: 'Incident declared by on-call engineer',                      userId: sarah.id },
    { incidentId: inc1.id, type: 'acknowledged',  message: 'Mike Johnson acknowledged, beginning investigation',        userId: mike.id },
    { incidentId: inc1.id, type: 'note',          message: 'DB connection pool exhausted – mitigation in progress',     userId: mike.id },
    { incidentId: inc2.id, type: 'created',       message: 'Incident opened via automated alert correlation',           userId: mike.id },
    { incidentId: inc2.id, type: 'note',          message: 'Root cause: disk full on replica, WAL segments backed up',  userId: alex.id },
  ]});
  console.log('✅  Incidents');

  // ── Tickets ───────────────────────────────────────────────────
  await prisma.ticket.createMany({ data: [
    { orgId: org.id, title: 'Payment gateway returning 500 errors',     description: 'Users unable to complete checkout.',                         priority: AlertPriority.critical, status: TicketStatus.in_progress, raisedById: jordan.id, assignedToId: mike.id,  slaDueAt: future(15),   slaBreached: false, tags: ['payments'],      issueCategory: 'system_issue' },
    { orgId: org.id, title: 'Login page slow on mobile devices',        description: 'Mobile users report 8–12 s login times.',                    priority: AlertPriority.high,     status: TicketStatus.open,        raisedById: casey.id,               slaDueAt: future(180),  slaBreached: false, tags: ['auth'],          issueCategory: 'application_issue' },
    { orgId: org.id, title: 'CSV export missing column headers',        description: 'Exported reports do not include headers.',                   priority: AlertPriority.medium,   status: TicketStatus.resolved,    raisedById: jordan.id, assignedToId: alex.id,  slaDueAt: past(200),    resolvedAt: past(60), slaBreached: false, tags: ['reports'] },
    { orgId: org.id, title: 'Email notifications not sending',          description: 'No alert emails since yesterday 22:00 UTC.',                  priority: AlertPriority.critical, status: TicketStatus.open,        raisedById: casey.id,               slaDueAt: past(540),    slaBreached: true,  tags: ['notifications'], issueCategory: 'system_issue' },
    { orgId: org.id, title: 'Add dark mode toggle to settings',         description: 'Feature: light/dark theme switch.',                           priority: AlertPriority.low,      status: TicketStatus.open,        raisedById: jordan.id,              slaDueAt: future(1000), slaBreached: false, tags: ['feature', 'ui'] },
    { orgId: org.id, title: 'Dashboard charts not loading in IE11',     description: 'SVG charts blank in Internet Explorer 11.',                  priority: AlertPriority.medium,   status: TicketStatus.on_hold,     raisedById: casey.id,  assignedToId: emily.id, slaDueAt: future(480),  slaBreached: false, tags: ['ui', 'browser'] },
    { orgId: org.id, title: 'API rate limit too aggressive on free tier',description: 'Free-tier users hit 429 during normal usage.',               priority: AlertPriority.high,     status: TicketStatus.in_progress, raisedById: jordan.id, assignedToId: mike.id,  slaDueAt: future(240),  slaBreached: false, tags: ['api', 'rate-limit'] },
    { orgId: org.id, title: 'Password reset email goes to spam',        description: 'Reset emails flagged by Gmail, Outlook.',                    priority: AlertPriority.medium,   status: TicketStatus.open,        raisedById: casey.id,               slaDueAt: future(360),  slaBreached: false, tags: ['email', 'auth'] },
    { orgId: org.id, title: 'Shipment tracking not updating',           description: 'Status stuck at "In Transit" for 4+ hours.',                 priority: AlertPriority.high,     status: TicketStatus.in_progress, raisedById: jordan.id, assignedToId: alex.id,  slaDueAt: future(60),   slaBreached: false, tags: ['tracking'] },
    { orgId: org.id, title: 'Performance regression in v3.4.1',        description: 'Pagination 3× slower after last release.',                   priority: AlertPriority.high,     status: TicketStatus.open,        raisedById: casey.id,               slaDueAt: future(120),  slaBreached: false, tags: ['performance', 'regression'] },
    { orgId: org.id, title: 'Search autocomplete broken for non-ASCII', description: 'Accented characters return zero results.',                    priority: AlertPriority.medium,   status: TicketStatus.closed,      raisedById: jordan.id, assignedToId: emily.id, slaDueAt: past(600),    resolvedAt: past(300), slaBreached: false, tags: ['search', 'i18n'] },
    { orgId: org.id, title: 'SAML SSO failing for finance users',       description: 'SAML assertion validation error post cert rotation.',         priority: AlertPriority.critical, status: TicketStatus.in_progress, raisedById: casey.id,  assignedToId: sarah.id, slaDueAt: past(90),     slaBreached: true,  tags: ['auth', 'sso'],   issueCategory: 'system_issue' },
  ]});
  console.log('✅  Tickets');

  // ── Problems ──────────────────────────────────────────────────
  await prisma.problem.createMany({ data: [
    { orgId: org.id, title: 'Payment Service DB Connection Pool Exhaustion', description: 'Recurring connection pool exhaustion on the payments microservice causes P1 outages every 2–3 weeks under high load.', status: 'investigating', priority: AlertPriority.critical, linkedIncidentIds: [inc1.id], rootCause: 'Max pool size (50) insufficient for Black-Friday traffic spikes.', knownError: true, knownErrorDescription: 'Increase pool size and add circuit breaker.', fiveWhys: JSON.stringify(['Payments fail','Pool exhausted','Max pool too low','Not capacity-planned','No load testing']), assigneeId: mike.id, tags: ['payments', 'database'] },
    { orgId: org.id, title: 'Kubernetes Node OOM Causing Pod Evictions',     description: 'Periodic OOM kills on worker nodes evict critical pods, causing service disruption.', status: 'known_error', priority: AlertPriority.high, linkedIncidentIds: [], rootCause: 'Memory limits set too low; JVM GC not tuned for container env.', knownError: true, knownErrorDescription: 'Increase memory limits and tune JVM flags.', fiveWhys: JSON.stringify(['Pod evicted','Node OOM','Limits too low','No tuning','No baseline']), assigneeId: alex.id, tags: ['k8s', 'infra'] },
    { orgId: org.id, title: 'SSL Certificate Renewal Process Not Automated',  description: 'Manual certificate renewal leads to near-expiry alerts and occasional outages.', status: 'detected', priority: AlertPriority.medium, linkedIncidentIds: [], knownError: false, fiveWhys: JSON.stringify(['Cert expires','Manual process','No automation','Legacy decision','No review']), tags: ['ssl', 'automation'] },
    { orgId: org.id, title: 'Redis Cache Eviction Under High Traffic',         description: 'Cache hit rate drops below 40% when concurrent users exceed 10,000, causing DB overload.', status: 'investigating', priority: AlertPriority.high, linkedIncidentIds: [], rootCause: 'maxmemory-policy allkeys-lru evicts hot keys under traffic spike.', knownError: true, knownErrorDescription: 'Partition caches by access pattern; raise memory.', fiveWhys: JSON.stringify(['DB overload','Cache miss','Hot keys evicted','Wrong policy','Not set']), assigneeId: emily.id, tags: ['redis', 'performance'] },
    { orgId: org.id, title: 'ETL Pipeline Memory Leak in Nightly Batch',      description: 'Memory leak in analytics ETL causes process to balloon to 14 GB, killing the container.', status: 'detected', priority: AlertPriority.medium, linkedIncidentIds: [], knownError: false, fiveWhys: JSON.stringify(['OOM killed','Leak','DataFrame not freed','Missing dispose','No review']), tags: ['etl', 'analytics', 'memory'] },
  ]});
  console.log('✅  Problems');

  // ── Changes ───────────────────────────────────────────────────
  await prisma.change.createMany({ data: [
    { orgId: org.id, title: 'Upgrade PostgreSQL 14 → 16 on prod cluster',    description: 'Major version upgrade to gain performance and security improvements.', status: 'pending_approval', type: 'normal', risk: 'high', riskScore: 72, raisedById: mike.id,  assigneeId: mike.id,  scheduledStart: future(2880), scheduledEnd: future(3240), implementationPlan: '1. Snapshot DB\n2. Upgrade replica\n3. Promote replica\n4. Upgrade old primary', backoutPlan: 'Restore from snapshot.', affectedServices: ['payments', 'tracking', 'reporting'], linkedIncidentIds: [], linkedProblemIds: [], approvals: JSON.stringify([{ approver: 'CAB', status: 'pending' }]), tags: ['database', 'upgrade'] },
    { orgId: org.id, title: 'Deploy connection pool auto-scaling patch',      description: 'Fix for recurring DB pool exhaustion — increases max pool size dynamically.', status: 'approved', type: 'standard', risk: 'medium', riskScore: 45, raisedById: mike.id, assigneeId: mike.id, scheduledStart: future(720), scheduledEnd: future(780), implementationPlan: '1. Deploy to staging\n2. Load test\n3. Roll out to prod', backoutPlan: 'Revert image to previous tag.', affectedServices: ['payments'], linkedIncidentIds: [inc1.id], linkedProblemIds: [], approvals: JSON.stringify([{ approver: 'CTO', status: 'approved', approvedAt: past(60) }]), tags: ['payments', 'patch'] },
    { orgId: org.id, title: 'Enable mTLS on all internal service mesh',       description: 'Enforce mutual TLS across all Istio service-to-service communication.', status: 'in_progress', type: 'normal', risk: 'medium', riskScore: 55, raisedById: sarah.id, assigneeId: alex.id, scheduledStart: past(120), scheduledEnd: future(240), implementationPlan: '1. Issue certs\n2. Enable permissive mode\n3. Switch to strict', backoutPlan: 'Disable PeerAuthentication policy.', affectedServices: ['all internal services'], linkedIncidentIds: [], linkedProblemIds: [], approvals: JSON.stringify([{ approver: 'Security', status: 'approved' }]), tags: ['security', 'istio'] },
    { orgId: org.id, title: 'Migrate Redis 6 → 7 with cluster rebalance',    description: 'Redis version upgrade and shard rebalancing to improve throughput.', status: 'completed', type: 'standard', risk: 'low', riskScore: 30, raisedById: emily.id, assigneeId: emily.id, scheduledStart: past(4320), scheduledEnd: past(4260), implementationPlan: '1. Snapshot\n2. Upgrade primary\n3. Upgrade replicas', backoutPlan: 'Restore from RDB snapshot.', affectedServices: ['session-service', 'rate-limiter'], linkedIncidentIds: [], linkedProblemIds: [], approvals: JSON.stringify([{ approver: 'CAB', status: 'approved' }]), tags: ['redis', 'infra'] },
    { orgId: org.id, title: 'Emergency: Revoke compromised API keys',         description: 'Rotate and revoke all API keys exposed in public GitHub commit.', status: 'completed', type: 'emergency', risk: 'critical', riskScore: 95, raisedById: sarah.id, assigneeId: sarah.id, scheduledStart: past(180), scheduledEnd: past(120), implementationPlan: '1. Identify affected keys\n2. Revoke\n3. Rotate secrets\n4. Audit logs', backoutPlan: 'N/A – security incident.', affectedServices: ['api-gateway', 'webhook-service'], linkedIncidentIds: [], linkedProblemIds: [], approvals: JSON.stringify([{ approver: 'CISO', status: 'approved', approvedAt: past(190) }]), tags: ['security', 'emergency'] },
    { orgId: org.id, title: 'Automate SSL certificate renewal with cert-manager', description: 'Replace manual renewal process with cert-manager + Let\'s Encrypt.', status: 'draft', type: 'standard', risk: 'low', riskScore: 20, raisedById: alex.id, scheduledStart: future(5760), scheduledEnd: future(5820), implementationPlan: '1. Install cert-manager\n2. Configure ClusterIssuer\n3. Migrate existing certs', backoutPlan: 'Uninstall cert-manager, reapply manual certs.', affectedServices: ['all HTTPS endpoints'], linkedIncidentIds: [], linkedProblemIds: [], approvals: JSON.stringify([]), tags: ['ssl', 'automation'] },
  ]});
  console.log('✅  Changes');

  // ── Knowledge Base ────────────────────────────────────────────
  await prisma.kBArticle.createMany({ data: [
    { orgId: org.id, title: 'How to Acknowledge and Escalate an Alert',          summary: 'Step-by-step guide for first-responders when an alert fires.', content: '## Acknowledging an Alert\n1. Navigate to Alerts.\n2. Click the alert row.\n3. Click **Acknowledge**.\n\n## Escalating\nIf you cannot resolve within SLA, click **Escalate** and select the escalation policy.\n\n## Notes\n- Always leave a comment explaining the escalation reason.', category: 'how-to',      status: 'published', author: 'Suman Chakraborty', tags: ['alerts', 'on-call'],      views: 142, helpful: 38, notHelpful: 2,  linkedIncidentIds: [], linkedProblemIds: [] },
    { orgId: org.id, title: 'DB Connection Pool Exhaustion – Known Error',        summary: 'Workaround and fix for payment service connection pool exhaustion.',   content: '## Symptoms\n- Payment API returns 500\n- DB pool metrics spike\n\n## Workaround\n```bash\nkubectl rollout restart deploy/payments-api\n```\n\n## Permanent Fix\nIncrease max pool size to 200 and add circuit breaker (JIRA DB-1042).', category: 'known-error', status: 'published', author: 'Mike Johnson',      tags: ['database', 'payments'],  views: 210, helpful: 55, notHelpful: 3,  linkedIncidentIds: [inc1.id], linkedProblemIds: [] },
    { orgId: org.id, title: 'Kubernetes Pod CrashLoopBackOff Runbook',           summary: 'Diagnosis and recovery steps for CrashLoopBackOff pods.',              content: '## Quick Check\n```bash\nkubectl describe pod <pod-name>\nkubectl logs <pod-name> --previous\n```\n\n## Common Causes\n- OOM Kill: Increase memory limit\n- Config error: Check ConfigMap/Secret binding\n- Liveness probe failure: Review probe path\n\n## Escalation\nIf not resolved in 15 min, escalate to Platform team.', category: 'runbook',     status: 'published', author: 'Alex Rivera',      tags: ['k8s', 'infra'],          views: 189, helpful: 61, notHelpful: 4,  linkedIncidentIds: [], linkedProblemIds: [] },
    { orgId: org.id, title: 'Incident Commander Checklist',                      summary: 'Responsibilities and checklist for the Incident Commander role.',      content: '## First 5 Minutes\n- [ ] Declare incident severity\n- [ ] Assign scribe\n- [ ] Open incident bridge\n- [ ] Notify stakeholders\n\n## During Incident\n- Post updates every 15 min\n- Track timeline events\n- Coordinate sub-teams\n\n## Resolution\n- Confirm user-facing impact cleared\n- Schedule postmortem (within 48 h)', category: 'how-to',      status: 'published', author: 'Suman Chakraborty', tags: ['incident-management'],   views: 97,  helpful: 42, notHelpful: 1,  linkedIncidentIds: [], linkedProblemIds: [] },
    { orgId: org.id, title: 'Redis Cache Eviction Under Traffic – Workaround',   summary: 'Steps to stabilise Redis when cache hit rate drops below 40%.',       content: '## Emergency Steps\n```bash\nredis-cli CONFIG SET maxmemory-policy volatile-lfu\n```\n\n## Monitor\nWatch `keyspace_hits` vs `keyspace_misses` in Grafana dashboard `Redis Overview`.\n\n## Long-term Fix\nPartition cache by TTL buckets. See JIRA CACHE-88.', category: 'known-error', status: 'published', author: 'Emily Watson',     tags: ['redis', 'performance'],  views: 78,  helpful: 29, notHelpful: 2,  linkedIncidentIds: [], linkedProblemIds: [] },
    { orgId: org.id, title: 'Setting Up PagerDuty Integration',                  summary: 'Configure two-way PagerDuty sync for alert escalation.',               content: '## Prerequisites\n- PagerDuty API key with Full admin role\n\n## Steps\n1. Go to Settings > Integrations\n2. Click "Add PagerDuty"\n3. Paste API key and Service ID\n4. Save and test webhook\n\n## Verification\nFire a test alert and confirm PD incident is created.', category: 'how-to',      status: 'draft',     author: 'Alex Rivera',      tags: ['integrations'],          views: 23,  helpful: 8,  notHelpful: 0,  linkedIncidentIds: [], linkedProblemIds: [] },
    { orgId: org.id, title: 'SLA Breach Response Procedure',                     summary: 'What to do when an SLA is about to breach or has already breached.',   content: '## SLA About to Breach\n1. Triage immediately\n2. Assign to available engineer\n3. Send customer update\n\n## Already Breached\n1. Notify account manager\n2. Open Root Cause task\n3. Document in postmortem if P1/P2', category: 'how-to',      status: 'published', author: 'Suman Chakraborty', tags: ['sla', 'process'],        views: 66,  helpful: 31, notHelpful: 0,  linkedIncidentIds: [], linkedProblemIds: [] },
    { orgId: org.id, title: 'On-Call Handover Template',                         summary: 'Structured template for handing off on-call responsibility.',          content: '## Handover Template\n\n### Active Incidents\n- [ ] List open incidents\n\n### Pending Actions\n- [ ] Any follow-ups expected overnight?\n\n### Upcoming Changes\n- [ ] Scheduled maintenance windows?\n\n### Notes\n- Anything unusual in the past 24 h?', category: 'template',    status: 'published', author: 'Mike Johnson',      tags: ['on-call', 'process'],    views: 54,  helpful: 22, notHelpful: 1,  linkedIncidentIds: [], linkedProblemIds: [] },
  ]});
  console.log('✅  Knowledge Base');

  // ── Postmortems ────────────────────────────────────────────────
  await prisma.postmortem.createMany({ data: [
    { orgId: org.id, incidentId: inc1.id, incidentTitle: 'Payment Service Outage', summary: 'A 47-minute complete outage of the payment service caused by DB connection pool exhaustion during a traffic spike.', detectedAt: past(2880+47), resolvedAt: past(2880), durationMinutes: 47, severity: AlertPriority.critical, impactSummary: '~12,000 customers unable to checkout. Estimated revenue impact: $84,000.', contributingFactors: ['Under-provisioned DB connection pool', 'No circuit breaker', 'Insufficient load testing before peak season'], rootCause: 'Max DB connection pool size of 50 was insufficient for Black-Friday-level traffic (1,800 RPS). Pool saturated in 4 min.', fiveWhys: JSON.stringify(['Payment 500s','Pool exhausted','Max pool too low','Not load-tested','No review process']), whatWentWell: ['On-call responded within 3 min', 'Rollback completed in < 5 min', 'Customer comms sent within 10 min'], whatWentWrong: ['No alerting on pool utilisation', 'Runbook was outdated', 'CAB not consulted for pool config change'], actionItems: JSON.stringify([{ id: 'ai-1', title: 'Set pool utilisation alert at 80%', owner: 'Mike Johnson', dueDate: future(2880).toISOString(), status: 'in_progress' }, { id: 'ai-2', title: 'Run quarterly load tests', owner: 'Alex Rivera', dueDate: future(10080).toISOString(), status: 'open' }, { id: 'ai-3', title: 'Update DB runbook', owner: 'Emily Watson', dueDate: future(4320).toISOString(), status: 'open' }]), author: 'Suman Chakraborty', attendees: ['Suman Chakraborty', 'Mike Johnson', 'Alex Rivera', 'Emily Watson'], status: 'published' },
    { orgId: org.id, incidentId: inc2.id, incidentTitle: 'Database Replication Failure', summary: 'Replica fell 120 s behind primary due to disk saturation on WAL partition, leading to stale reads for 35 min.', detectedAt: past(7200+35), resolvedAt: past(7200), durationMinutes: 35, severity: AlertPriority.high, impactSummary: 'Read-heavy services returned stale data. No writes lost. ~3,500 affected requests.', contributingFactors: ['WAL partition undersized', 'No disk usage alert on replica', 'Backup retention policy too long'], rootCause: 'WAL partition /var/lib/postgresql/pg_wal filled to 100%, stalling replication apply worker.', fiveWhys: JSON.stringify(['Stale reads','Replication lag','Disk full','WAL too small','Not monitored']), whatWentWell: ['Issue self-resolved after disk cleared', 'Minimal data integrity impact'], whatWentWrong: ['No disk alert on replica nodes', 'WAL partition not sized per runbook'], actionItems: JSON.stringify([{ id: 'ai-4', title: 'Add disk alert on all DB nodes', owner: 'Alex Rivera', dueDate: future(1440).toISOString(), status: 'open' }, { id: 'ai-5', title: 'Automate WAL archiving to S3', owner: 'Mike Johnson', dueDate: future(5760).toISOString(), status: 'open' }]), author: 'Mike Johnson', attendees: ['Mike Johnson', 'Alex Rivera'], status: 'draft' },
  ]});
  console.log('✅  Postmortems');

  // ── Heartbeats ─────────────────────────────────────────────────
  await prisma.heartbeat.createMany({ data: [
    { orgId: org.id, name: 'Nightly ETL Pipeline',        description: 'Analytics ETL job that runs at 02:00 UTC.',     interval: 60,  unit: 'minutes', status: 'expired',  lastPingAt: past(90),   expiresAt: past(30),   team: 'Platform',  tags: ['etl', 'analytics'],  alertOnExpiry: true,  alertPriority: AlertPriority.high },
    { orgId: org.id, name: 'Shipment Status Sync',        description: 'Batch sync of shipment statuses from FedEx API.', interval: 15, unit: 'minutes', status: 'active',   lastPingAt: past(10),   expiresAt: future(5),  team: 'SRE Team',  tags: ['tracking'],          alertOnExpiry: true,  alertPriority: AlertPriority.high },
    { orgId: org.id, name: 'Certificate Expiry Checker',  description: 'Checks all prod certs weekly.',                 interval: 7,   unit: 'days',    status: 'active',   lastPingAt: past(1440), expiresAt: future(8640), team: 'Security', tags: ['ssl', 'security'],   alertOnExpiry: true,  alertPriority: AlertPriority.medium },
    { orgId: org.id, name: 'Daily DB Backup Verify',      description: 'Confirms nightly DB snapshot completed.',       interval: 24,  unit: 'hours',   status: 'active',   lastPingAt: past(120),  expiresAt: future(1320), team: 'SRE Team', tags: ['backup', 'database'], alertOnExpiry: true, alertPriority: AlertPriority.critical },
    { orgId: org.id, name: 'Invoice Generation Job',      description: 'Monthly invoice PDF generation.',              interval: 30,  unit: 'days',    status: 'inactive', lastPingAt: past(43200), expiresAt: past(40000), team: 'Platform', tags: ['billing'],            alertOnExpiry: false, alertPriority: AlertPriority.low },
    { orgId: org.id, name: 'SLA Breach Notifier',         description: 'Fires every 5 min to check SLA status.',       interval: 5,   unit: 'minutes', status: 'active',   lastPingAt: past(3),    expiresAt: future(2),  team: 'SRE Team',  tags: ['sla', 'monitoring'], alertOnExpiry: true,  alertPriority: AlertPriority.high },
  ]});
  console.log('✅  Heartbeats');

  // ── Alert Routing Rules ────────────────────────────────────────
  await prisma.alertRoutingRule.createMany({ data: [
    { orgId: org.id, name: 'Critical Payments Alerts → SRE',    description: 'Route all critical payment alerts directly to SRE Primary.',      conditions: JSON.stringify([{ field: 'priority', operator: 'equals', value: 'critical' }, { field: 'tags', operator: 'contains', value: 'payments' }]), conditionLogic: 'all',  targetTeam: 'SRE Team',      enabled: true,  order: 1 },
    { orgId: org.id, name: 'Security Alerts → Security Team',   description: 'All alerts tagged security go to the Security team.',              conditions: JSON.stringify([{ field: 'tags', operator: 'contains', value: 'security' }]),                                                               conditionLogic: 'any',  targetTeam: 'Security Team', enabled: true,  order: 2 },
    { orgId: org.id, name: 'K8s Alerts → Platform Team',        description: 'Kubernetes and infrastructure alerts to Platform.',                 conditions: JSON.stringify([{ field: 'source', operator: 'in', value: ['Kubernetes', 'Prometheus'] }]),                                               conditionLogic: 'any',  targetTeam: 'Platform Team', enabled: true,  order: 3 },
    { orgId: org.id, name: 'Low Priority Info → Platform',      description: 'Low-priority informational alerts go to Platform for batching.',   conditions: JSON.stringify([{ field: 'priority', operator: 'in', value: ['low', 'info'] }]),                                                          conditionLogic: 'all',  targetTeam: 'Platform Team', enabled: true,  order: 4, priorityOverride: AlertPriority.info },
    { orgId: org.id, name: 'ETL & Analytics → Platform Team',   description: 'ETL job failures routed to Platform on-call.',                     conditions: JSON.stringify([{ field: 'tags', operator: 'contains', value: 'etl' }]),                                                                   conditionLogic: 'any',  targetTeam: 'Platform Team', enabled: false, order: 5 },
  ]});
  console.log('✅  Alert Routing Rules');

  // ── Escalation Policies ────────────────────────────────────────
  await prisma.escalationPolicy.createMany({ data: [
    { orgId: org.id, name: 'Critical Incident Escalation',  description: 'Auto-escalates P1 incidents through the on-call chain until acknowledged.', steps: JSON.stringify([{ order: 1, type: 'on-call',  target: 'SRE Team',      delayMinutes: 0 }, { order: 2, type: 'manager', target: 'Suman Chakraborty', delayMinutes: 15 }, { order: 3, type: 'executive', target: 'VP Engineering', delayMinutes: 30 }]), repeatCount: 2, repeatDelayMinutes: 15, teamId: sre.id,      teamName: 'SRE Team',      linkedPriorities: ['critical'] },
    { orgId: org.id, name: 'High Priority Escalation',      description: 'Two-step escalation for P2 alerts that are not acknowledged within 30 min.', steps: JSON.stringify([{ order: 1, type: 'on-call', target: 'SRE Team', delayMinutes: 0 }, { order: 2, type: 'manager', target: 'Mike Johnson', delayMinutes: 30 }]),                                                                     repeatCount: 1, repeatDelayMinutes: 30, teamId: sre.id,      teamName: 'SRE Team',      linkedPriorities: ['high'] },
    { orgId: org.id, name: 'Platform Team Escalation',      description: 'Escalate unacknowledged platform alerts to on-call lead.', steps: JSON.stringify([{ order: 1, type: 'on-call', target: 'Platform Team', delayMinutes: 0 }, { order: 2, type: 'manager', target: 'Alex Rivera', delayMinutes: 60 }]),                                                                                   repeatCount: 1, repeatDelayMinutes: 60, teamId: platform.id, teamName: 'Platform Team', linkedPriorities: ['critical', 'high'] },
    { orgId: org.id, name: 'Security Incident Escalation',  description: 'Security events escalate immediately to the security lead then CISO.', steps: JSON.stringify([{ order: 1, type: 'on-call', target: 'Security Team', delayMinutes: 0 }, { order: 2, type: 'executive', target: 'CISO', delayMinutes: 10 }]),                                                                             repeatCount: 3, repeatDelayMinutes: 10, teamId: security.id, teamName: 'Security Team', linkedPriorities: ['critical', 'high'] },
  ]});
  console.log('✅  Escalation Policies');

  // ── Maintenance Windows ────────────────────────────────────────
  await prisma.maintenanceWindow.createMany({ data: [
    { orgId: org.id, title: 'PostgreSQL 14 → 16 Upgrade',          description: 'Planned DB major version upgrade. Alert suppression active for DB cluster.', startTime: future(2880), endTime: future(3240), affectedServices: ['payments', 'tracking', 'reporting'],      affectedTeams: ['SRE Team', 'Platform Team'], status: 'scheduled', suppressAlerts: true,  createdById: mike.id },
    { orgId: org.id, title: 'Kubernetes Cluster Node Rolling Update', description: 'Rolling update of all worker nodes to containerd 1.7.',                   startTime: future(720),  endTime: future(840),  affectedServices: ['all services'],                           affectedTeams: ['Platform Team'],            status: 'scheduled', suppressAlerts: true,  createdById: alex.id },
    { orgId: org.id, title: 'Network Firewall Rule Update',           description: 'Updating egress firewall rules; brief packet loss expected.',              startTime: past(30),     endTime: future(30),   affectedServices: ['api-gateway'],                            affectedTeams: ['Security Team', 'SRE Team'],status: 'active',    suppressAlerts: true,  createdById: sarah.id },
    { orgId: org.id, title: 'Redis Cluster Shard Rebalance',          description: 'Rebalancing Redis keyspace after capacity expansion.',                     startTime: past(4320),   endTime: past(4200),   affectedServices: ['session-service', 'rate-limiter'],        affectedTeams: ['SRE Team'],                 status: 'completed', suppressAlerts: false, createdById: emily.id },
    { orgId: org.id, title: 'SSL Certificate Batch Renewal',          description: 'Batch renewal of 12 expiring TLS certificates across prod endpoints.',     startTime: future(10080),endTime: future(10140),affectedServices: ['all HTTPS endpoints'],                    affectedTeams: ['Security Team', 'Platform Team'], status: 'scheduled', suppressAlerts: false, createdById: sarah.id },
  ]});
  console.log('✅  Maintenance Windows');

  // ── Notification Channels ─────────────────────────────────────
  await prisma.notificationChannel.createMany({ data: [
    { orgId: org.id, name: 'Central Slack – #incidents',   type: 'slack',    config: JSON.stringify({ webhookUrl: 'https://hooks.slack.com/services/T000/B000/xxxx', channel: '#incidents' }),                isGlobal: true,  enabled: true  },
    { orgId: org.id, name: 'PagerDuty – SRE Primary',      type: 'pagerduty',config: JSON.stringify({ integrationKey: 'pd_xxxxxx', serviceId: 'PSRE001' }),                                                  isGlobal: false, enabled: true,  teamId: sre.id },
    { orgId: org.id, name: 'Email – Ops Distribution List', type: 'email',   config: JSON.stringify({ address: 'ops-team@fedex-ito.internal' }),                                                              isGlobal: true,  enabled: true  },
    { orgId: org.id, name: 'Slack – #security-alerts',     type: 'slack',    config: JSON.stringify({ webhookUrl: 'https://hooks.slack.com/services/T000/B001/yyyy', channel: '#security-alerts' }),          isGlobal: false, enabled: true,  teamId: security.id },
    { orgId: org.id, name: 'SMS – On-Call Mobile',         type: 'sms',      config: JSON.stringify({ provider: 'twilio', fromNumber: '+15005550006', toNumbers: ['+14155552671', '+14155552672'] }),          isGlobal: false, enabled: false, teamId: sre.id },
    { orgId: org.id, name: 'Microsoft Teams – #alerts',    type: 'teams',    config: JSON.stringify({ webhookUrl: 'https://outlook.office.com/webhook/xxxx' }),                                               isGlobal: true,  enabled: true  },
    { orgId: org.id, name: 'Webhook – ITSM Bridge',        type: 'webhook',  config: JSON.stringify({ url: 'https://itsm.fedex-ito.internal/api/webhook/alerthive', method: 'POST', headers: { 'X-Auth': 'secret' } }), isGlobal: true, enabled: true },
  ]});
  console.log('✅  Notification Channels');

  // ── Playbooks ─────────────────────────────────────────────────
  await prisma.playbook.createMany({ data: [
    { orgId: org.id, title: 'Payment Service Outage Response', description: 'End-to-end runbook for responding to payment service P1 incidents.', triggerConditions: ['priority=critical', 'tag=payments'], linkedPriorities: ['critical'], author: 'Suman Chakraborty', version: '2.1', tags: ['payments', 'p1'], steps: JSON.stringify([{ order: 1, title: 'Acknowledge alert', description: 'Ack the alert in AlertHive within 3 min.', type: 'manual', assignee: 'On-call engineer' }, { order: 2, title: 'Check DB pool metrics', description: 'Open Grafana "Payments DB" dashboard and check pool saturation.', type: 'investigation' }, { order: 3, title: 'Restart deployment if pool exhausted', description: 'kubectl rollout restart deploy/payments-api -n prod', type: 'action', automated: false }, { order: 4, title: 'Notify stakeholders', description: 'Post update to #incidents Slack channel.', type: 'communication' }, { order: 5, title: 'Confirm recovery', description: 'Verify checkout success rate > 99% in Datadog.', type: 'verification' }]) },
    { orgId: org.id, title: 'Kubernetes Pod Recovery Runbook',  description: 'Steps for diagnosing and recovering pods in CrashLoopBackOff or OOMKilled state.', triggerConditions: ['source=Kubernetes', 'tag=k8s'], linkedPriorities: ['critical', 'high'], author: 'Alex Rivera', version: '1.3', tags: ['k8s', 'infra'], steps: JSON.stringify([{ order: 1, title: 'Identify affected pods', description: 'kubectl get pods --all-namespaces | grep -v Running', type: 'investigation' }, { order: 2, title: 'Check pod describe & logs', description: 'kubectl describe pod <name>; kubectl logs <name> --previous', type: 'investigation' }, { order: 3, title: 'Assess OOM or config error', description: 'Look for OOMKilled or config mount errors.', type: 'decision' }, { order: 4, title: 'Apply fix (increase limits or fix config)', description: 'Edit deployment manifest and apply.', type: 'action' }, { order: 5, title: 'Monitor rollout', description: 'kubectl rollout status deploy/<name> -n <namespace>', type: 'verification' }]) },
    { orgId: org.id, title: 'Security Incident Response',       description: 'Immediate response steps for security incidents — credential leaks, DDoS, account takeovers.', triggerConditions: ['priority=critical', 'tag=security'], linkedPriorities: ['critical', 'high'], author: 'Suman Chakraborty', version: '1.0', tags: ['security', 'p1'], steps: JSON.stringify([{ order: 1, title: 'Isolate affected system', description: 'Block inbound/outbound traffic on compromised resource via security group.', type: 'action' }, { order: 2, title: 'Notify CISO', description: 'Call CISO directly; do not use email for credentials.', type: 'communication' }, { order: 3, title: 'Rotate all affected secrets', description: 'Use vault CLI to rotate API keys, DB passwords.', type: 'action' }, { order: 4, title: 'Preserve evidence', description: 'Snapshot CloudWatch logs; do not delete resources.', type: 'action' }, { order: 5, title: 'Document and open postmortem', description: 'Create postmortem within 2 hours.', type: 'documentation' }]) },
    { orgId: org.id, title: 'On-Call Handover Checklist',       description: 'Standard end-of-shift handover to ensure continuity.', triggerConditions: [], linkedPriorities: [], author: 'Mike Johnson', version: '1.0', tags: ['on-call', 'process'], steps: JSON.stringify([{ order: 1, title: 'Review open incidents', description: 'List all open incidents and their status.', type: 'review' }, { order: 2, title: 'Check pending alerts', description: 'Ensure no open alerts are un-acknowledged.', type: 'review' }, { order: 3, title: 'Note upcoming changes', description: 'Check CAB schedule for the next 24 h.', type: 'review' }, { order: 4, title: 'Brief incoming on-call', description: 'Walk through anything unusual in last shift.', type: 'communication' }]) },
  ]});
  console.log('✅  Playbooks');

  // ── Service Catalog ────────────────────────────────────────────
  await prisma.serviceCatalogItem.createMany({ data: [
    { orgId: org.id, title: 'Raise a Support Ticket',              description: 'Submit a general support request for any system or application issue.',          category: 'support',        icon: 'ticket',          slaHours: 4,   approvalRequired: false, popularity: 95, tags: ['support', 'general'] },
    { orgId: org.id, title: 'Request Access to Production System', description: 'Request elevated or new access to production environments.',                    category: 'access',         icon: 'lock',            slaHours: 24,  approvalRequired: true,  popularity: 80, tags: ['access', 'security'] },
    { orgId: org.id, title: 'SSL Certificate Renewal',             description: 'Request renewal or issuance of an SSL/TLS certificate for a domain.',           category: 'infrastructure', icon: 'shield',          slaHours: 48,  approvalRequired: false, popularity: 55, tags: ['ssl', 'certificates'] },
    { orgId: org.id, title: 'New User Onboarding',                 description: 'Provision accounts, licenses, and tools for a new team member.',                category: 'onboarding',     icon: 'user-plus',       slaHours: 48,  approvalRequired: true,  popularity: 72, tags: ['onboarding', 'hr'] },
    { orgId: org.id, title: 'Database Capacity Increase',          description: 'Request additional disk or memory for a database cluster.',                     category: 'infrastructure', icon: 'database',        slaHours: 72,  approvalRequired: true,  popularity: 44, tags: ['database', 'capacity'] },
    { orgId: org.id, title: 'Deploy Feature to Production',        description: 'Request a production deployment outside of the standard CICD pipeline.',       category: 'deployment',     icon: 'rocket',          slaHours: 8,   approvalRequired: true,  popularity: 63, tags: ['deployment', 'cicd'] },
    { orgId: org.id, title: 'VPN Access Request',                  description: 'Request VPN credentials for remote access to internal systems.',               category: 'access',         icon: 'wifi',            slaHours: 8,   approvalRequired: false, popularity: 88, tags: ['vpn', 'access', 'remote'] },
    { orgId: org.id, title: 'Security Vulnerability Scan',         description: 'Request a targeted vulnerability scan on an application or infrastructure.',   category: 'security',       icon: 'search',          slaHours: 72,  approvalRequired: false, popularity: 39, tags: ['security', 'scan'] },
    { orgId: org.id, title: 'API Key / Token Generation',          description: 'Generate a new API key or service token for integration purposes.',            category: 'developer-tools', icon: 'key',            slaHours: 4,   approvalRequired: false, popularity: 77, tags: ['api', 'integration'] },
    { orgId: org.id, title: 'Scheduled Maintenance Request',       description: 'Schedule a maintenance window with appropriate change advisory approval.',     category: 'operations',     icon: 'calendar',        slaHours: 24,  approvalRequired: true,  popularity: 51, tags: ['maintenance', 'change'] },
  ]});
  console.log('✅  Service Catalog');

  console.log('\n🎉  Seed complete!');
  console.log('\nDemo login credentials:');
  console.log('  Admin:     suman75938@gmail.com  / Ah@2026#Sx!kR9');
  console.log('  Developer: mike@alerthive.com    / dev123');
  console.log('  End User:  jordan@example.com    / user123');
}

main()
  .catch((e) => { console.error('❌  Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
