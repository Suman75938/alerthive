// Simple WS listener for AlertHive (copied into alerthive-api/tools)
// Load env via -r dotenv/config when running from alerthive-api
const crypto = require('crypto');
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');

(async function(){
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'admin' } });
  if(!user){ console.error('Admin user not found'); process.exit(1); }
  // Create a simple HS256 JWT without external deps
  function base64url(input){ return Buffer.from(JSON.stringify(input)).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now()/1000);
  const payload = { sub: user.id, orgId: user.orgId, iat: now, exp: now + 3600 };
  const unsigned = base64url(header) + '.' + base64url(payload);
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(unsigned).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const token = unsigned + '.' + sig;
  const ws = new WebSocket('ws://localhost:4000/ws?token=' + token);
  ws.on('open', () => console.log('WS open'));
  ws.on('message', (m) => console.log('MSG', m.toString()));
  ws.on('close', () => { console.log('WS closed'); process.exit(0); });
  ws.on('error', (e) => { console.error('WS error', e.message); process.exit(1); });
  // keep alive
  setInterval(()=>{}, 1000);
})();
