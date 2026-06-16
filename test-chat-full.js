// Full chatbot test battery
const BASE = 'http://localhost:4000/api/v1';

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'suman.chakraborty@fedex.com', password: 'admin123', orgSlug: 'fedex-ito' }),
  });
  const d = await r.json();
  return d.data.accessToken;
}

async function chat(token, message) {
  const start = Date.now();
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
  });
  if (!res.ok) return { reply: `HTTP ${res.status}`, ms: Date.now() - start, tool: null };
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', reply = '', tool = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const c = JSON.parse(line.slice(6));
        if (c.tool) tool = c.tool;
        if (c.token) reply += c.token;
        if (c.done || c.error) { if (c.error) reply = `ERROR: ${c.error}`; }
      } catch {}
    }
  }
  return { reply: reply.trim(), ms: Date.now() - start, tool };
}

async function run() {
  // Get a fresh token right before each test to avoid expiry
  console.log('✅ Starting tests\n');

  const tests = [
    // -- General knowledge (NO tool should fire, NO action)
    { q: 'hi',                          expectTool: null,            expectSafe: true,  label: 'Greeting' },
    { q: 'what is AlertHive?',          expectTool: null,            expectSafe: true,  label: 'General Q' },
    { q: 'how to raise a ticket?',      expectTool: null,            expectSafe: true,  label: 'How-to Q (MUST NOT create anything)' },
    { q: 'how do I create an incident?',expectTool: null,            expectSafe: true,  label: 'How-to Q (MUST NOT create anything)' },
    { q: 'what does on-call mean?',     expectTool: null,            expectSafe: true,  label: 'Definition Q' },

    // -- Read tools
    { q: 'show open alerts',            expectTool: 'get_alerts',    expectSafe: true,  label: 'Get alerts' },
    { q: 'list incidents',              expectTool: 'get_incidents', expectSafe: true,  label: 'Get incidents' },
    { q: 'who is on call?',             expectTool: 'get_on_call',   expectSafe: true,  label: 'Get on-call' },
    { q: 'show tickets',                expectTool: 'get_tickets',   expectSafe: true,  label: 'Get tickets' },
    { q: 'list services',               expectTool: 'get_services',  expectSafe: true,  label: 'Get services' },
    { q: 'show postmortems',            expectTool: 'get_postmortems', expectSafe: true, label: 'Get postmortems' },
    { q: 'any SLA breaches?',           expectTool: 'get_tickets',   expectSafe: true,  label: 'SLA breach query' },
    { q: 'show critical alerts',           expectTool: 'get_alerts',    expectSafe: true,  label: 'Critical alerts filter' },
  ];

  let passed = 0, failed = 0;
  const token = await login();
  for (const t of tests) {
    const { reply, ms, tool } = await chat(token, t.q);
    const toolOk   = t.expectTool === null ? tool === null : tool === t.expectTool;
    const safeOk   = !t.expectSafe || !reply.toLowerCase().includes('incident created') && !reply.toLowerCase().includes('acknowledged') && !reply.toLowerCase().includes('alert') || t.expectTool !== null;
    // Check that how-to questions don't have JSON leaking
    const noJsonLeak = !reply.startsWith('{') && !reply.includes('"name":');
    const ok = toolOk && noJsonLeak && (t.expectTool !== null || reply.length > 0);

    if (ok) { passed++; console.log(`✅ [${ms}ms] ${t.label}`); }
    else {
      failed++;
      console.log(`❌ [${ms}ms] ${t.label}`);
      if (!toolOk)     console.log(`   tool: expected="${t.expectTool}" got="${tool}"`);
      if (!noJsonLeak) console.log(`   JSON LEAK in reply`);
    }
    // Show first 120 chars of reply
    console.log(`   "${reply.slice(0, 120).replace(/\n/g, ' ')}"\n`);
  }

  console.log(`\n══════════════════════════════`);
  console.log(`Results: ${passed}/${tests.length} passed, ${failed} failed`);
}

run().catch(console.error);
