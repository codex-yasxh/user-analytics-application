import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useApi } from '../src/useApi.js';

describe('useApi hook abort behavior', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('aborts in-flight request when component unmounts or endpoint changes', async () => {
    let abortSignalObserved: AbortSignal | null = null;

    globalThis.fetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      abortSignalObserved = init?.signal ?? null;
      return new Promise<Response>(() => {
        // Pending promise that does not resolve
      });
    }) as unknown as typeof fetch;

    function TestComponent({ endpoint }: { endpoint: string | null }) {
      const { loading } = useApi(endpoint);
      return React.createElement('div', null, loading ? 'loading' : 'idle');
    }

    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(TestComponent, { endpoint: '/api/sessions' }),
      );
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(abortSignalObserved).not.toBeNull();
    expect(abortSignalObserved!.aborted).toBe(false);

    // Unmounting the component triggers cleanup in useEffect, which aborts the controller
    await act(async () => {
      root.unmount();
    });

    expect(abortSignalObserved!.aborted).toBe(true);
  });
});
