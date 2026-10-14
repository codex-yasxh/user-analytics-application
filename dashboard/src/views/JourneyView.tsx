import { useParams, Link } from 'react-router-dom';
import { useApi } from '../useApi.js';
import type { SessionEventsResponse } from '../api.js';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  WakingBanner,
} from '../components/SharedStates.js';

function formatElapsed(startTs: number, currentTs: string): string {
  try {
    const elapsedSec = Math.max(
      0,
      Math.floor((new Date(currentTs).getTime() - startTs) / 1000),
    );
    if (elapsedSec < 60) return `+${elapsedSec}s`;
    const min = Math.floor(elapsedSec / 60);
    const sec = elapsedSec % 60;
    return `+${min}m ${sec}s`;
  } catch {
    return '+0s';
  }
}

export function JourneyView() {
  const { id } = useParams<{ id: string }>();
  const endpoint = id ? `/api/sessions/${id}/events` : null;
  const { data, loading, waking, error, reload } =
    useApi<SessionEventsResponse>(endpoint);

  const startTimestamp =
    data && data.events.length > 0 ? new Date(data.events[0].ts).getTime() : 0;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/sessions"
          style={{
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginBottom: '0.75rem',
          }}
        >
          &larr; Back to Sessions
        </Link>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '0 0 0.25rem 0',
          }}
        >
          Session Journey
        </h2>
        <div
          style={{
            color: '#4b5563',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
          }}
        >
          ID: {id}
        </div>
      </div>

      {waking && <WakingBanner />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {loading && !data && (
        <LoadingState message="Loading session journey..." />
      )}

      {data && data.truncated && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          <strong>Notice:</strong> This session contains over 1,000 events.
          Display is capped at the first 1,000 events.
        </div>
      )}

      {data && data.events.length === 0 && (
        <EmptyState
          title="No events found"
          description="This session has no recorded events."
        />
      )}

      {data && data.events.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          {/* Vertical line connecting events */}
          <div
            style={{
              position: 'absolute',
              left: '15px',
              top: '12px',
              bottom: '12px',
              width: '2px',
              backgroundColor: '#e5e7eb',
            }}
          />

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {data.events.map((event, index) => {
              const isPageView = event.type === 'page_view';
              const elapsed = formatElapsed(startTimestamp, event.ts);

              return (
                <div
                  key={event.eid || index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    position: 'relative',
                  }}
                >
                  {/* Event marker icon */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-2rem',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isPageView ? '#3b82f6' : '#10b981',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      boxShadow: '0 0 0 3px #ffffff',
                    }}
                    title={isPageView ? 'Page View' : 'Click'}
                  >
                    {isPageView ? 'P' : 'C'}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: isPageView ? '#2563eb' : '#059669',
                        }}
                      >
                        {isPageView ? 'Page View' : 'Click'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          fontFamily: 'monospace',
                        }}
                      >
                        {elapsed} ({new Date(event.ts).toLocaleTimeString()})
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: '#111827',
                        wordBreak: 'break-all',
                      }}
                    >
                      {event.path || event.url}
                    </div>

                    {!isPageView && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px dashed #f3f4f6',
                          fontSize: '0.75rem',
                          color: '#4b5563',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        {event.x !== undefined && event.y !== undefined && (
                          <div>
                            <strong>Coords:</strong> ({event.x}, {event.y})
                          </div>
                        )}
                        {event.doc_w && event.doc_h && (
                          <div>
                            <strong>Doc:</strong> {event.doc_w} &times;{' '}
                            {event.doc_h}
                          </div>
                        )}
                        {event.sel && (
                          <div>
                            <strong>Target:</strong>{' '}
                            <code
                              style={{
                                backgroundColor: '#f3f4f6',
                                padding: '0.125rem 0.25rem',
                                borderRadius: '3px',
                              }}
                            >
                              {event.sel}
                            </code>
                          </div>
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
