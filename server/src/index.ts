import type { Server } from 'node:http';
import { pino } from 'pino';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { closeDb, connectDb } from './db.js';

export const config = loadConfig();

export const logger = pino({
  level: config.LOG_LEVEL,
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
      const db = await connectDb(config.MONGO_URL);
      logger.info('Connected to MongoDB on startup');
      const app = createApp({ db, config });
      server = app.listen(config.PORT, () => {
        logger.info({ port: config.PORT }, `Server listening on port ${config.PORT}`);
      });
    } catch (err) {
      logger.error({ err }, 'Failed to start server');
      process.exit(1);
    }
  })();
}
