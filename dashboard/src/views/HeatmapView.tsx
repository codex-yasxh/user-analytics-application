import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../useApi.js';
import {
  DEMO_ORIGIN,
  type PageItem,
  type HeatmapResponse,
  type ElementsResponse,
} from '../api.js';
import { scalePoint } from '../math.js';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  WakingBanner,
} from '../components/SharedStates.js';

function HeatmapScaler({
  referenceWidth,
  children,
}: {
  referenceWidth: number;
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;
    const observer = new ResizeObserver(() => {
      const available = wrapper.clientWidth;
      setScale(Math.min(1, available / referenceWidth));
      setInnerHeight(inner.scrollHeight);
    });
    observer.observe(wrapper);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [referenceWidth]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: scale < 1 ? `${innerHeight * scale}px` : undefined,
        overflow: 'hidden',
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: `${referenceWidth}px`,
          transformOrigin: 'top left',
          transform: scale < 1 ? `scale(${scale})` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function displayPath(fullPath: string): string {
  try {
    return new URL(fullPath).pathname;
  } catch {
    return fullPath;
  }
}

const BUCKET_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

function isRenderableDemoPath(path: string): boolean {
  try {
    return new URL(path).origin === new URL(DEMO_ORIGIN).origin;
  } catch {
    return false;
  }
}

export function HeatmapView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: pagesData,
    loading: pagesLoading,
    waking: pagesWaking,
    error: pagesError,
  } = useApi<PageItem[]>('/api/pages');

  const selectedBucket = searchParams.get('bucket') || 'desktop';
  const selectedPath =
    searchParams.get('path') ||
    (pagesData && pagesData.length > 0 ? pagesData[0].path : '');

  const referenceWidth = BUCKET_WIDTHS[selectedBucket] || 1280;

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

  const elementsEndpoint = selectedPath
    ? `/api/elements?path=${encodeURIComponent(selectedPath)}&bucket=${selectedBucket}&limit=20`
    : null;

  const { data: elementsData } = useApi<ElementsResponse>(elementsEndpoint);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(800);

  const isRenderable = useMemo(
    () => isRenderableDemoPath(selectedPath),
    [selectedPath],
  );

  const iframeSrc = useMemo(() => {
    if (!isRenderable || !selectedPath) return '';
    const sep = selectedPath.includes('?') ? '&' : '?';
    return `${selectedPath}${sep}cf_ignore=1`;
  }, [isRenderable, selectedPath]);

  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.documentElement) {
        setIframeHeight(Math.max(doc.documentElement.scrollHeight, 800));
      }
    } catch {
      setIframeHeight(800);
    }
  };

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

    if (!isRenderable) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      const g = 40;
      for (let x = 0; x < width; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += g) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const point of heatmapData.points) {
      try {
        const { px, py } = scalePoint(point, width, isRenderable ? iframeHeight : undefined);
        const r = Math.max(16, Math.min(32, Math.round(width / 35)));

        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, 'rgba(255, 65, 54, 0.45)');
        grad.addColorStop(0.5, 'rgba(255, 133, 27, 0.25)');
        grad.addColorStop(1, 'rgba(255, 220, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } catch {
        // skip
      }
    }

    ctx.restore();
  }, [heatmapData, referenceWidth, iframeHeight, isRenderable]);

  const updateSelection = (p: string, b: string) => {
    setSearchParams({ path: p, bucket: b });
  };

  const pages = pagesData || [];
  const renderablePages = pages.filter((p) => isRenderableDemoPath(p.path));
  const otherPages = pages.filter((p) => !isRenderableDemoPath(p.path));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
            color: '#111827',
          }}
        >
          Heatmap
        </h1>
        <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '13px' }}>
          Click density by page and viewport.
        </p>
      </div>

      {(pagesWaking || heatmapWaking) && <WakingBanner />}
      {pagesError && <ErrorState message={pagesError} />}
      {heatmapError && (
        <ErrorState message={heatmapError} onRetry={reloadHeatmap} />
      )}

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'flex-end',
          marginBottom: '24px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 500,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Page
          </label>
          <select
            value={selectedPath}
            onChange={(e) => updateSelection(e.target.value, selectedBucket)}
            disabled={pagesLoading || pages.length === 0}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              fontSize: '13px',
              minWidth: '260px',
              backgroundColor: '#ffffff',
              color: '#111827',
            }}
          >
            {renderablePages.length > 0 && (
              <optgroup label="Demo Pages">
                {renderablePages.map((p) => (
                  <option key={p.path} value={p.path}>
                    {displayPath(p.path)} ({p.clicks})
                  </option>
                ))}
              </optgroup>
            )}
            {otherPages.length > 0 && (
              <optgroup label="External (data only)">
                {otherPages.map((p) => (
                  <option key={p.path} value={p.path}>
                    {displayPath(p.path)} ({p.clicks})
                  </option>
                ))}
              </optgroup>
            )}
            {pages.length === 0 && <option value="">No pages</option>}
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 500,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Viewport
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['desktop', 'tablet', 'mobile'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => updateSelection(selectedPath, b)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: selectedBucket === b ? '#111827' : '#ffffff',
                  color: selectedBucket === b ? '#ffffff' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {heatmapData && (
          <span
            style={{
              fontSize: '13px',
              color: '#9ca3af',
              marginLeft: 'auto',
              alignSelf: 'center',
            }}
          >
            {heatmapData.returned} of {heatmapData.total} clicks
          </span>
        )}
      </div>

      {!isRenderable && selectedPath && (
        <p
          style={{
            fontSize: '13px',
            color: '#9ca3af',
            margin: '0 0 16px',
          }}
        >
          External page — showing positions on a coordinate grid.
        </p>
      )}

      {heatmapLoading && !heatmapData && (
        <LoadingState message="Loading heatmap..." />
      )}

      {heatmapData && heatmapData.points.length === 0 && (
        <EmptyState
          title="No clicks"
          description={`No clicks for this page in the ${selectedBucket} bucket.`}
        />
      )}

      {selectedPath && (
        <HeatmapScaler referenceWidth={referenceWidth}>
          <div
            style={{
              position: 'relative',
              width: `${referenceWidth}px`,
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
          >
            {isRenderable && iframeSrc && (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title="Heatmap preview"
                scrolling="no"
                onLoad={handleIframeLoad}
                style={{
                  width: `${referenceWidth}px`,
                  height: `${iframeHeight}px`,
                  border: 'none',
                  display: 'block',
                  overflow: 'hidden',
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
        </HeatmapScaler>
      )}

      {/* Top clicked elements */}
      {elementsData && elementsData.elements.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 12px',
            }}
          >
            Top clicked elements
          </h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '6px 12px',
                    fontWeight: 500,
                    color: '#9ca3af',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '40px',
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '6px 12px',
                    fontWeight: 500,
                    color: '#9ca3af',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Selector
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '6px 12px',
                    fontWeight: 500,
                    color: '#9ca3af',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '80px',
                  }}
                >
                  Clicks
                </th>
              </tr>
            </thead>
            <tbody>
              {elementsData.elements.map((el, i) => (
                <tr key={el.sel} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td
                    style={{
                      padding: '8px 12px',
                      color: '#d1d5db',
                    }}
                  >
                    {i + 1}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '12px',
                      color: '#374151',
                    }}
                  >
                    {el.sel}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#111827',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {el.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
