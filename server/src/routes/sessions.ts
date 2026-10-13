import { Router, type Request, type Response } from 'express';
import { type Db } from 'mongodb';
import { SESSIONS_LIMIT_MAX } from '@cf/shared';

export interface SessionsRouterOptions {
  db: Db;
}

export function createSessionsRouter({ db }: SessionsRouterOptions): Router {
  const router = Router();

  router.get('/api/sessions', async (req: Request, res: Response) => {
    const rawPage = parseInt(req.query.page as string, 10);
    const rawLimit = parseInt(req.query.limit as string, 10);

    const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
    const limit =
      Number.isInteger(rawLimit) && rawLimit >= 1
        ? Math.min(rawLimit, SESSIONS_LIMIT_MAX)
        : 20;

    const skip = (page - 1) * limit;

    const pipeline = [
      { $sort: { session_id: 1, ts: 1, _id: 1 } as const },
      {
        $group: {
          _id: '$session_id',
          event_count: { $sum: 1 },
          first_seen: { $first: '$ts' },
          last_seen: { $last: '$ts' },
          entry_path: { $first: '$path' },
        },
      },
      { $sort: { last_seen: -1, _id: 1 } as const },
      { $skip: skip },
      { $limit: limit },
    ];

    const [items, countResult] = await Promise.all([
      db.collection('events').aggregate(pipeline).toArray(),
      db
        .collection('events')
        .aggregate([{ $group: { _id: '$session_id' } }, { $count: 'total' }])
        .toArray(),
    ]);

    const total = countResult[0]?.total ?? 0;

    const data = items.map((item) => ({
      session_id: item._id as string,
      event_count: item.event_count as number,
      first_seen: item.first_seen as Date,
      last_seen: item.last_seen as Date,
      entry_path: item.entry_path as string,
    }));

    res.status(200).json({
      data,
      total,
      page,
      limit,
    });
  });

  return router;
}
