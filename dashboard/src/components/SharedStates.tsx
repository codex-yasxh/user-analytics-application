export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
      <div
        style={{
          display: 'inline-block',
          width: '24px',
          height: '24px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '0.5rem',
        }}
      />
      <div>{message}</div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function EmptyState({
  title = 'No data found',
  description = 'There are no records to display.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        border: '1px dashed #d1d5db',
        borderRadius: '8px',
        margin: '1.5rem 0',
      }}
    >
      <h3
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1.125rem',
          color: '#111827',
        }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
        {description}
      </p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        color: '#991b1b',
        margin: '1rem 0',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Error</div>
      <div
        style={{ fontSize: '0.875rem', marginBottom: onRetry ? '0.75rem' : 0 }}
      >
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function WakingBanner() {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        color: '#1e40af',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          border: '2px solid #bfdbfe',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          flexShrink: 0,
        }}
      />
      <div>
        <strong>API is waking up, about a minute.</strong> Retrying
        automatically...
      </div>
    </div>
  );
}
