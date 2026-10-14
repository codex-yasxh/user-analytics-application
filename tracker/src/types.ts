export type TrackedEvent = {
  eid: string;
  session_id: string;
  type: 'page_view' | 'click';
  url: string;
  ts: string;
  vw: number;
  vh: number;
  x?: number;
  y?: number;
  doc_w?: number;
  doc_h?: number;
  sel?: string;
};

export type TrackerStatus = {
  readonly sessionId: string;
  readonly status: 'active' | 'paused';
  readonly eventsQueued: number;
  readonly eventsSent: number;
  readonly lastFlush: string | null;
  enable: () => void;
};
