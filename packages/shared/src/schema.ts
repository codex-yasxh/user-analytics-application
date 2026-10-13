import { z } from 'zod';
import { MAX_BATCH, SEL_MAX, X_MAX, Y_MAX } from './constants.js';
import type { ViewportBucket } from './bucket-of.js';

const urlSchema = z.string().refine(
  (val) => {
    try {
      const u = new URL(val);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'URL must have http: or https: protocol' }
);

export const pageViewSchema = z.object({
  eid: z.uuid(),
  session_id: z.uuid(),
  type: z.literal('page_view'),
  url: urlSchema,
  ts: z.string().optional(),
  vw: z.number().positive().finite(),
  vh: z.number().positive().finite(),
});

export const clickSchema = z.object({
  eid: z.uuid(),
  session_id: z.uuid(),
  type: z.literal('click'),
  url: urlSchema,
  ts: z.string().optional(),
  vw: z.number().positive().finite(),
  vh: z.number().positive().finite(),
  x: z.number().min(0).max(X_MAX),
  y: z.number().min(0).max(Y_MAX),
  doc_w: z.number().positive().finite(),
  doc_h: z.number().positive().finite(),
  sel: z.string().max(SEL_MAX).optional(),
});

export const eventSchema = z.discriminatedUnion('type', [
  pageViewSchema,
  clickSchema,
]);

export const batchEnvelopeSchema = z.object({
  events: z.array(z.unknown()).min(1).max(MAX_BATCH),
});

export type PageViewEvent = z.infer<typeof pageViewSchema>;
export type ClickEvent = z.infer<typeof clickSchema>;
export type Event = z.infer<typeof eventSchema>;
export type BatchEnvelope = z.infer<typeof batchEnvelopeSchema>;

export interface BaseStoredEvent {
  _id?: unknown;
  eid: string;
  session_id: string;
  url: string;
  path: string;
  ts: Date;
  received_at: Date;
  src: 'live' | 'seed';
  vw: number;
  vh: number;
  vw_bucket: ViewportBucket;
}

export interface StoredPageViewEvent extends BaseStoredEvent {
  type: 'page_view';
  x?: never;
  y?: never;
  doc_w?: never;
  doc_h?: never;
  sel?: never;
}

export interface StoredClickEvent extends BaseStoredEvent {
  type: 'click';
  x: number;
  y: number;
  doc_w: number;
  doc_h: number;
  sel?: string;
}

export type StoredEvent = StoredPageViewEvent | StoredClickEvent;
