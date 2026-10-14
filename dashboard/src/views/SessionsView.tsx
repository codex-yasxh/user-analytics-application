import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../useApi.js';
import type { SessionsResponse } from '../api.js';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  WakingBanner,
} from '../components/SharedStates.js';

function formatRelativeTime(isoDate: string): string {
  try {
    const elapsedSec = Math.floor(
      (Date.now() - new Date(isoDate).getTime()) / 1000,
    );
    if (elapsedSec <= 5) return 'just now';
    if (elapsedSec < 60) return `${elapsedSec}s ago`;
    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin < 60) return `${elapsedMin}m ago`;
    const elapsedHours = Math.floor(elapsedMin / 60);
    if (elapsedHours < 24) return `${elapsedHours}h ago`;
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d ago`;
  } catch {
    return isoDate;
  }
}

function formatTooltipTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return `${d.toLocaleString()} (${isoDate})`;
  } catch {
    return isoDate;
  }
}

export function SessionsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(searchParams.get('limit') || '20', 10)),
  );

  const endpoint = `/api/sessions?page=${page}&limit=${limit}`;
  const { data, loading, waking, error, reload } =
    useApi<SessionsResponse>(endpoint);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const goToPage = (newPage: number) => {
    setSearchParams({ page: String(newPage), limit: String(limit) });
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 0 0.25rem 0',
            }}
          >
            Sessions
          </h2>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
            User sessions tracked across the application. Click a session to
            inspect its journey.
          </p>
        </div>
        <button
          onClick={reload}
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Refresh
        </button>
      </div>

      {waking && <WakingBanner />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {loading && !data && <LoadingState message="Loading sessions..." />}

      {data && data.data.length === 0 && (
        <EmptyState
          title="No sessions found"
          description="There are no user sessions in the database yet. Visit the demo store to generate traffic."
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Session ID
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Events
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Entry Path
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    First Seen
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((session) => (
                  <tr
                    key={session.session_id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Link
                        to={`/sessions/${session.session_id}`}
                        style={{
                          color: '#2563eb',
                          fontWeight: 500,
                          textDecoration: 'none',
                          fontFamily: 'monospace',
                        }}
                      >
                        {session.session_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#111827' }}>
                      <span
                        style={{
                          backgroundColor: '#f3f4f6',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          fontWeight: 600,
                        }}
                      >
                        {session.event_count}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        color: '#4b5563',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span title={session.entry_path}>
                        {session.entry_path}
                      </span>
                    </td>
                    <td
                      style={{ padding: '0.75rem 1rem', color: '#6b7280' }}
                      title={formatTooltipTime(session.first_seen)}
                    >
                      {formatRelativeTime(session.first_seen)}
                    </td>
                    <td
                      style={{ padding: '0.75rem 1rem', color: '#6b7280' }}
                      title={formatTooltipTime(session.last_seen)}
                    >
                      {formatRelativeTime(session.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#4b5563',
            }}
          >
            <div>
              Showing page {page} of {totalPages} ({data.total} total sessions)
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: page <= 1 ? '#f3f4f6' : '#ffffff',
                  color: page <= 1 ? '#9ca3af' : '#111827',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: page >= totalPages ? '#f3f4f6' : '#ffffff',
                  color: page >= totalPages ? '#9ca3af' : '#111827',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
