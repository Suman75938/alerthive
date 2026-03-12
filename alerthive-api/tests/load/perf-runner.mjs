/**
 * perf-runner.mjs  –  Artillery performance test launcher
 *
 * Fetches a fresh auth token ONCE, then passes it to Artillery via
 * the ARTILLERY_TOKEN environment variable so scenarios can skip
 * per-user bcrypt login (which saturates the Node.js event loop
 * when many virtual users arrive concurrently).
 *
 * Usage:
 *   node tests/load/perf-runner.mjs load          # load test
 *   node tests/load/perf-runner.mjs spike         # spike test
 *   node tests/load/perf-runner.mjs smoke         # smoke test
 */

import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const SUITE   = process.argv[2] ?? 'load';
const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

const SUITES = {
  smoke: 'tests/load/smoke.yml',
  load:  'tests/load/load.yml',
  spike: 'tests/load/spike.yml',
};

const yamlFile = SUITES[SUITE];
if (!yamlFile) {
  console.error(`Unknown suite: ${SUITE}. Choices: ${Object.keys(SUITES).join(', ')}`);
  process.exit(1);
}

// ── 1. Fetch a fresh token ─────────────────────────────────────────────────
console.log(`\n⚡  Fetching pre-shared auth token from ${API_URL}/auth/login …`);

let token;
try {
  const res = await fetch(`${API_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      email:    'bench@alerthive.io',
      password: 'Bench@123!',
      orgSlug:  'benchmark-org',
    }),
  });
  const body = await res.json();
  if (!body?.data?.accessToken) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  token = body.data.accessToken;
  console.log('✅  Token obtained (expires in 24 h)\n');
} catch (err) {
  console.error('❌  Could not obtain auth token:', err.message);
  console.error('    Make sure the API is running: npm run dev');
  process.exit(1);
}

// ── 2. Launch Artillery with the token as an env var ──────────────────────
console.log(`🚀  Running ${SUITE} test: ${yamlFile}\n`);

const artilleryBin = process.platform === 'win32'
  ? 'node_modules\\.bin\\artillery.cmd'
  : './node_modules/.bin/artillery';

const reportFile = `tests/load/results/${SUITE}-latest.json`;

const env = { ...process.env, ARTILLERY_TOKEN: token };

try {
  execSync(`${artilleryBin} run --output ${reportFile} ${yamlFile}`, { stdio: 'inherit', env });
  console.log(`\n✅  ${SUITE} test PASSED. Report: ${reportFile}`);
} catch {
  // Artillery exits non-zero when ensure thresholds fail – that's expected to
  // surface in CI. We just let the child process print the report.
  console.log(`\n⚠️  ${SUITE} test exited non-zero. Report saved to: ${reportFile}\n    Run: node tests/load/perf-runner.mjs ${SUITE}:summary`);
  process.exit(1);
}
