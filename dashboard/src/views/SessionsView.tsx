import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../useApi.js';
import type { SessionsResponse } from '../api.js';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  WakingBanner,
} from '../components/SharedStates.js';

function shortenPath(fullPath: string): string {
  try {
    const url = new URL(fullPath);
    return url.pathname;
  } catch {
    return fullPath;
  }
}

function timeAgo(isoDate: string): string {
  try {
    const sec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (sec <= 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
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

  const goToPage = (p: number) => {
    setSearchParams({ page: String(p), limit: String(limit) });
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: '#111827',
            }}
          >
            Sessions
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            {data ? `${data.total} total` : ''}
          </p>
        </div>
        <button
          onClick={reload}
          style={{
            padding: '6px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#374151',
            fontWeight: 500,
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
          title="No sessions yet"
          description="Visit the demo store to generate traffic."
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                {[
                  'Session',
                  'Events',
                  'Entry Page',
                  'First Seen',
                  'Last Seen',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontWeight: 500,
                      color: '#9ca3af',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((s) => (
                <tr
                  key={s.session_id}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <Link
                      to={`/sessions/${s.session_id}`}
                      style={{
                        color: '#111827',
                        textDecoration: 'none',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {s.session_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      color: '#374151',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.event_count}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      color: '#6b7280',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '12px',
                    }}
                    title={s.entry_path}
                  >
                    {shortenPath(s.entry_path)}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      color: '#9ca3af',
                    }}
                    title={s.first_seen}
                  >
                    {timeAgo(s.first_seen)}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      color: '#9ca3af',
                    }}
                    title={s.last_seen}
                  >
                    {timeAgo(s.last_seen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              fontSize: '13px',
              color: '#9ca3af',
            }}
          >
            <span>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: page <= 1 ? '#d1d5db' : '#374151',
                  cursor: page <= 1 ? 'default' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: page >= totalPages ? '#d1d5db' : '#374151',
                  cursor: page >= totalPages ? 'default' : 'pointer',
                  fontSize: '13px',
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
