export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      style={{
        padding: '48px 16px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '13px',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          width: '18px',
          height: '18px',
          border: '2px solid #e5e7eb',
          borderTopColor: '#9ca3af',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '12px',
        }}
      />
      <div>{message}</div>
    </div>
  );
}

export function EmptyState({
  title = 'No data',
  description = 'Nothing to show yet.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      style={{
        padding: '48px 16px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
        }}
      >
        {title}
      </p>
      <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px' }}>
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
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        color: '#991b1b',
        margin: '16px 0',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '4px 12px',
            backgroundColor: 'transparent',
            color: '#991b1b',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            flexShrink: 0,
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
        padding: '10px 16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        color: '#6b7280',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
      }}
    >
      <div
        style={{
          width: '14px',
          height: '14px',
          border: '2px solid #e5e7eb',
          borderTopColor: '#9ca3af',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
      <span>
        <strong style={{ fontWeight: 600 }}>Waking up</strong> — the API is
        cold-starting, retrying automatically.
      </span>
    </div>
  );
}
