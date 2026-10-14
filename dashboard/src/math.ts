export interface Point {
  x: number;
  y: number;
  doc_w: number;
  doc_h: number;
}

export interface ScaledPoint {
  px: number;
  py: number;
}

export function scalePoint(
  point: Point,
  renderWidth: number,
  renderHeight?: number,
): ScaledPoint {
  if (!point || typeof point.doc_w !== 'number' || point.doc_w <= 0) {
    throw new Error('Invalid doc_w: must be a positive number');
  }
  if (typeof renderWidth !== 'number' || renderWidth <= 0) {
    throw new Error('Invalid renderWidth: must be a positive number');
  }

  const scaleX = renderWidth / point.doc_w;
  const scaleY =
    renderHeight && point.doc_h > 0
      ? renderHeight / point.doc_h
      : scaleX;

  return {
    px: Math.round(point.x * scaleX),
    py: Math.round(point.y * scaleY),
  };
}
