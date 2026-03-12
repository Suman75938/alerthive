import { Kafka, Producer, logLevel } from 'kafkajs';
import { logger } from '../utils/logger';

let producer: Producer | null = null;
let kafkaAvailable = false;

const kafka = new Kafka({
  clientId: 'alerthive-api',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  // Use NOTHING to suppress internal KafkaJS noise — we handle errors ourselves
  logLevel: logLevel.NOTHING,
  connectionTimeout: 3000,
  requestTimeout: 5000,
  retry: {
    initialRetryTime: 300,
    retries: 1, // fail fast in dev; set higher in production via env
  },
});

export function isKafkaAvailable(): boolean {
  return kafkaAvailable;
}

export async function connectKafkaProducer(): Promise<void> {
  try {
    producer = kafka.producer({
      idempotent: false,
      allowAutoTopicCreation: true,
    });

    await producer.connect();
    kafkaAvailable = true;
    logger.info('✅  Kafka producer connected');
  } catch (err) {
    logger.warn('⚠️  Kafka unavailable – running in demo mode (events will not be published)');
    producer = null;
    kafkaAvailable = false;
  }
}

export async function publishEvent(topic: string, key: string, value: object): Promise<void> {
  if (!producer || !kafkaAvailable) return;

  try {
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
    logger.debug({ msg: `[Kafka] Published to ${topic}`, key });
  } catch (err) {
    logger.warn({ msg: `[Kafka] Failed to publish to ${topic}`, err: (err as Error).message });
  }
}

export async function disconnectKafkaProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
    kafkaAvailable = false;
    logger.info('Kafka producer disconnected');
  }
}

export { kafka };
