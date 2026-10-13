import cors from 'cors';
import express, { type Request, type Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { MongoBulkWriteError, type Db, type Document } from 'mongodb';
import { BODY_LIMIT, batchEnvelopeSchema } from '@cf/shared';
import { buildDocs } from '../services/build-docs.js';
import type { Config } from '../config.js';

export interface EventsRouterOptions {
  db: Db;
  config: Config;
}

export function createEventsRouter({ db, config }: EventsRouterOptions): Router {
  const router = Router();

  const limiter = config.RATE_LIMIT_ENABLED
    ? rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
          res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded, please retry later',
            },
          });
        },
      })
    : (_req: Request, _res: Response, next: () => void) => next();

  router.options('/api/events', cors({ origin: '*' }));

  router.post(
    '/api/events',
    cors({ origin: '*' }),
    limiter,
    express.text({ type: 'text/plain', limit: BODY_LIMIT }),
    express.json({ limit: BODY_LIMIT }),
    async (req: Request, res: Response) => {
      if (!config.INGEST_ENABLED) {
        res.status(503).json({
          error: {
            code: 'INGEST_DISABLED',
            message: 'Event ingestion is currently disabled',
          },
        });
        return;
      }

      let payload = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          res.status(400).json({
            error: {
              code: 'BAD_REQUEST',
              message: 'Invalid JSON payload in request body',
            },
          });
          return;
        }
      }

      const envelopeResult = batchEnvelopeSchema.safeParse(payload);
      if (!envelopeResult.success) {
        res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid batch envelope. Expected { events: [1..50] }',
          },
        });
        return;
      }

      const receivedAt = new Date();
      const { docs, rejected: validationRejected } = buildDocs(
        envelopeResult.data.events,
        receivedAt,
      );

      if (docs.length === 0) {
        res.status(202).json({
          accepted: 0,
          duplicates: 0,
          rejected: validationRejected,
        });
        return;
      }

      try {
        const result = await db.collection('events').insertMany(docs as unknown as Document[], { ordered: false });
        res.status(202).json({
          accepted: result.insertedCount,
          duplicates: 0,
          rejected: validationRejected,
        });
      } catch (err: unknown) {
        if (err instanceof MongoBulkWriteError || (err && typeof err === 'object' && (err as { name?: string }).name === 'MongoBulkWriteError')) {
          const bulkError = err as MongoBulkWriteError;
          const accepted = bulkError.result?.insertedCount ?? 0;
          let duplicates = 0;
          let writeErrorsCount = 0;
          const writeErrors = Array.isArray(bulkError.writeErrors) ? bulkError.writeErrors : [];

          for (const writeError of writeErrors) {
            if (writeError.code === 11000) {
              duplicates += 1;
            } else {
              writeErrorsCount += 1;
            }
          }

          res.status(202).json({
            accepted,
            duplicates,
            rejected: validationRejected + writeErrorsCount,
          });
          return;
        }

        res.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database unavailable for write',
          },
        });
      }
    },
  );

  return router;
}
