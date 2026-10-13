import express from 'express';
import { pino } from 'pino';
import { loadConfig } from './config.js';

const config = loadConfig();

export const logger = pino({
  level: config.LOG_LEVEL,
});

export const app = express();

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, `Server listening on port ${config.PORT}`);
  });
}
