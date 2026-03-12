/**
 * Database seeder – populates a fresh database with demo data
 * Run: npm run db:seed
 */

import { PrismaClient, UserRole, AlertPriority, AlertStatus, IncidentStatus, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding AlertHive database...');

  // ── Organisation ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'fedex-ito' },
    update: {},
    create: {
      name: 'FedEx ITO',
      slug: 'fedex-ito',
    },
  });
  console.log(`✅  Org: ${org.name}`);

  // ── Users ─────────────────────────────────────────────────────
  const seeds = [
    { name: 'Suman Chakraborty', email: 'admin@alerthive.com',  password: 'REDACTED_SEED_PASSWORD',  role: UserRole.admin },
    { name: 'Mike Johnson',  email: 'mike@alerthive.com',   password: 'dev123',    role: UserRole.developer },
    { name: 'Alex Rivera',   email: 'alex@alerthive.com',   password: 'dev123',    role: UserRole.developer },
    { name: 'Emily Watson',  email: 'emily@alerthive.com',  password: 'dev123',    role: UserRole.developer },
    { name: 'Jordan Lee',    email: 'jordan@example.com',   password: 'user123',   role: UserRole.end_user },
    { name: 'Casey Morgan',  email: 'casey@example.com',    password: 'user123',   role: UserRole.end_user },
  ];

  const users = await Promise.all(
    seeds.map(async (s) => {
      const hash = await bcrypt.hash(s.password, 10);
      return prisma.user.upsert({
        where: { email_orgId: { email: s.email, orgId: org.id } },
        update: {},
        create: {
          orgId: org.id,
          name: s.name,
          email: s.email,
          passwordHash: hash,
          role: s.role,
        },
      });
    }),
  );
  console.log(`✅  Users: ${users.map((u) => u.name).join(', ')}`);

  const [sarah, mike, alex, emily, jordan, casey] = users;

  // ── SLA Policies ──────────────────────────────────────────────
  const slaPolicies = [
    { severity: AlertPriority.critical, responseTimeMinutes: 15,   resolutionTimeMinutes: 60,    escalateAfterMinutes: 30,   description: 'P1 – Service down, immediate business impact' },
    { severity: AlertPriority.high,     responseTimeMinutes: 60,   resolutionTimeMinutes: 240,   escalateAfterMinutes: 120,  description: 'P2 – Significant degradation, workaround exists' },
    { severity: AlertPriority.medium,   responseTimeMinutes: 240,  resolutionTimeMinutes: 1440,  escalateAfterMinutes: 480,  description: 'P3 – Partial impact, standard priority' },
    { severity: AlertPriority.low,      responseTimeMinutes: 480,  resolutionTimeMinutes: 4320,  escalateAfterMinutes: 1440, description: 'P4 – Minor issue, low business impact' },
    { severity: AlertPriority.info,     responseTimeMinutes: 1440, resolutionTimeMinutes: 10080, escalateAfterMinutes: 2880, description: 'P5 – Informational, no immediate action needed' },
  ];
  await Promise.all(
    slaPolicies.map((p) =>
      prisma.slaPolicy.upsert({
        where: { orgId_severity: { orgId: org.id, severity: p.severity } },
        update: {},
        create: { orgId: org.id, ...p },
      }),
    ),
  );
  console.log('✅  SLA policies created');

  // ── Teams ─────────────────────────────────────────────────────
  const sre = await prisma.team.upsert({
    where: { id: 'team-sre-1' },
    update: {},
    create: { id: 'team-sre-1', orgId: org.id, name: 'SRE Team', description: 'Site Reliability Engineering' },
  });
  await prisma.teamMember.createMany({
    skipDuplicates: true,
    data: [
      { teamId: sre.id, userId: sarah.id, isOnCall: true },
      { teamId: sre.id, userId: mike.id },
      { teamId: sre.id, userId: alex.id },
      { teamId: sre.id, userId: emily.id },
    ],
  });
  console.log('✅  Teams seeded');

  // ── Alerts ────────────────────────────────────────────────────
  const alert1 = await prisma.alert.create({
    data: {
      orgId: org.id, title: 'Payment gateway returning 500 errors',
      message: 'Production payment service is returning HTTP 500. Affecting all checkout flows.',
      source: 'Dynatrace', priority: AlertPriority.critical, status: AlertStatus.open, tags: ['payments', 'prod'],
    },
  });
  const alert2 = await prisma.alert.create({
    data: {
      orgId: org.id, title: 'CPU usage spike on app-server-03',
      message: 'CPU usage has exceeded 95% threshold for 10+ minutes.',
      source: 'Prometheus', priority: AlertPriority.high, status: AlertStatus.acknowledged,
      assigneeId: mike.id, acknowledgedById: mike.id, acknowledgedAt: new Date(),
      tags: ['infra', 'cpu'],
    },
  });
  await prisma.alert.createMany({
    data: [
      { orgId: org.id, title: 'SSL certificate expiring in 7 days', message: 'api.fedex-ito.internal SSL cert expires soon.', source: 'CertMonitor', priority: AlertPriority.medium, status: AlertStatus.open, tags: ['ssl', 'security'] },
      { orgId: org.id, title: 'Disk usage at 85% on db-primary', message: 'Primary database server disk is at 85%.', source: 'Grafana', priority: AlertPriority.medium, status: AlertStatus.acknowledged, tags: ['database', 'storage'] },
      { orgId: org.id, title: 'Deployment pipeline failed', message: 'main branch deployment to prod failed.', source: 'GitHub Actions', priority: AlertPriority.high, status: AlertStatus.open, tags: ['ci-cd', 'deploy'] },
    ],
  });
  console.log('✅  Alerts seeded');

  // ── Incidents ─────────────────────────────────────────────────
  const inc = await prisma.incident.create({
    data: {
      orgId: org.id, title: 'Payment Service Outage',
      description: 'Complete payment processing outage affecting all FedEx Shipping checkout flows.',
      status: IncidentStatus.investigating, priority: AlertPriority.critical,
      assigneeId: sarah.id, responders: [sarah.id, mike.id],
    },
  });
  await prisma.incidentAlert.create({ data: { incidentId: inc.id, alertId: alert1.id } });
  await prisma.timelineEvent.createMany({
    data: [
      { incidentId: inc.id, type: 'created',      message: 'Incident created', userId: sarah.id },
      { incidentId: inc.id, type: 'acknowledged',  message: 'Mike J acknowledged and began investigation', userId: mike.id },
      { incidentId: inc.id, type: 'note',          message: 'Root cause identified: DB connection pool exhausted', userId: mike.id },
    ],
  });
  console.log('✅  Incidents seeded');

  // ── Tickets ───────────────────────────────────────────────────
  const now = new Date();
  const future = (minutes: number) => new Date(now.getTime() + minutes * 60000);
  const past = (minutes: number) => new Date(now.getTime() - minutes * 60000);

  await prisma.ticket.createMany({
    data: [
      { orgId: org.id, title: 'Payment gateway returning 500 errors', description: 'Users unable to complete checkout.', priority: AlertPriority.critical, status: TicketStatus.in_progress, raisedById: jordan.id, assignedToId: mike.id, slaDueAt: future(15), slaBreached: false, tags: ['payments'] },
      { orgId: org.id, title: 'Login page slow on mobile devices', description: 'Mobile users report 8-12 second login times.', priority: AlertPriority.high, status: TicketStatus.open, raisedById: casey.id, slaDueAt: future(180), slaBreached: false, tags: ['auth', 'performance'] },
      { orgId: org.id, title: 'CSV export missing headers', description: 'Exported reports do not include column headers.', priority: AlertPriority.medium, status: TicketStatus.resolved, raisedById: jordan.id, assignedToId: alex.id, slaDueAt: past(200), resolvedAt: past(60), slaBreached: false, tags: ['reports'] },
      { orgId: org.id, title: 'Email notifications not sending', description: 'No alert notifications sent since yesterday 22:00 UTC.', priority: AlertPriority.critical, status: TicketStatus.open, raisedById: casey.id, slaDueAt: past(540), slaBreached: true, tags: ['notifications'] },
      { orgId: org.id, title: 'Add dark mode toggle to settings', description: 'Feature request: light/dark theme switch.', priority: AlertPriority.low, status: TicketStatus.open, raisedById: jordan.id, slaDueAt: future(1000), slaBreached: false, tags: ['feature', 'ui'] },
    ],
  });
  console.log('✅  Tickets seeded');

  console.log('\n🎉  Seed complete!');
  console.log('\nDemo login credentials:');
  console.log('  Admin:     admin@alerthive.com  / REDACTED_SEED_PASSWORD');
  console.log('  Developer: mike@alerthive.com   / dev123');
  console.log('  End User:  jordan@example.com   / user123');
}

main()
  .catch((e) => { console.error('❌  Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
