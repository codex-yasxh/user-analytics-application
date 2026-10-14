(() => {
  // Only render status chip when page is loaded top-level (never inside heatmap iframe)
  if (window !== window.top) {
    return;
  }

  const chipContainer = document.createElement('div');
  chipContainer.id = 'cf-status-chip';
  chipContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 9999px;
    padding: 8px 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    color: #1f2937;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  `;

  document.body.appendChild(chipContainer);

  const startedAt = Date.now();

  function render() {
    const cf = window.__cf;

    if (!cf) {
      if (Date.now() - startedAt > 2000) {
        chipContainer.style.background = '#fffbeb';
        chipContainer.style.borderColor = '#fcd34d';
        chipContainer.style.color = '#92400e';
        chipContainer.innerHTML = `
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b;"></span>
          Tracker not loaded. A blocker may be active.
        `;
      } else {
        chipContainer.innerHTML = `
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#9ca3af;"></span>
          Initializing tracker...
        `;
      }
      return;
    }

    if (cf.status === 'paused') {
      chipContainer.style.background = '#fffbeb';
      chipContainer.style.borderColor = '#fcd34d';
      chipContainer.style.color = '#92400e';
      chipContainer.innerHTML = `
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b;"></span>
        <span>Tracking paused (DNT/GPC).</span>
        <button id="cf-enable-btn" style="
          background:#2563eb; color:#ffffff; border:none; border-radius:4px;
          padding:2px 8px; font-size:12px; cursor:pointer; font-weight:500;
        ">Enable for this demo</button>
      `;

      const btn = document.getElementById('cf-enable-btn');
      if (btn) {
        btn.onclick = () => {
          cf.enable();
          render();
        };
      }
      return;
    }

    // Active state
    const shortId = cf.sessionId ? `cf_${cf.sessionId.slice(0, 4)}` : 'cf_anon';
    chipContainer.style.background = '#ffffff';
    chipContainer.style.borderColor = '#d1d5db';
    chipContainer.style.color = '#1f2937';
    chipContainer.innerHTML = `
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
      <span>Tracking active, session <strong>${shortId}</strong>, ${cf.eventsSent} events sent</span>
      ${
        cf.sessionId
          ? `<a href="/sessions/${cf.sessionId}" target="_blank" style="color:#2563eb; text-decoration:none; font-weight:600; margin-left:4px;">Open my session &rarr;</a>`
          : ''
      }
    `;
  }

  render();
  window.setInterval(render, 1000);
})();
