// THROWAWAY: replaced by the real ingest route
import cors from 'cors';
import { Router } from 'express';
import express from 'express';
import { normalizePath } from '@cf/shared';
import { getDb } from '../db.js';

export const eventsRouter = Router();

eventsRouter.options('/api/events', cors({ origin: '*' }));
eventsRouter.post(
  '/api/events',
  cors({ origin: '*' }),
  express.text({ type: 'text/plain', limit: '100kb' }),
  express.json({ limit: '100kb' }),
  async (req, res) => {
  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON payload' } });
      return;
    }
  }

  const rawEvents = Array.isArray(payload?.events) ? payload.events : [];
  const receivedAt = new Date();

  interface RawEvent {
    url?: string;
    [key: string]: unknown;
  }

  const docs = rawEvents.map((raw: unknown) => {
    const event = (raw && typeof raw === 'object' ? raw : {}) as RawEvent;
    let path = typeof event.url === 'string' ? event.url : '';
    if (typeof event.url === 'string') {
      try {
        path = normalizePath(event.url);
      } catch {
        path = event.url;
      }
    }
    return {
      ...event,
      path,
      received_at: receivedAt,
      src: 'live',
    };
  });

  if (docs.length > 0) {
    const db = getDb();
    await db.collection('events').insertMany(docs, { ordered: false });
  }

  res.status(202).json({ accepted: docs.length });
});
