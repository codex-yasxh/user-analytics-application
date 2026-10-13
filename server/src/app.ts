import crypto from 'node:crypto';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { type Db } from 'mongodb';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import type { Config } from './config.js';
import { setDb } from './db.js';
import { eventsRouter } from './routes/events.js';

export interface AppOptions {
  db: Db;
  config: Config;
}

export function createApp({ db, config }: AppOptions): Express {
  setDb(db);
  const app = express();

  // Trust proxy: exactly 1 hop
  app.set('trust proxy', 1);

  // Security headers with helmet
  app.use(helmet());

  // Pino HTTP logger with request IDs and no bodies logged
  app.use(
    pinoHttp({
      logger: pino({ level: config.LOG_LEVEL }),
      genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
      autoLogging: config.LOG_LEVEL !== 'silent',
    }),
  );

  // Ingest route CORS: open to any origin (*)
  app.options('/api/events', cors({ origin: '*' }));
  app.use('/api/events', cors({ origin: '*' }));

  // Read routes CORS: DASHBOARD_ORIGIN only
  const readCors = cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || requestOrigin === config.DASHBOARD_ORIGIN) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  });
  app.use('/api', (req, res, next) => {
    if (req.path === '/events') {
      return next();
    }
    return readCors(req, res, next);
  });

  // Ops routes: /health and /ready
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    try {
      const pingRes = await db.admin().ping();
      if (pingRes.ok) {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database ping failed',
          },
        });
      }
    } catch {
      res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database ping failed',
        },
      });
    }
  });

  // Events ingest router
  app.use(eventsRouter);

  if (process.env.NODE_ENV === 'test') {
    app.get('/_test/error', () => {
      throw new Error('Sensitive internal details');
    });
  }

  // Central 404 handler (JSON error shape)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // Central error handler (hides internals on 500)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const errorObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
    const status =
      typeof errorObj?.status === 'number' && errorObj.status >= 400 && errorObj.status < 600
        ? errorObj.status
        : 500;
    const code =
      typeof errorObj?.code === 'string'
        ? errorObj.code
        : status === 500
          ? 'INTERNAL_SERVER_ERROR'
          : 'ERROR';
    const message =
      status === 500
        ? 'Internal server error'
        : typeof errorObj?.message === 'string'
          ? errorObj.message
          : 'An error occurred';

    res.status(status).json({
      error: {
        code,
        message,
      },
    });
  });

  return app;
}
