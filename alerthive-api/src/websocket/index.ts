import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

interface AlertHiveSocket extends WebSocket {
  orgId?: string;
  userId?: string;
  isAlive: boolean;
}

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AlertHiveSocket, req: IncomingMessage) => {
    ws.isAlive = true;

    // Token passed as query param: /ws?token=<accessToken>
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Missing token');
      return;
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret) as { sub: string; orgId: string };
      ws.userId = payload.sub;
      ws.orgId = payload.orgId;
    } catch {
      ws.close(1008, 'Invalid token');
      return;
    }

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('error', (err) => logger.error({ err, msg: 'WebSocket error' }));

    logger.debug({ userId: ws.userId, orgId: ws.orgId, msg: 'WebSocket client connected' });
  });

  // Heartbeat: drop dead connections every 30 seconds
  const interval = setInterval(() => {
    wss?.clients.forEach((client) => {
      const ws = client as AlertHiveSocket;
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(interval));
  logger.info('WebSocket server ready at /ws');
}

/** Broadcast an event to all authenticated clients in the same org */
export function broadcast(orgId: string, payload: { event: string; data: unknown }): void {
  if (!wss) return;
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    const ws = client as AlertHiveSocket;
    if (ws.readyState === WebSocket.OPEN && ws.orgId === orgId) {
      ws.send(message);
    }
  });
}
