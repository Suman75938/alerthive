/**
 * clear-seed-alerts.ts
 * Removes all seed/dummy alerts, tickets, incidents and problems
 * from the database, keeping the org, users, and config intact.
 *
 * Run from alerthive-api/:
 *   npx ts-node src/db/clear-seed-alerts.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: 'fedex-ito' } });
  if (!org) { console.error('Org fedex-ito not found'); process.exit(1); }

  console.log(`Clearing demo data for org: ${org.name} (${org.id})`);

  const [alerts, tickets, incidents, problems] = await Promise.all([
    prisma.alert.deleteMany({ where: { orgId: org.id } }),
    prisma.ticket.deleteMany({ where: { orgId: org.id } }),
    prisma.incident.deleteMany({ where: { orgId: org.id } }),
    prisma.problem.deleteMany({ where: { orgId: org.id } }),
  ]);

  console.log(`✅  Deleted ${alerts.count} alerts`);
  console.log(`✅  Deleted ${tickets.count} tickets`);
  console.log(`✅  Deleted ${incidents.count} incidents`);
  console.log(`✅  Deleted ${problems.count} problems`);
  console.log('\nDatabase is clean. Ready for real Dynatrace alerts.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
