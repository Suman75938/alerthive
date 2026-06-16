const http = require('http');

const LOGIN_BODY = JSON.stringify({
  email: 'suman.chakraborty@fedex.com',
  password: 'admin123',
  orgSlug: 'fedex-ito',
});

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 4000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; process.stdout.write(c); });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('\n=== LOGIN ===');
  const login = await post('/api/v1/auth/login', LOGIN_BODY);
  const token = JSON.parse(login.body)?.data?.accessToken;
  if (!token) { console.error('Login failed'); process.exit(1); }
  console.log('\n\nToken acquired ✅\n');

  console.log('=== TEST 1: Simple question (no tools expected) ===');
  const t1start = Date.now();
  await post('/api/v1/chat',
    JSON.stringify({ messages: [{ role: 'user', content: 'What is AlertHive in one sentence?' }] }),
    { Authorization: `Bearer ${token}` }
  );
  console.log(`\n\nTime: ${Date.now() - t1start}ms\n`);

  console.log('=== TEST 2: Live data query (tool use expected) ===');
  const t2start = Date.now();
  await post('/api/v1/chat',
    JSON.stringify({ messages: [{ role: 'user', content: 'Show me open alerts' }] }),
    { Authorization: `Bearer ${token}` }
  );
  console.log(`\n\nTime: ${Date.now() - t2start}ms\n`);
}

main().catch(console.error);
