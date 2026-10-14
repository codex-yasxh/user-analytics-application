export interface Point {
  x: number;
  y: number;
  doc_w: number;
}

export interface ScaledPoint {
  px: number;
  py: number;
}

/**
 * Uniform scaling for heatmap click points based on reference render width and document width.
 * Formula: scale = renderWidth / doc_w
 * Both axes use the same scale factor to preserve element aspect ratios.
 */
export function scalePoint(point: Point, renderWidth: number): ScaledPoint {
  if (!point || typeof point.doc_w !== 'number' || point.doc_w <= 0) {
    throw new Error('Invalid doc_w: must be a positive number');
  }
  if (typeof renderWidth !== 'number' || renderWidth <= 0) {
    throw new Error('Invalid renderWidth: must be a positive number');
  }

  const scale = renderWidth / point.doc_w;
  return {
    px: Math.round(point.x * scale),
    py: Math.round(point.y * scale),
  };
}
