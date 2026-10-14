import { Router, type Request, type Response } from 'express';
import { type Db } from 'mongodb';
import {
  ELEMENTS_LIMIT_MAX,
  normalizePath,
  type ViewportBucket,
} from '@cf/shared';

export interface ElementsRouterOptions {
  db: Db;
}

const VALID_BUCKETS: ReadonlySet<string> = new Set([
  'mobile',
  'tablet',
  'desktop',
]);

export function createElementsRouter({ db }: ElementsRouterOptions): Router {
  const router = Router();

  router.get('/api/elements', async (req: Request, res: Response) => {
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

    let limit = ELEMENTS_LIMIT_MAX;
    if (req.query.limit !== undefined) {
      const parsedLimit = parseInt(req.query.limit as string, 10);
      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > ELEMENTS_LIMIT_MAX
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_LIMIT',
            message: `Limit must be an integer between 1 and ${ELEMENTS_LIMIT_MAX}`,
          },
        });
        return;
      }
      limit = parsedLimit;
    }

    const pipeline = [
      {
        $match: {
          type: 'click' as const,
          path: normalizedPath,
          vw_bucket: bucket,
          sel: { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: '$sel',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          sel: '$_id',
          count: 1,
        },
      },
    ];

    const elements = await db
      .collection('events')
      .aggregate(pipeline)
      .toArray();

    res.status(200).json({
      path: normalizedPath,
      bucket,
      elements,
    });
  });

  return router;
}
