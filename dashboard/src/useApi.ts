import { useEffect, useState, useCallback, useRef } from 'react';
import { API_BASE, classifyResponse } from './api.js';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  waking: boolean;
  error: string | null;
  reload: () => void;
}

export function useApi<T>(endpoint: string | null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(endpoint));
  const [waking, setWaking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const retryTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const reload = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!endpoint) {
      setData(null);
      setLoading(false);
      setWaking(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    setData(null);
    setLoading(true);
    setError(null);
    startTimeRef.current = Date.now();

    const fetchData = async () => {
      const requestStart = Date.now();
      try {
        const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const timeoutId = setTimeout(() => {
          controller.abort('timeout');
        }, 8000);

        const response = await fetch(url, { signal });
        clearTimeout(timeoutId);

        const elapsedMs = Date.now() - requestStart;
        const contentType = response.headers.get('content-type');
        const category = classifyResponse(
          response.status,
          contentType,
          elapsedMs,
        );

        if (category === 'ok') {
          const json = await response.json();
          if (!signal.aborted) {
            setData(json);
            setLoading(false);
            setWaking(false);
            setError(null);
          }
          return;
        }

        if (category === 'waking') {
          // If total elapsed time is under 120s, retry in 5s
          if (Date.now() - startTimeRef.current < 120_000) {
            if (!signal.aborted) {
              setWaking(true);
              setLoading(false);
              retryTimeoutRef.current = window.setTimeout(fetchData, 5000);
            }
            return;
          }
          if (!signal.aborted) {
            setWaking(false);
            setLoading(false);
            setError('Service did not wake up within 2 minutes. Please retry.');
          }
          return;
        }

        // category === 'error' (4xx etc)
        let errMsg = `Request failed with status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errMsg = errJson.error.message;
          }
        } catch {
          // Response body was not JSON; fallback to status text message
        }

        if (!signal.aborted) {
          setError(errMsg);
          setLoading(false);
          setWaking(false);
        }
      } catch (err: unknown) {
        if (signal.aborted) {
          return;
        }
        // Network failure / connection refused is treated as waking for cold starts
        if (Date.now() - startTimeRef.current < 120_000) {
          setWaking(true);
          setLoading(false);
          retryTimeoutRef.current = window.setTimeout(fetchData, 5000);
        } else {
          setWaking(false);
          setLoading(false);
          setError(
            err instanceof Error ? err.message : 'Network connection failed',
          );
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [endpoint, revision]);

  return { data, loading, waking, error, reload };
}
