import { Router, type Request, type Response } from 'express';
import { type Db } from 'mongodb';
import {
  HEATMAP_LIMIT_MAX,
  REFERENCE_WIDTH,
  normalizePath,
  type ViewportBucket,
} from '@cf/shared';

export interface HeatmapRouterOptions {
  db: Db;
}

const VALID_BUCKETS: ReadonlySet<string> = new Set([
  'mobile',
  'tablet',
  'desktop',
]);

export function createHeatmapRouter({ db }: HeatmapRouterOptions): Router {
  const router = Router();

  router.get('/api/heatmap', async (req: Request, res: Response) => {
    const rawPath = req.query.path;
    if (typeof rawPath !== 'string' || !rawPath.trim()) {
      res.status(400).json({
        error: {
          code: 'INVALID_PATH',
          message: 'Path is required',
        },
      });
      return;
    }

    try {
      const parsedUrl = new URL(rawPath);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        res.status(400).json({
          error: {
            code: 'INVALID_PATH',
            message: 'Path must be a valid http or https URL',
          },
        });
        return;
      }
    } catch {
      res.status(400).json({
        error: {
          code: 'INVALID_PATH',
          message: 'Path must be a valid http or https URL',
        },
      });
      return;
    }

    const normalizedPath = normalizePath(rawPath);

    const rawBucket = req.query.bucket;
    const bucket: ViewportBucket =
      rawBucket === undefined ? 'desktop' : (rawBucket as ViewportBucket);

    if (!VALID_BUCKETS.has(bucket)) {
      res.status(400).json({
        error: {
          code: 'INVALID_BUCKET',
          message: 'Bucket must be mobile, tablet, or desktop',
        },
      });
      return;
    }

    let limit = HEATMAP_LIMIT_MAX;
    if (req.query.limit !== undefined) {
      const parsedLimit = parseInt(req.query.limit as string, 10);
      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > HEATMAP_LIMIT_MAX
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_LIMIT',
            message: `Limit must be an integer between 1 and ${HEATMAP_LIMIT_MAX}`,
          },
        });
        return;
      }
      limit = parsedLimit;
    }

    const filter = {
      type: 'click' as const,
      path: normalizedPath,
      vw_bucket: bucket,
    };

    const [points, total] = await Promise.all([
      db
        .collection('events')
        .find(filter)
        .project({
          _id: 0,
          x: 1,
          y: 1,
          doc_w: 1,
          doc_h: 1,
          vw: 1,
          vh: 1,
        })
        .sort({ ts: -1 })
        .limit(limit)
        .toArray(),
      db.collection('events').countDocuments(filter),
    ]);

    res.status(200).json({
      path: normalizedPath,
      bucket,
      reference_width: REFERENCE_WIDTH[bucket],
      total,
      returned: points.length,
      points,
    });
  });

  return router;
}
