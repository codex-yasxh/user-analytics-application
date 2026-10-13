// THROWAWAY: replaced by the real tracker
(() => {
  const currentScript = document.currentScript as HTMLScriptElement | null;
  const endpoint = currentScript?.getAttribute('data-endpoint') || '/api/events';

  const STORAGE_KEY = 'cf_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement) || document.body;
      const tag = target.tagName ? target.tagName.toLowerCase() : 'body';
      const className = typeof target.className === 'string' && target.className.trim() ? `.${target.className.trim().split(/\s+/)[0]}` : '';
      const sel = (target.id ? `#${target.id}` : `${tag}${className}`).slice(0, 120);

      const event = {
        eid: crypto.randomUUID(),
        session_id: sessionId,
        type: 'click',
        url: window.location.href,
        ts: new Date().toISOString(),
        vw: window.innerWidth,
        vh: window.innerHeight,
        x: Math.round(e.pageX),
        y: Math.round(e.pageY),
        doc_w: document.documentElement.scrollWidth,
        doc_h: document.documentElement.scrollHeight,
        sel,
      };

      const payload = JSON.stringify({ events: [event] });
      const blob = new Blob([payload], { type: 'text/plain' });
      navigator.sendBeacon(endpoint, blob);
    },
    true,
  );
})();
