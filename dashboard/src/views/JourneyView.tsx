import { useParams, Link } from 'react-router-dom';
import { useApi } from '../useApi.js';
import type { SessionEventsResponse } from '../api.js';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  WakingBanner,
} from '../components/SharedStates.js';

function elapsed(startTs: number, currentTs: string): string {
  try {
    const sec = Math.max(
      0,
      Math.floor((new Date(currentTs).getTime() - startTs) / 1000),
    );
    if (sec < 60) return `+${sec}s`;
    const min = Math.floor(sec / 60);
    return `+${min}m ${sec % 60}s`;
  } catch {
    return '+0s';
  }
}

export function JourneyView() {
  const { id } = useParams<{ id: string }>();
  const endpoint = id ? `/api/sessions/${id}/events` : null;
  const { data, loading, waking, error, reload } =
    useApi<SessionEventsResponse>(endpoint);

  const t0 =
    data && data.events.length > 0 ? new Date(data.events[0].ts).getTime() : 0;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link
          to="/sessions"
          style={{
            color: '#9ca3af',
            textDecoration: 'none',
            fontSize: '13px',
            display: 'inline-block',
            marginBottom: '12px',
          }}
        >
          &larr; Sessions
        </Link>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
          }}
        >
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: '#111827',
            }}
          >
            Journey
          </h1>
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '13px',
              color: '#9ca3af',
            }}
          >
            {id?.slice(0, 8)}
          </span>
          {data && (
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              {data.events.length} events
            </span>
          )}
        </div>
      </div>

      {waking && <WakingBanner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <LoadingState message="Loading journey..." />}

      {data && data.truncated && (
        <p
          style={{
            fontSize: '13px',
            color: '#9ca3af',
            margin: '0 0 16px',
          }}
        >
          Showing first 1,000 of {'>'}1,000 events.
        </p>
      )}

      {data && data.events.length === 0 && (
        <EmptyState
          title="No events"
          description="This session has no recorded events."
        />
      )}

      {data && data.events.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: '24px' }}>
          <div
            style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: '1px',
              backgroundColor: '#e5e7eb',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {data.events.map((ev, i) => {
              const isPV = ev.type === 'page_view';
              return (
                <div
                  key={ev.eid || i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    position: 'relative',
                    padding: '8px 0',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '12px',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      backgroundColor: isPV ? '#e5e7eb' : '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: isPV ? '#6b7280' : '#ffffff',
                      boxShadow: '0 0 0 3px #ffffff',
                    }}
                  >
                    {isPV ? 'P' : 'C'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '8px',
                        fontSize: '13px',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ev.path || ev.url}
                      </span>
                      <span
                        style={{
                          color: '#d1d5db',
                          fontSize: '12px',
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {elapsed(t0, ev.ts)}
                      </span>
                    </div>

                    {!isPV && (
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '12px',
                          color: '#9ca3af',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        {ev.x !== undefined && ev.y !== undefined && (
                          <span>
                            {ev.x},{ev.y}
                          </span>
                        )}
                        {ev.vw && ev.vh && (
                          <span>
                            {ev.vw}&times;{ev.vh}
                          </span>
                        )}
                        {ev.sel && (
                          <span
                            style={{
                              fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontSize: '11px',
                              color: '#6b7280',
                            }}
                          >
                            {ev.sel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
