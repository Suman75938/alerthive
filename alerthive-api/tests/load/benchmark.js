#!/usr/bin/env node
/**
 * AlertHive Performance Benchmark Runner
 * ─────────────────────────────────────
 * Uses Node.js built-in http module – no extra dependencies required.
 * Runs 4 scenarios against the live API and produces a structured report.
 *
 * Usage:
 *   node tests/load/benchmark.js [--host http://localhost:4000] [--duration 30]
 *
 * Output:
 *   Console summary + tests/load/results/benchmark-<timestamp>.json
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const _hostIdx = args.indexOf('--host');
const hostArg = args.find(a => a.startsWith('--host='))?.split('=')[1]
             ?? (_hostIdx !== -1 ? args[_hostIdx + 1] : undefined)
             ?? 'http://localhost:4000';
const _durIdx = args.indexOf('--duration');
const durationArg = parseInt(
  args.find(a => a.startsWith('--duration='))?.split('=')[1]
  ?? (_durIdx !== -1 ? args[_durIdx + 1] : undefined)
  ?? '30', 10
);

const BASE = hostArg.replace(/\/$/, '');
const DURATION_MS = durationArg * 1000;
const CONCURRENCY = 20;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve) => {
    const start = Date.now();
    const parsed = new url.URL(BASE + path);
    const lib = parsed.protocol === 'https:' ? https : http;

    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    };

    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, latency, data: json, ok: res.statusCode < 400 });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, latency: Date.now() - start, data: null, ok: false, error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ status: 0, latency: 10000, data: null, ok: false, error: 'timeout' });
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Stats helpers ─────────────────────────────────────────────────────────────
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(idx, sorted.length - 1)];
}

function calcStats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    min:   sorted[0] ?? 0,
    max:   sorted[sorted.length - 1] ?? 0,
    mean:  Math.round(sum / sorted.length) || 0,
    p50:   percentile(sorted, 50),
    p75:   percentile(sorted, 75),
    p95:   percentile(sorted, 95),
    p99:   percentile(sorted, 99),
  };
}

const BENCH_ORG  = 'benchmark-org';
const BENCH_EMAIL = 'bench@alerthive.io';
const BENCH_PASS  = 'Bench@123!';

// ── Get auth token (signup if org/user doesn't exist, then login) ─────────────
async function getToken() {
  // Try signup first (idempotent – fails gracefully if user already exists)
  await request('POST', '/api/v1/auth/signup', {
    name:    'Benchmark User',
    email:   BENCH_EMAIL,
    password: BENCH_PASS,
    orgSlug: BENCH_ORG,
    orgName: 'Benchmark Org',
  });
  // Now login regardless of signup result
  const res = await request('POST', '/api/v1/auth/login', {
    email:   BENCH_EMAIL,
    password: BENCH_PASS,
    orgSlug: BENCH_ORG,
  });
  if (!res.ok || !res.data?.data?.accessToken) {
    throw new Error(`Auth failed: status=${res.status} error=${res.error ?? JSON.stringify(res.data)}`);
  }
  return res.data.data.accessToken;
}

// ── Scenario runner ───────────────────────────────────────────────────────────
async function runScenario(name, scenarioFn, token, durationMs, concurrency) {
  const results = [];
  const endTime = Date.now() + durationMs;
  let active = 0;
  let errors = 0;
  let total  = 0;

  process.stdout.write(`  Running: ${name} ...`);

  return new Promise((resolve) => {
    const tick = async () => {
      while (active < concurrency && Date.now() < endTime) {
        active++;
        (async () => {
          try {
            const sub = await scenarioFn(token);
            results.push(...sub.latencies);
            errors += sub.errors;
            total  += sub.total;
          } finally {
            active--;
            if (Date.now() < endTime) tick();
            else if (active === 0) finish();
          }
        })();
      }
      if (Date.now() >= endTime && active === 0) finish();
    };

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const stats = calcStats(results);
      const rps   = Math.round((total / durationMs) * 1000);
      const errPct = total ? ((errors / total) * 100).toFixed(2) : '0.00';
      process.stdout.write(` done\n`);
      resolve({ name, total, errors, errorPct: parseFloat(errPct), rps, stats });
    };

    tick();
    // Fallback: resolve after duration + 5s grace
    setTimeout(finish, durationMs + 5000);
  });
}

// ── Individual scenario functions ─────────────────────────────────────────────
async function scenarioListAlerts(token) {
  const r1 = await request('GET', '/api/v1/alerts?page=1&pageSize=20', null, token);
  const r2 = await request('GET', '/api/v1/incidents?page=1&pageSize=20', null, token);
  const r3 = await request('GET', '/api/v1/analytics/alerts', null, token);
  const all = [r1, r2, r3];
  return {
    latencies: all.map(r => r.latency),
    errors:    all.filter(r => !r.ok).length,
    total:     all.length,
  };
}

async function scenarioCreateAlert(token) {
  const r = await request('POST', '/api/v1/alerts', {
    title:    `Benchmark alert ${Date.now()}`,
    message:  'CPU spike – benchmark generated',
    source:   'Benchmark',
    priority: 'high',
    tags:     ['benchmark'],
  }, token);
  return { latencies: [r.latency], errors: r.ok ? 0 : 1, total: 1 };
}

async function scenarioCreateIncident(token) {
  const r = await request('POST', '/api/v1/incidents', {
    title:       `Benchmark incident ${Date.now()}`,
    description: 'Auto-created by benchmark runner',
    priority:    'high',
  }, token);
  return { latencies: [r.latency], errors: r.ok ? 0 : 1, total: 1 };
}

async function scenarioHealthCheck(_token) {
  const r = await request('GET', '/api/v1/health', null, null);
  return { latencies: [r.latency], errors: r.ok ? 0 : 1, total: 1 };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  AlertHive API – Performance Benchmark');
  console.log(`  Target : ${BASE}`);
  console.log(`  Duration per scenario : ${durationArg}s`);
  console.log(`  Concurrency : ${CONCURRENCY} workers`);
  console.log('════════════════════════════════════════════════════════\n');

  // 1. Verify API is reachable
  console.log('[1/5] Checking API health...');
  const health = await request('GET', '/api/v1/health', null, null);
  if (!health.ok) {
    console.error(`\n  ❌  API not reachable at ${BASE} (status=${health.status})`);
    console.error('  Make sure the API is running: npm run dev\n');
    process.exit(1);
  }
  console.log(`  ✅  API healthy (${health.latency}ms)\n`);

  // 2. Authenticate
  console.log('[2/5] Authenticating...');
  let token;
  try {
    token = await getToken();
    console.log('  ✅  Auth token obtained\n');
  } catch (err) {
    console.error(`  ❌  ${err.message}\n`);
    process.exit(1);
  }

  // 3. Run scenarios
  console.log('[3/5] Running benchmark scenarios...\n');
  const report = {
    meta: {
      target:      BASE,
      durationSec: durationArg,
      concurrency: CONCURRENCY,
      timestamp:   new Date().toISOString(),
    },
    scenarios: [],
  };

  const scenarios = [
    { name: '01 – Health Check (baseline)',        fn: scenarioHealthCheck     },
    { name: '02 – List Alerts + Incidents (reads)', fn: scenarioListAlerts      },
    { name: '03 – Create Alert (write)',             fn: scenarioCreateAlert     },
    { name: '04 – Create Incident (write + Kafka)',  fn: scenarioCreateIncident  },
  ];

  for (const s of scenarios) {
    const result = await runScenario(s.name, s.fn, token, DURATION_MS, CONCURRENCY);
    report.scenarios.push(result);
  }

  // 4. Print results table
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('════════════════════════════════════════════════════════');
  const col = (s, w) => s.toString().padEnd(w);

  console.log(
    col('Scenario', 42) +
    col('RPS', 6)  +
    col('p50', 7)  +
    col('p95', 7)  +
    col('p99', 7)  +
    col('Err%', 7)
  );
  console.log('─'.repeat(76));

  for (const r of report.scenarios) {
    const errFlag = r.errorPct > 1 ? ' ⚠️' : '';
    const p99Flag = r.stats.p99 > 500 ? ' 🐢' : '';
    console.log(
      col(r.name, 42) +
      col(r.rps, 6)   +
      col(r.stats.p50 + 'ms', 7) +
      col(r.stats.p95 + 'ms', 7) +
      col(r.stats.p99 + 'ms', 7) +
      col(r.errorPct + '%', 7)   +
      errFlag + p99Flag
    );
  }

  // 5. Resource estimation
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  RESOURCE ESTIMATION (based on observed throughput)');
  console.log('════════════════════════════════════════════════════════');

  const totalRps = report.scenarios.reduce((s, r) => s + r.rps, 0);
  const avgP99   = Math.round(
    report.scenarios.reduce((s, r) => s + r.stats.p99, 0) / report.scenarios.length
  );
  const maxErrors = Math.max(...report.scenarios.map(r => r.errorPct));

  console.log(`  Aggregate RPS       : ${totalRps}`);
  console.log(`  Average p99 latency : ${avgP99} ms`);
  console.log(`  Peak error rate     : ${maxErrors}%`);

  let cpuRec = '250m', memRec = '256Mi';
  if (totalRps > 500 || avgP99 > 800) { cpuRec = '1000m'; memRec = '1Gi';  }
  else if (totalRps > 200 || avgP99 > 400) { cpuRec = '500m';  memRec = '512Mi'; }

  console.log(`\n  Recommended per-pod resources:`);
  console.log(`    CPU request/limit  : ${cpuRec}`);
  console.log(`    Memory request/limit: ${memRec}`);
  console.log(`    Replicas (AKS 3 pods): 3`);
  console.log(`    Effective total RPS  : ${totalRps * 3} (3 × ${totalRps})`);

  // 6. Save JSON report
  const outDir = path.join(__dirname, 'results');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `benchmark-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ ...report, resourceRecommendation: { cpuRec, memRec, replicas: 3 } }, null, 2));

  console.log(`\n  📄 Full report saved: ${outFile}`);
  console.log('\n════════════════════════════════════════════════════════\n');
})();
