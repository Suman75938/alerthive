import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  printf(({ level, message, ...meta }) => {
    if (typeof message === 'object' && message !== null) {
      const { msg, ...rest } = message as Record<string, unknown>;
      const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
      return `${level}: ${msg ?? JSON.stringify(message)}${extra}`;
    }
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${level}: ${message}${extra}`;
  }),
);
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: config.log.level,
  format: config.env === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});
