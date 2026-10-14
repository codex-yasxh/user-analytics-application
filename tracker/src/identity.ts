import { SESSION_IDLE_MS } from '@cf/shared/constants';

const SESSION_KEY = 'cf_session_id';
const TOUCHED_KEY = 'cf_session_touched_at';
const OPT_IN_KEY = 'cf_explicit_opt_in';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function cookie(win: Window, name: string): string | null {
  const prefix = `${name}=`;
  const value = win.document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function stored(win: Window, key: string): string | null {
  return safe(() => win.localStorage.getItem(key), null) ?? cookie(win, key);
}

function persist(win: Window, key: string, value: string): void {
  if (
    safe(() => {
      win.localStorage.setItem(key, value);
      return true;
    }, false)
  )
    return;
  win.document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function createUuid(win: Window): string {
  const cryptoApi = win.crypto;
  if (typeof cryptoApi?.randomUUID === 'function')
    return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function')
    cryptoApi.getRandomValues(bytes);
  else
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isPaused(win: Window): boolean {
  const nav = win.navigator as Navigator & { globalPrivacyControl?: boolean };
  return (
    stored(win, OPT_IN_KEY) !== 'true' &&
    (nav.doNotTrack === '1' || nav.globalPrivacyControl === true)
  );
}

export function enableTracking(win: Window): void {
  persist(win, OPT_IN_KEY, 'true');
}

export function createSessionManager(win: Window) {
  let sessionId = stored(win, SESSION_KEY);
  let touchedAt = Number(stored(win, TOUCHED_KEY)) || 0;

  const ensure = (): string => {
    const now = Date.now();
    if (!sessionId || now - touchedAt > SESSION_IDLE_MS)
      sessionId = createUuid(win);
    if (!touchedAt || now - touchedAt > 5000) {
      touchedAt = now;
      persist(win, SESSION_KEY, sessionId);
      persist(win, TOUCHED_KEY, String(now));
    }
    return sessionId;
  };

  return { ensure, peek: () => sessionId ?? '' };
}
