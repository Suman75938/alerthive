import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config';
import { logger } from './utils/logger';
import { connectDB, disconnectDB } from './db/prisma';
import { initWebSocket } from './websocket';
import { apiLimiter } from './middleware/rateLimiter';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import routes from './routes';
import { connectRedis, disconnectRedis } from './config/redis';
import { connectKafkaProducer, disconnectKafkaProducer, isKafkaAvailable } from './config/kafka';
import { startKafkaConsumer, stopKafkaConsumer } from './messaging/kafkaConsumer';

const app = express();

// ── Security & parsing ─────────────────────────────────────────
app.set('trust proxy', 1); // required behind nginx/load balancer
app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP request logging ───────────────────────────────────────
app.use(
  morgan(config.env === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

// ── Rate limiting ──────────────────────────────────────────────
app.use(config.apiBase, apiLimiter);

// ── API routes ─────────────────────────────────────────────────
app.use(config.apiBase, routes);

// ── Error handling ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── HTTP + WebSocket server ────────────────────────────────────
const server = http.createServer(app);
initWebSocket(server);

async function start() {
  await connectDB();

  // Connect Redis & Kafka in parallel – both optional; app runs without them
  await Promise.all([
    connectRedis(config.redis.url),
    connectKafkaProducer(),
  ]);
  // Only start consumer if the Kafka producer connected successfully
  if (isKafkaAvailable()) {
    await startKafkaConsumer();
  } else {
    logger.info('⏭️  Kafka consumer skipped (broker unavailable)');
  }

  server.listen(config.port, () => {
    logger.info(`🚀  AlertHive API listening on http://localhost:${config.port}${config.apiBase}`);
  });
}

// ── Graceful shutdown ──────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`${signal} received – shutting down gracefully`);
  server.close(async () => {
    await Promise.all([
      disconnectDB(),
      disconnectRedis(),
      disconnectKafkaProducer(),
      stopKafkaConsumer(),
    ]);
    process.exit(0);
  });
  // Force-kill if graceful shutdown takes too long
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start().catch((err) => {
  logger.error({ err, msg: 'Failed to start server' });
  process.exit(1);
});

export { app };
