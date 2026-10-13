import type { Server } from 'node:http';
import express from 'express';
import { pino } from 'pino';
import { loadConfig } from './config.js';
import { closeDb, connectDb, pingDb } from './db.js';

export const config = loadConfig();

export const logger = pino({
  level: config.LOG_LEVEL,
});

export const app = express();

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', async (_req, res) => {
  const isReady = await pingDb(config.MONGO_URL);
  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database ping failed',
      },
    });
  }
});

let server: Server | null = null;

const shutdown = async (signal: string) => {
  logger.info({ signal }, `Received ${signal}, shutting down...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await closeDb();
      process.exit(0);
    });
  } else {
    await closeDb();
    process.exit(0);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  void (async () => {
    try {
      await connectDb(config.MONGO_URL);
      logger.info('Connected to MongoDB on startup');
    } catch (err) {
      logger.warn({ err }, 'Initial MongoDB connection failed; server will continue and retry on probe');
    }

    server = app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, `Server listening on port ${config.PORT}`);
    });
  })();
}
