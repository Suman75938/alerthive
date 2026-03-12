#!/usr/bin/env node
/**
 * AlertHive – Cost Estimator
 * ──────────────────────────
 * Computes detailed cost breakdowns for:
 *   A) AKS on Azure (3 API pods + managed services)
 *   B) On-premises / bare-metal (self-hosted)
 *
 * Run: npm run perf:cost
 *      node tests/load/cost-estimate.js [--region eastus] [--tier standard]
 *
 * Prices sourced from Azure public pricing (March 2026, East US).
 * Update the PRICES object below if rates change.
 */

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const region = args.find(a => a.startsWith('--region='))?.split('=')[1] ?? 'eastus';
const tier   = args.find(a => a.startsWith('--tier='))?.split('=')[1]  ?? 'standard';

// ── Azure East US pricing (USD/month, pay-as-you-go) ─────────────────────────
const AKS = {
  // Node VM for the API pods – Standard_D2s_v5 (2 vCPU, 8 GB)
  nodeVm: {
    sku:         'Standard_D2s_v5',
    vcpu:        2,
    ramGb:       8,
    pricePerHr:  0.096,           // on-demand
    pricePerHrRi: 0.058,          // 1-yr reserved
  },

  // Azure Kubernetes Service – control plane
  aksControlPlane: {
    pricePerHr: 0.10,             // $0.10/hr per cluster (paid tier)
    note: 'Free tier available for dev; paid needed for SLA',
  },

  // Azure Database for PostgreSQL Flexible Server – General Purpose 2 vCPU
  postgres: {
    sku:        'Standard_D2ds_v4',
    vcpu:       2,
    ramGb:      8,
    storageGb:  32,
    pricePerHr: 0.183,            // compute
    storagePerGbMo: 0.115,        // managed disk
    backupPerGbMo:  0.032,
    haMultiplier:   2.0,          // zone-redundant HA doubles compute cost
  },

  // Azure Cache for Redis – C1 (1 GB)
  redis: {
    sku:        'C1 Standard',
    ramGb:      1,
    pricePerHr: 0.068,
  },

  // Azure Event Hubs (Kafka-compatible) – Standard, 1 TU
  eventHubs: {
    sku:           'Standard',
    throughputUnits: 1,
    pricePerTuHr:  0.030,
    ingressPerMillion: 0.028,
    estimatedMillionMsgPerMo: 5,  // ~5M events/month for AlertHive scale
  },

  // ACR – Basic tier for storing Docker images
  containerRegistry: {
    sku:       'Basic',
    pricePerMo: 5.00,
    storageGb:  10,
  },

  // Azure Load Balancer (Standard, included with AKS ingress)
  loadBalancer: {
    pricePerHr: 0.025,
    rulesPerMo: 1.60,  // per rule/hr
    dataProcessedPerGb: 0.005,
    estimatedGbPerMo: 50,
  },

  // Bandwidth (egress from East US)
  bandwidth: {
    firstFiveGbFree: true,
    perGbAfter5Gb:   0.087,
    estimatedGbPerMo: 100,  // dashboard + API consumers
  },

  // Log Analytics (Azure Monitor) – for container insights
  logAnalytics: {
    perGbIngested: 2.30,
    estimatedGbPerMo: 5,
  },
};

// ── On-premises hardware pricing (buy + run) ──────────────────────────────────
const ONPREM = {
  // Dell PowerEdge R650 (2× Intel Xeon Silver 4316, 64 GB RAM, 2× 1TB SSD)
  server: {
    model:         'Dell PowerEdge R650',
    purchasePrice: 8500,          // USD one-time (per server)
    count:         2,             // 1 app server + 1 DB server
    lifeYears:     5,
    rackUHeight:   1,
  },

  // Data centre co-location (or on-site server room)
  datacenter: {
    rackUPerMo:     150,          // per U per month (colocation)
    uUsed:          2,
    powerKwPerServer: 0.3,        // kW typical
    powerCostPerKwh:  0.12,
    hoursPerMo:       730,
    cooling:          1.5,        // PUE multiplier
  },

  // Networking
  network: {
    switchMonthly:   80,          // managed switch lease / amortised cost
    internetMonthly: 200,         // dedicated 1Gbps symmetric
    firewallMonthly: 50,
  },

  // Software licensing (open-source stack – $0 for PG/Redis/Kafka)
  softwareLicenses: {
    os: 0,           // Ubuntu Server – free
    db: 0,           // PostgreSQL – free
    monitoring: 50,  // Grafana Cloud free tier; $50 if self-hosted Prometheus+Grafana
  },

  // Ops labour (DevOps/SRE effort)
  labour: {
    sysAdminHoursPerMo: 20,
    hourlyRate:         85,       // USD blended rate
  },
};

// ── Calculators ───────────────────────────────────────────────────────────────
function calcAKS() {
  const hoursPerMo = 730;

  // 3-node pool for 3 API replicas (1 pod per node to satisfy podAntiAffinity)
  const nodeCount  = 3;
  const vmOnDemand = AKS.nodeVm.pricePerHr   * hoursPerMo * nodeCount;
  const vmReserved = AKS.nodeVm.pricePerHrRi * hoursPerMo * nodeCount;

  const controlPlane = AKS.aksControlPlane.pricePerHr * hoursPerMo;

  const pgCompute =  AKS.postgres.pricePerHr * hoursPerMo * AKS.postgres.haMultiplier;
  const pgStorage =  AKS.postgres.storageGb  * AKS.postgres.storagePerGbMo * 2; // primary + standby
  const pgBackup  =  AKS.postgres.storageGb  * AKS.postgres.backupPerGbMo;
  const postgres  =  pgCompute + pgStorage + pgBackup;

  const redis = AKS.redis.pricePerHr * hoursPerMo;

  const ehCompute = AKS.eventHubs.pricePerTuHr * hoursPerMo;
  const ehIngress = AKS.eventHubs.estimatedMillionMsgPerMo * AKS.eventHubs.ingressPerMillion;
  const eventHubs = ehCompute + ehIngress;

  const acr = AKS.containerRegistry.pricePerMo;

  const lbBase    = AKS.loadBalancer.pricePerHr * hoursPerMo;
  const lbData    = AKS.loadBalancer.estimatedGbPerMo * AKS.loadBalancer.dataProcessedPerGb;
  const lb        = lbBase + lbData;

  const bandwidth  = AKS.bandwidth.estimatedGbPerMo * AKS.bandwidth.perGbAfter5Gb;
  const monitoring = AKS.logAnalytics.estimatedGbPerMo * AKS.logAnalytics.perGbIngested;

  const totalOnDemand = vmOnDemand + controlPlane + postgres + redis + eventHubs + acr + lb + bandwidth + monitoring;
  const totalReserved = vmReserved + controlPlane + postgres + redis + eventHubs + acr + lb + bandwidth + monitoring;

  return {
    breakdown: {
      'AKS Node Pool (3× D2s_v5) – on-demand': vmOnDemand.toFixed(2),
      'AKS Node Pool (3× D2s_v5) – 1-yr reserved': vmReserved.toFixed(2),
      'AKS Control Plane':                          controlPlane.toFixed(2),
      'PostgreSQL Flexible Server (HA, D2ds_v4)':   postgres.toFixed(2),
      'Azure Cache for Redis (C1 Standard)':         redis.toFixed(2),
      'Azure Event Hubs Standard (1 TU)':            eventHubs.toFixed(2),
      'Azure Container Registry (Basic)':            acr.toFixed(2),
      'Azure Load Balancer (Standard)':              lb.toFixed(2),
      'Outbound Bandwidth (~100 GB)':                bandwidth.toFixed(2),
      'Azure Monitor / Log Analytics (~5 GB)':       monitoring.toFixed(2),
    },
    totalOnDemand: totalOnDemand.toFixed(2),
    totalReserved: totalReserved.toFixed(2),
    annualOnDemand: (totalOnDemand * 12).toFixed(2),
    annualReserved: (totalReserved * 12).toFixed(2),
  };
}

function calcOnPrem() {
  const { server, datacenter, network, softwareLicenses, labour } = ONPREM;

  // Amortised hardware cost per month
  const hwAmortised = (server.purchasePrice * server.count) / (server.lifeYears * 12);

  // Power cost per month
  const powerPerServer = datacenter.powerKwPerServer * datacenter.hoursPerMo * datacenter.cooling * datacenter.powerCostPerKwh;
  const totalPower     = powerPerServer * server.count;

  // Rackspace
  const rackCost = datacenter.rackUPerMo * datacenter.uUsed;

  // Networking
  const netCost = network.switchMonthly + network.internetMonthly + network.firewallMonthly;

  // Software
  const swCost = Object.values(softwareLicenses).reduce((s, v) => s + v, 0);

  // Labour
  const labourCost = labour.sysAdminHoursPerMo * labour.hourlyRate;

  // Initial capex spread (servers)
  const capexOneTime = server.purchasePrice * server.count;

  const totalMonthly = hwAmortised + totalPower + rackCost + netCost + swCost + labourCost;
  const totalAnnual  = totalMonthly * 12;

  return {
    breakdown: {
      'Hardware amortised (2× Dell R650 / 60 mo)':  hwAmortised.toFixed(2),
      'Power (2 servers × 0.3 kW × PUE 1.5)':       totalPower.toFixed(2),
      'Co-location rack space (2U)':                  rackCost.toFixed(2),
      'Network (switch + internet + firewall)':        netCost.toFixed(2),
      'Software licenses (OS/PG/Redis/Kafka = free)': swCost.toFixed(2),
      'SysAdmin / DevOps labour (20 hrs/mo × $85)':  labourCost.toFixed(2),
    },
    capexOneTime:   capexOneTime.toFixed(2),
    totalMonthly:   totalMonthly.toFixed(2),
    totalAnnual:    totalAnnual.toFixed(2),
    labourSubtotal: (labourCost * 12).toFixed(2),
    note:           'Excludes: disaster recovery, offsite backup, physical security, depreciation adjustment',
  };
}

// ── AKS Sizing Table ──────────────────────────────────────────────────────────
function printSizingTable() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          ALERTHIVE – AKS POD RESOURCE SIZING (3 replicas)           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const components = [
    { name: 'alerthive-api (×3)',     cpuReq: '250m', cpuLim: '500m',  memReq: '256Mi', memLim: '512Mi',  notes: 'Node.js + Express + Prisma' },
    { name: 'alerthive-redis (×1)',    cpuReq: '100m', cpuLim: '250m',  memReq: '128Mi', memLim: '256Mi',  notes: 'Azure Cache for Redis in prod' },
    { name: 'alerthive-postgres (×1)', cpuReq: '250m', cpuLim: '1000m', memReq: '512Mi', memLim: '2Gi',   notes: 'Azure PostgreSQL Flexible in prod' },
    { name: 'alerthive-kafka (×1)',    cpuReq: '250m', cpuLim: '500m',  memReq: '512Mi', memLim: '1Gi',   notes: 'Azure Event Hubs in prod' },
    { name: 'alerthive-zookeeper (×1)',cpuReq: '100m', cpuLim: '250m',  memReq: '256Mi', memLim: '512Mi', notes: 'Not needed with Event Hubs' },
  ];

  const C = (s, w) => String(s).padEnd(w);
  console.log(C('Component', 28) + C('CPU req', 10) + C('CPU lim', 10) + C('Mem req', 10) + C('Mem lim', 10) + 'Notes');
  console.log('─'.repeat(95));
  for (const c of components) {
    console.log(C(c.name, 28) + C(c.cpuReq, 10) + C(c.cpuLim, 10) + C(c.memReq, 10) + C(c.memLim, 10) + c.notes);
  }

  // Totals for 3 API pods scenario
  console.log('\n  Totals for full cluster (3 API + 1 each of Redis/PG/Kafka/Zoo):');
  console.log('    CPU  requests : ~1.45 vCPU   |  limits : ~3.5 vCPU');
  console.log('    Mem  requests : ~1.92 GiB    |  limits : ~5.5 GiB');
  console.log('\n  Recommended AKS node pool:');
  console.log('    VM SKU   : Standard_D2s_v5  (2 vCPU, 8 GB RAM)');
  console.log('    Count    : 3 nodes (one API pod per node via podAntiAffinity)');
  console.log('    OS disk  : 30 GiB Ephemeral SSD');
  console.log('    Node pool: System + User combined (cost optimisation for demo)');
  console.log('    HPA      : min=3, max=10 — scales at 65% CPU / 75% memory\n');
}

// ── Throughput Projections ────────────────────────────────────────────────────
function printThroughputProjections() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              THROUGHPUT PROJECTIONS (3-pod cluster)                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const rows = [
    { scenario: 'Smoke (2 vUsers)',           rpsPerPod:  15, pods: 3, totalRps:  45, p95: '< 80ms',  p99: '< 150ms' },
    { scenario: 'Normal load (50 vUsers)',     rpsPerPod:  60, pods: 3, totalRps: 180, p95: '< 200ms', p99: '< 400ms' },
    { scenario: 'Peak (100 vUsers)',           rpsPerPod:  80, pods: 3, totalRps: 240, p95: '< 350ms', p99: '< 700ms' },
    { scenario: 'Spike (200 vUsers)',          rpsPerPod:  70, pods: 3, totalRps: 210, p95: '< 600ms', p99: '< 1200ms'},
    { scenario: 'HPA scaled (200 vU → 8 pods)',rpsPerPod:  70, pods: 8, totalRps: 560, p95: '< 300ms', p99: '< 600ms' },
  ];

  const C = (s, w) => String(s).padEnd(w);
  console.log(C('Scenario', 38) + C('RPS/pod', 10) + C('Pods', 8) + C('Total RPS', 12) + C('p95', 12) + 'p99');
  console.log('─'.repeat(90));
  for (const r of rows) {
    console.log(C(r.scenario, 38) + C(r.rpsPerPod, 10) + C(r.pods, 8) + C(r.totalRps, 12) + C(r.p95, 12) + r.p99);
  }

  console.log('\n  Notes:');
  console.log('  • RPS figures assume Redis cache hit rate ≥ 70% for read endpoints');
  console.log('  • PostgreSQL connection pool: 5 connections per pod (15 total / 3 pods)');
  console.log('  • Kafka publishing is async (fire-and-forget) – no latency impact on API');
  console.log('  • WebSocket connections: ~1,000 concurrent (one per browser tab)');
  console.log('  • Run `npm run perf:bench` against your live API to get real numbers\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n');
console.log('███████████████████████████████████████████████████████████████████████');
console.log('  ALERTHIVE – INFRASTRUCTURE COST ANALYSIS & PERFORMANCE SIZING');
console.log(`  Region: ${region.toUpperCase()}  |  Tier: ${tier.toUpperCase()}  |  Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`);
console.log('███████████████████████████████████████████████████████████████████████\n');

printSizingTable();
printThroughputProjections();

// ── AKS Cost ──────────────────────────────────────────────────────────────────
const aks = calcAKS();
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║              OPTION A: AZURE KUBERNETES SERVICE (AKS)              ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
console.log('  Monthly breakdown (Pay-as-You-Go vs 1-Year Reserved):\n');

const C = (s, w) => String(s).padEnd(w);
for (const [label, amount] of Object.entries(aks.breakdown)) {
  const onDemandLabel = label.includes('on-demand') ? ` → $${amount}` : '';
  const reservedLabel = label.includes('reserved')  ? ` → $${amount}` : '';
  if (!label.includes('reserved') && !label.includes('on-demand')) {
    console.log(`  ${C(label, 52)} $${amount}`);
  } else {
    console.log(`  ${label.substring(0, 52).padEnd(52)} $${amount}`);
  }
}

console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
console.log(`  │  Monthly (pay-as-you-go)   : $${String(aks.totalOnDemand).padStart(8)}                 │`);
console.log(`  │  Monthly (1-yr reserved)   : $${String(aks.totalReserved).padStart(8)}  ← RECOMMENDED  │`);
console.log(`  │  Annual  (pay-as-you-go)   : $${String(aks.annualOnDemand).padStart(8)}                 │`);
console.log(`  │  Annual  (1-yr reserved)   : $${String(aks.annualReserved).padStart(8)}                 │`);
console.log('  └─────────────────────────────────────────────────────────────┘\n');

console.log('  Cost optimisation tips:');
console.log('  ✓ Use 1-year reserved instances → saves ~40% on VM costs');
console.log('  ✓ Enable cluster autoscaler → scale to 1 node overnight / weekends');
console.log('  ✓ Use Spot node pool for non-critical batch/background jobs');
console.log('  ✓ Azure PostgreSQL Flexible Server + zone-redundant HA already included');
console.log('  ✓ Azure Event Hubs replaces self-hosted Kafka ($0 zookeeper overhead)\n');

// ── On-Prem Cost ──────────────────────────────────────────────────────────────
const onp = calcOnPrem();
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║              OPTION B: ON-PREMISES / SELF-HOSTED                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
console.log(`  One-time CapEx (hardware purchase)  : $${onp.capexOneTime}\n`);
console.log('  Monthly OpEx breakdown:\n');
for (const [label, amount] of Object.entries(onp.breakdown)) {
  console.log(`  ${C(label, 52)} $${amount}`);
}

console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
console.log(`  │  Initial capital expenditure       : $${String(onp.capexOneTime).padStart(8)}                 │`);
console.log(`  │  Monthly operating cost            : $${String(onp.totalMonthly).padStart(8)}                 │`);
console.log(`  │  Annual operating cost             : $${String(onp.totalAnnual).padStart(8)}                  │`);
console.log(`  │  Labour alone (annual)             : $${String(onp.labourSubtotal).padStart(8)}                 │`);
console.log('  └─────────────────────────────────────────────────────────────┘\n');

console.log(`  Note: ${onp.note}\n`);

// ── Side-by-Side Comparison ───────────────────────────────────────────────────
const aksMonthly   = parseFloat(aks.totalReserved);
const onpMonthly   = parseFloat(onp.totalMonthly);
const aksAnnual    = parseFloat(aks.annualReserved);
const onpAnnual    = parseFloat(onp.totalAnnual);
const onpCapex     = parseFloat(onp.capexOneTime);
const onpYear1     = onpCapex + onpAnnual;

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                  SIDE-BY-SIDE COMPARISON                           ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
console.log(C('', 38) + C('AKS (reserved)', 20) + 'On-Premises');
console.log('─'.repeat(70));
console.log(C('Monthly cost',                38) + C(`$${aksMonthly.toFixed(0)}`,    20) + `$${onpMonthly.toFixed(0)}`);
console.log(C('Annual cost',                 38) + C(`$${aksAnnual.toFixed(0)}`,     20) + `$${onpAnnual.toFixed(0)}`);
console.log(C('Year 1 total (incl. capex)',  38) + C(`$${aksAnnual.toFixed(0)}`,     20) + `$${onpYear1.toFixed(0)}`);
console.log(C('Year 3 total',                38) + C(`$${(aksAnnual * 3).toFixed(0)}`, 20) + `$${(onpAnnual * 3 + onpCapex).toFixed(0)}`);
console.log(C('Year 5 total',                38) + C(`$${(aksAnnual * 5).toFixed(0)}`, 20) + `$${(onpAnnual * 5 + onpCapex).toFixed(0)}`);
console.log(C('Setup time',                  38) + C('< 1 day (IaC)',      20) + '2-4 weeks');
console.log(C('Ops burden',                  38) + C('Low (managed)',       20) + 'High (self-managed)');
console.log(C('DR / HA',                     38) + C('Built-in (zones)',    20) + 'Manual / extra cost');
console.log(C('Scale to 10 pods',            38) + C('~2 min (HPA)',        20) + 'Buy more hardware');
console.log(C('Compliance (SOC2/ISO27001)',   38) + C('Azure certified',     20) + 'Self-certify');

const breakEvenMonths = Math.ceil(onpCapex / (aksMonthly - onpMonthly));
if (breakEvenMonths > 0 && breakEvenMonths <= 60) {
  console.log(`\n  Break-even point: On-prem becomes cheaper after ~${breakEvenMonths} months (${Math.ceil(breakEvenMonths/12)} years)`);
  console.log('  (Only relevant if you plan to run this for 3-5+ years with stable load)\n');
} else {
  console.log('\n  At this scale, AKS (reserved) is cost-competitive vs on-premises.\n');
}

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                    RECOMMENDATION                                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
console.log('  For AlertHive at FedEx/enterprise scale:\n');
console.log('  1. START  → AKS with 1-yr reserved D2s_v5 nodes');
console.log('              Managed PostgreSQL Flexible Server (zone-redundant HA)');
console.log('              Azure Cache for Redis Standard C1');
console.log('              Azure Event Hubs Standard (Kafka-compatible)\n');
console.log('  2. SCALE  → Enable cluster autoscaler + HPA (min=3, max=10)');
console.log('              Add read replica for PostgreSQL (Analytics queries)');
console.log('              Upgrade Redis to P1 Premium (6 GB, replication)\n');
console.log('  3. MATURE → Multi-region Active-Active (East US + West Europe)');
console.log('              Azure Front Door for global load balancing + WAF');
console.log('              Cosmos DB for global data distribution\n');
console.log(`  Estimated monthly cost at launch (3 pods): $${aksMonthly.toFixed(0)}/month`);
console.log(`  Estimated annual cost at launch:           $${aksAnnual.toFixed(0)}/year`);
console.log('\n███████████████████████████████████████████████████████████████████████\n');
