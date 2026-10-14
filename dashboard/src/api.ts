export const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000'
).replace(/\/$/, '');

export const DEMO_ORIGIN = (
  import.meta.env.VITE_DEMO_ORIGIN || 'http://localhost:5173'
).replace(/\/$/, '');

export type ResponseCategory = 'ok' | 'waking' | 'error';

export function classifyResponse(
  status: number,
  contentType: string | null,
  elapsedMs: number,
): ResponseCategory {
  if (elapsedMs >= 8000) {
    return 'waking';
  }
  if (status >= 500) {
    return 'waking';
  }
  if (status >= 200 && status < 300) {
    if (!contentType || !contentType.includes('application/json')) {
      return 'waking';
    }
    return 'ok';
  }
  return 'error';
}

export interface SessionItem {
  session_id: string;
  event_count: number;
  first_seen: string;
  last_seen: string;
  entry_path: string;
}

export interface SessionsResponse {
  data: SessionItem[];
  total: number;
  page: number;
  limit: number;
}

export interface TrackedEventItem {
  eid: string;
  session_id: string;
  type: 'page_view' | 'click';
  url: string;
  path: string;
  ts: string;
  vw: number;
  vh: number;
  x?: number;
  y?: number;
  doc_w?: number;
  doc_h?: number;
  sel?: string;
}

export interface SessionEventsResponse {
  session_id: string;
  events: TrackedEventItem[];
  truncated: boolean;
}

export interface PageItem {
  path: string;
  views: number;
  clicks: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  doc_w: number;
  doc_h: number;
  vw: number;
  vh: number;
}

export interface HeatmapResponse {
  path: string;
  bucket: string;
  reference_width: number;
  total: number;
  returned: number;
  points: HeatmapPoint[];
}
