import { BUCKET_MAX } from './constants.js';

export type ViewportBucket = 'mobile' | 'tablet' | 'desktop';

/**
 * Maps a viewport width in pixels to a canonical viewport bucket.
 * - mobile: width < 768
 * - tablet: 768 <= width < 1024
 * - desktop: width >= 1024
 */
export function bucketOf(vw: number): ViewportBucket {
  if (vw < BUCKET_MAX.mobile) {
    return 'mobile';
  }
  if (vw < BUCKET_MAX.tablet) {
    return 'tablet';
  }
  return 'desktop';
}
