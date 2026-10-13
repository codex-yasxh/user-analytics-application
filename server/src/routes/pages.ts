import { Router, type Request, type Response } from 'express';
import { type Db } from 'mongodb';

export interface PagesRouterOptions {
  db: Db;
  config?: { PAGES_LIMIT: number };
}

export function createPagesRouter({ db, config }: PagesRouterOptions): Router {
  const router = Router();
  const limit = config?.PAGES_LIMIT ?? 100;

  router.get('/api/pages', async (_req: Request, res: Response) => {
    const results = await db
      .collection('events')
      .aggregate([
        {
          $group: {
            _id: '$path',
            views: {
              $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] },
            },
            clicks: {
              $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] },
            },
          },
        },
        { $sort: { clicks: -1, _id: 1 } },
        { $limit: limit },
      ])
      .toArray();

    const data = results.map((item) => ({
      path: item._id as string,
      views: item.views as number,
      clicks: item.clicks as number,
    }));

    res.status(200).json(data);
  });

  return router;
}
