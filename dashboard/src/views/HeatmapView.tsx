import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../useApi.js';
import { DEMO_ORIGIN, type PageItem, type HeatmapResponse } from '../api.js';
import { scalePoint } from '../math.js';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  WakingBanner,
} from '../components/SharedStates.js';

const BUCKET_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

function isRenderableDemoPath(path: string): boolean {
  try {
    const demoUrl = new URL(DEMO_ORIGIN);
    const targetUrl = new URL(path);
    return targetUrl.origin === demoUrl.origin;
  } catch {
    return false;
  }
}

export function HeatmapView() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Load available paths
  const {
    data: pagesData,
    loading: pagesLoading,
    waking: pagesWaking,
    error: pagesError,
  } = useApi<PageItem[]>('/api/pages');

  // Compute selected path and bucket from URL
  const selectedBucket = searchParams.get('bucket') || 'desktop';
  const selectedPath =
    searchParams.get('path') ||
    (pagesData && pagesData.length > 0 ? pagesData[0].path : '');

  const referenceWidth = BUCKET_WIDTHS[selectedBucket] || 1280;

  // Fetch heatmap data for selected path and bucket
  const heatmapEndpoint = selectedPath
    ? `/api/heatmap?path=${encodeURIComponent(selectedPath)}&bucket=${selectedBucket}&limit=5000`
    : null;

  const {
    data: heatmapData,
    loading: heatmapLoading,
    waking: heatmapWaking,
    error: heatmapError,
    reload: reloadHeatmap,
  } = useApi<HeatmapResponse>(heatmapEndpoint);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(800);

  const isRenderable = useMemo(
    () => isRenderableDemoPath(selectedPath),
    [selectedPath],
  );

  // Build the demo iframe URL with the required ?cf_ignore parameter
  const iframeSrc = useMemo(() => {
    if (!isRenderable || !selectedPath) return '';
    const sep = selectedPath.includes('?') ? '&' : '?';
    return `${selectedPath}${sep}cf_ignore=1`;
  }, [isRenderable, selectedPath]);

  // Adjust iframe height when demo content loads
  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.documentElement) {
        const height = Math.max(doc.documentElement.scrollHeight, 800);
        setIframeHeight(height);
      }
    } catch {
      // Cross-origin fallback height
      setIframeHeight(800);
    }
  };

  // Draw heatmap overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmapData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = referenceWidth;
    const height = isRenderable
      ? iframeHeight
      : Math.max(
          800,
          ...heatmapData.points.map(
            (p) => Math.round(p.y * (width / p.doc_w)) + 50,
          ),
        );

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // If grid fallback for non-hosted path
    if (!isRenderable) {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw points with radial gradient and additive alpha
    ctx.globalCompositeOperation = 'lighter';

    for (const point of heatmapData.points) {
      try {
        const { px, py } = scalePoint(point, width);
        const radius = Math.max(16, Math.min(32, Math.round(width / 35)));

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        gradient.addColorStop(0, 'rgba(255, 65, 54, 0.45)');
        gradient.addColorStop(0.5, 'rgba(255, 133, 27, 0.25)');
        gradient.addColorStop(1, 'rgba(255, 220, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      } catch {
        // Skip invalid point
      }
    }

    ctx.restore();
  }, [heatmapData, referenceWidth, iframeHeight, isRenderable]);

  const updateSelection = (newPath: string, newBucket: string) => {
    setSearchParams({ path: newPath, bucket: newBucket });
  };

  const pages = pagesData || [];
  const renderablePages = pages.filter((p) => isRenderableDemoPath(p.path));
  const otherPages = pages.filter((p) => !isRenderableDemoPath(p.path));

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '0 0 0.25rem 0',
          }}
        >
          Click Heatmap
        </h2>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
          Inspect visual click density overlays across different screen
          viewports.
        </p>
      </div>

      {(pagesWaking || heatmapWaking) && <WakingBanner />}
      {pagesError && <ErrorState message={pagesError} />}
      {heatmapError && (
        <ErrorState message={heatmapError} onRetry={reloadHeatmap} />
      )}

      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
        >
          <label
            style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}
          >
            Page URL:
          </label>
          <select
            value={selectedPath}
            onChange={(e) => updateSelection(e.target.value, selectedBucket)}
            disabled={pagesLoading || pages.length === 0}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              minWidth: '280px',
              backgroundColor: '#ffffff',
            }}
          >
            {renderablePages.length > 0 && (
              <optgroup label="Demo Pages (Renderable)">
                {renderablePages.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.path} ({p.clicks} clicks)
                  </option>
                ))}
              </optgroup>
            )}
            {otherPages.length > 0 && (
              <optgroup label="External Pages (Data Only)">
                {otherPages.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.path} [data only] ({p.clicks} clicks)
                  </option>
                ))}
              </optgroup>
            )}
            {pages.length === 0 && <option value="">No pages available</option>}
          </select>
        </div>

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
        >
          <label
            style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}
          >
            Viewport Bucket:
          </label>
          <div
            style={{
              display: 'flex',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            {(['desktop', 'tablet', 'mobile'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => updateSelection(selectedPath, b)}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  backgroundColor: selectedBucket === b ? '#2563eb' : '#ffffff',
                  color: selectedBucket === b ? '#ffffff' : '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: selectedBucket === b ? 600 : 400,
                  textTransform: 'capitalize',
                }}
              >
                {b} ({BUCKET_WIDTHS[b]}px)
              </button>
            ))}
          </div>
        </div>

        {heatmapData && (
          <div
            style={{
              marginLeft: 'auto',
              padding: '0.375rem 0.75rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              color: '#065f46',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {heatmapData.returned} of {heatmapData.total} clicks drawn (
            {selectedBucket})
          </div>
        )}
      </div>

      {!isRenderable && selectedPath && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          <strong>Data Only View:</strong> Page origin does not match demo host
          ({DEMO_ORIGIN}). Showing click positions on coordinate grid.
        </div>
      )}

      {heatmapLoading && !heatmapData && (
        <LoadingState message="Loading heatmap data..." />
      )}

      {heatmapData && heatmapData.points.length === 0 && (
        <EmptyState
          title="No clicks in this bucket"
          description={`There are no recorded clicks for ${selectedPath} in the ${selectedBucket} viewport bucket.`}
        />
      )}

      {/* Heatmap Display Container */}
      {selectedPath && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '1.5rem',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: `${referenceWidth}px`,
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              backgroundColor: '#ffffff',
            }}
          >
            {isRenderable && iframeSrc && (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title="Heatmap Demo Page"
                onLoad={handleIframeLoad}
                style={{
                  width: `${referenceWidth}px`,
                  height: `${iframeHeight}px`,
                  border: 'none',
                  display: 'block',
                }}
              />
            )}

            <canvas
              ref={canvasRef}
              style={{
                position: isRenderable ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                display: 'block',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
