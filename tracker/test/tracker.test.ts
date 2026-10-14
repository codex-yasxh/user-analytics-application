import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventSchema } from '@cf/shared';
import { createSessionManager, createUuid } from '../src/identity.js';
import { EventQueue } from '../src/queue.js';
import { installTracker } from '../src/runtime.js';
import { buildSelector } from '../src/selector.js';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const trackerBundle = resolve(repositoryRoot, 'dashboard/public/cf.js');
const initialPushState = history.pushState;
const initialReplaceState = history.replaceState;

type TrackerApi = {
  status: string;
  eventsSent: number;
  eventsQueued: number;
  enable: () => void;
};

function installForTest({ dnt = false, gpc = false } = {}) {
  const script = document.createElement('script');
  script.dataset.endpoint = 'https://ingest.example.test/api/events';
  const documentListeners = new Map<string, EventListener>();
  const windowListeners = new Map<string, EventListener>();
  const sendBeacon = vi.fn(() => true);
  let intervalCallback: (() => void) | undefined;

  Object.defineProperty(document, 'currentScript', {
    configurable: true,
    value: script,
  });
  Object.defineProperty(navigator, 'doNotTrack', {
    configurable: true,
    value: dnt ? '1' : '0',
  });
  Object.defineProperty(navigator, 'globalPrivacyControl', {
    configurable: true,
    value: gpc,
  });
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: sendBeacon,
  });
  vi.spyOn(document, 'addEventListener').mockImplementation(((
    type: string,
    listener: EventListener,
  ) => {
    documentListeners.set(type, listener);
  }) as typeof document.addEventListener);
  vi.spyOn(window, 'addEventListener').mockImplementation(((
    type: string,
    listener: EventListener,
  ) => {
    windowListeners.set(type, listener);
  }) as typeof window.addEventListener);
  vi.spyOn(window, 'setInterval').mockImplementation(((
    callback: () => void,
  ) => {
    intervalCallback = callback;
    return 1;
  }) as typeof window.setInterval);
  Object.defineProperty(document.documentElement, 'scrollWidth', {
    configurable: true,
    value: 1280,
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 2400,
  });

  installTracker(window, document);
  return {
    documentListeners,
    windowListeners,
    sendBeacon,
    intervalCallback: () => intervalCallback?.(),
    tracker: (window as Window & { __cf: TrackerApi }).__cf,
  };
}

function buildTracker(): string {
  execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build', '-w', '@cf/tracker'],
    {
      cwd: repositoryRoot,
      shell: process.platform === 'win32',
    },
  );

  return readFileSync(trackerBundle, 'utf8');
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  localStorage.clear();
  for (const key of [
    'cf_session_id',
    'cf_session_touched_at',
    'cf_explicit_opt_in',
  ]) {
    document.cookie = `${key}=; Max-Age=0; Path=/`;
  }
  Object.defineProperty(navigator, 'globalPrivacyControl', {
    configurable: true,
    value: false,
  });
  history.pushState = initialPushState;
  history.replaceState = initialReplaceState;
  history.replaceState({}, '', '/');
  delete (window as Window & { __cf?: unknown }).__cf;
  vi.restoreAllMocks();
});

describe('tracker helpers', () => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('produces v4 UUIDs with each supported random source', () => {
    const nativeWindow = Object.create(window) as Window;
    Object.defineProperty(nativeWindow, 'crypto', {
      value: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    });
    const valuesWindow = Object.create(window) as Window;
    Object.defineProperty(valuesWindow, 'crypto', {
      value: { getRandomValues: (bytes: Uint8Array) => bytes.fill(0) },
    });
    const mathWindow = Object.create(window) as Window;
    Object.defineProperty(mathWindow, 'crypto', { value: {} });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(createUuid(nativeWindow)).toMatch(uuidPattern);
    expect(createUuid(valuesWindow)).toMatch(uuidPattern);
    expect(createUuid(mathWindow)).toMatch(uuidPattern);
  });

  it('uses cookies when localStorage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const sessions = createSessionManager(window);
    const id = sessions.ensure();

    expect(document.cookie).toContain(`cf_session_id=${id}`);
    expect(id).toMatch(uuidPattern);
  });

  it('builds selectors from id, classes, or sibling position without text', () => {
    const parent = document.createElement('div');
    const identified = document.createElement('button');
    identified.id = 'buy-now';
    const classified = document.createElement('button');
    classified.className = 'primary large extra';
    const firstPlain = document.createElement('span');
    const secondPlain = document.createElement('span');
    secondPlain.textContent = 'private text';
    parent.append(identified, classified, firstPlain, secondPlain);

    expect(buildSelector(identified)).toBe('button#buy-now');
    expect(buildSelector(classified)).toBe('button.primary.large');
    expect(buildSelector(secondPlain)).toBe('span:nth-of-type(2)');
    expect(buildSelector(secondPlain)).not.toContain('private text');
  });

  it('caps its queue by dropping the oldest event', () => {
    const queue = new EventQueue<number>();
    for (let value = 0; value <= 100; value += 1) queue.push(value);

    const batches = queue.drainBatches(
      (events) => JSON.stringify(events),
      64 * 1024,
    );
    expect(batches.flat()).toHaveLength(100);
    expect(batches.flat()[0]).toBe(1);
    expect(batches.flat().at(-1)).toBe(100);
  });

  it('keeps a 50-event tracker body below 64 KB', () => {
    const events = Array.from({ length: 50 }, (_, index) => ({
      eid: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
      session_id: '22222222-2222-4222-8222-222222222222',
      type: 'click',
      url: 'https://demo.example.test/products',
      ts: '2026-10-13T00:00:00.000Z',
      vw: 1280,
      vh: 800,
      x: 640,
      y: 912,
      doc_w: 1280,
      doc_h: 2400,
      sel: 'button.add-to-cart',
    }));

    expect(new Blob([JSON.stringify({ events })]).size).toBeLessThan(64 * 1024);
  });

  it('drops an event that cannot fit in a delivery body', () => {
    const queue = new EventQueue<string>();
    queue.push('x'.repeat(64 * 1024));

    expect(
      queue.drainBatches((events) => JSON.stringify({ events }), 64 * 1024),
    ).toEqual([]);
  });
});

describe('tracker behavior', () => {
  it('does nothing when its data endpoint is absent', () => {
    installTracker(window, document);

    expect('__cf' in window).toBe(false);
  });

  it('does nothing when cf_ignore is present or another tracker is already installed', () => {
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    });
    history.replaceState({}, '', '/?cf_ignore');

    installTracker(window, document);
    expect('__cf' in window).toBe(false);

    history.replaceState({}, '', '/');
    Object.assign(window, { __cf: { existing: true } });
    installTracker(window, document);

    expect(
      (window as Window & { __cf: { existing: boolean } }).__cf.existing,
    ).toBe(true);
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('does nothing from an embedded frame', () => {
    const framedWindow = Object.create(window) as Window;
    Object.defineProperty(framedWindow, 'top', { value: {} });

    installTracker(framedWindow, document);

    expect('__cf' in framedWindow).toBe(false);
  });

  it('rotates a session that has been idle for more than thirty minutes', () => {
    localStorage.setItem(
      'cf_session_id',
      '11111111-1111-4111-8111-111111111111',
    );
    localStorage.setItem(
      'cf_session_touched_at',
      String(Date.now() - 30 * 60 * 1000 - 1),
    );
    const { tracker } = installForTest();

    expect(tracker.sessionId).not.toBe('11111111-1111-4111-8111-111111111111');
    expect(localStorage.getItem('cf_session_id')).toBe(tracker.sessionId);
  });

  it('pauses for DNT and begins tracking only after explicit enablement', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { sendBeacon, tracker, windowListeners } = installForTest({
      dnt: true,
    });

    expect(tracker.status).toBe('paused');
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);

    tracker.enable();
    windowListeners.get('pagehide')?.(new Event('pagehide'));

    expect(tracker.status).toBe('active');
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('pauses for GPC without creating a session', () => {
    const { tracker } = installForTest({ gpc: true });

    expect(tracker.status).toBe('paused');
    expect(tracker.sessionId).toBe('');
    expect(localStorage.getItem('cf_session_id')).toBeNull();
  });

  it('records a page view only when the SPA path changes', () => {
    const { sendBeacon, tracker, windowListeners } = installForTest();

    history.pushState({}, '', '/products');
    history.replaceState({}, '', '/products');
    windowListeners.get('pagehide')?.(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(tracker.eventsSent).toBe(2);
  });

  it('records a changed path on popstate', () => {
    const { sendBeacon, tracker, windowListeners } = installForTest();
    initialReplaceState.call(history, {}, '', '/checkout');
    windowListeners.get('popstate')?.(new PopStateEvent('popstate'));
    windowListeners.get('pagehide')?.(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(tracker.eventsSent).toBe(2);
  });

  it('flushes queued events on the timer and when the document becomes hidden', () => {
    const first = installForTest();
    first.intervalCallback();
    expect(first.sendBeacon).toHaveBeenCalledTimes(1);

    delete (window as Window & { __cf?: unknown }).__cf;
    vi.restoreAllMocks();
    const second = installForTest();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    second.documentListeners.get('visibilitychange')?.(
      new Event('visibilitychange'),
    );
    expect(second.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('flushes immediately once ten events are queued', () => {
    const { documentListeners, sendBeacon, tracker } = installForTest();
    const button = document.createElement('button');
    const click = (x: number) =>
      documentListeners.get('click')?.({
        isTrusted: true,
        detail: 1,
        pageX: x,
        pageY: 10,
        target: button,
        composedPath: () => [button],
      } as unknown as Event);

    for (let index = 0; index < 9; index += 1) click(index + 1);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(tracker.eventsSent).toBe(10);
  });

  it('contains delivery errors inside the pagehide handler', () => {
    const { sendBeacon, windowListeners } = installForTest();
    sendBeacon.mockImplementation(() => {
      throw new Error('delivery failed');
    });

    expect(() =>
      windowListeners.get('pagehide')?.(new Event('pagehide')),
    ).not.toThrow();
  });

  it('drops an untrusted click before delivery', () => {
    const { documentListeners, sendBeacon, tracker, windowListeners } =
      installForTest();
    const button = document.createElement('button');

    documentListeners.get('click')?.({
      isTrusted: false,
      detail: 1,
      pageX: 24,
      pageY: 48,
      target: button,
      composedPath: () => [button],
    } as unknown as Event);
    windowListeners.get('pagehide')?.(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(tracker.eventsSent).toBe(1);
  });

  it('drops a keyboard click at the origin before delivery', () => {
    const { documentListeners, sendBeacon, tracker, windowListeners } =
      installForTest();
    const button = document.createElement('button');

    documentListeners.get('click')?.({
      isTrusted: true,
      detail: 0,
      pageX: 0,
      pageY: 0,
      target: button,
      composedPath: () => [button],
    } as unknown as Event);
    windowListeners.get('pagehide')?.(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(tracker.eventsSent).toBe(1);
  });

  it('falls back to keepalive fetch when the browser declines a beacon', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      value: fetchMock,
    });
    const { sendBeacon, tracker, windowListeners } = installForTest();
    sendBeacon.mockReturnValue(false);

    windowListeners.get('pagehide')?.(new Event('pagehide'));
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ingest.example.test/api/events',
      expect.objectContaining({ keepalive: true, method: 'POST' }),
    );
    expect(tracker.eventsSent).toBe(1);
  });

  it('sends page coordinates and a privacy-safe selector for trusted clicks', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      value: fetchMock,
    });
    const { documentListeners, sendBeacon, windowListeners } = installForTest();
    sendBeacon.mockReturnValue(false);
    const button = document.createElement('button');
    button.id = 'buy-now';

    documentListeners.get('click')?.({
      isTrusted: true,
      detail: 1,
      pageX: 24,
      pageY: 48,
      target: button,
      composedPath: () => [button],
    } as unknown as Event);
    windowListeners.get('pagehide')?.(new Event('pagehide'));
    await Promise.resolve();

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const sentEvents = JSON.parse(request.body as string).events;
    expect(sentEvents[1]).toMatchObject({
      x: 24,
      y: 48,
      sel: 'button#buy-now',
    });
    expect(sentEvents[1].sel).not.toContain('buy now');
    expect(
      sentEvents.every(
        (event: unknown) => eventSchema.safeParse(event).success,
      ),
    ).toBe(true);
  });

  it('retries failed fetch delivery three times and then drops the batch', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => Promise.reject(new Error('offline')));
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      value: fetchMock,
    });
    const { sendBeacon, tracker, windowListeners } = installForTest();
    sendBeacon.mockReturnValue(false);

    windowListeners.get('pagehide')?.(new Event('pagehide'));
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(tracker.eventsSent).toBe(0);
  });

  it('retries a non-successful fetch response instead of marking it sent', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    );
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      value: fetchMock,
    });
    const { sendBeacon, tracker, windowListeners } = installForTest();
    sendBeacon.mockReturnValue(false);

    windowListeners.get('pagehide')?.(new Event('pagehide'));
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(tracker.eventsSent).toBe(0);
  });
});

describe('tracker bundle', () => {
  it('builds as a standalone IIFE without validation runtime code', () => {
    const bundle = buildTracker();

    expect(bundle).not.toMatch(/\bimport\s/);
    expect(bundle).not.toMatch(/\bexport\s/);
    expect(bundle).not.toContain('zod');
    expect(bundle).not.toContain('safeParse');
  });

  it('uses the script data endpoint when a click is beaconed', () => {
    const endpoint = 'https://ingest.example.test/api/events';
    const script = document.createElement('script');
    script.dataset.endpoint = endpoint;
    const sendBeacon = vi.fn(() => true);
    let clickListener: EventListener | undefined;

    Object.defineProperty(document, 'currentScript', {
      configurable: true,
      value: script,
    });
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    });
    vi.spyOn(document, 'addEventListener').mockImplementation(((
      type: string,
      listener: EventListener,
    ) => {
      if (type === 'click') clickListener = listener;
    }) as typeof document.addEventListener);

    window.eval(buildTracker());

    const button = document.createElement('button');
    document.body.appendChild(button);
    clickListener?.({
      isTrusted: true,
      detail: 1,
      pageX: 24,
      pageY: 48,
      target: button,
      composedPath: () => [button],
    } as unknown as Event);
    window.dispatchEvent(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith(endpoint, expect.any(Blob));
  });
});
