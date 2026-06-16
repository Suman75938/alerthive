const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 11434, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Test without tools ===');
  const r1 = await post('/api/chat', {
    model: 'llama3.2:3b',
    messages: [{ role: 'user', content: 'Say OK' }],
    stream: false,
    options: { num_predict: 5 }
  });
  console.log('Status:', r1.status);
  console.log('Body:', r1.body.substring(0, 200));

  console.log('\n=== Test WITH tools ===');
  const r2 = await post('/api/chat', {
    model: 'llama3.2:3b',
    messages: [{ role: 'user', content: 'Show open alerts' }],
    stream: false,
    tools: [{ type: 'function', function: { name: 'get_alerts', description: 'Get alerts', parameters: { type: 'object', properties: {} } } }],
    options: { num_predict: 50 }
  });
  console.log('Status:', r2.status);
  console.log('Body:', r2.body.substring(0, 500));
}

main().catch(console.error);
