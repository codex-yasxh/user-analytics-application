import { closeDb, connectDb } from '../server/src/db.js';

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cf';

interface ExplainPlan {
  queryPlanner: {
    winningPlan: Record<string, unknown>;
  };
}

async function explainQuery(
  db: import('mongodb').Db,
  label: string,
  run: (db: import('mongodb').Db) => Promise<unknown>,
) {
  process.stdout.write(`\n--- ${label} ---\n`);
  try {
    const plan = (await run(db)) as ExplainPlan;
    process.stdout.write(
      JSON.stringify(plan.queryPlanner.winningPlan, null, 2) + '\n',
    );
    const planStr = JSON.stringify(plan.queryPlanner.winningPlan);
    if (planStr.includes('"SORT"')) {
      process.stdout.write('  ⚠ WARNING: blocking in-memory SORT detected\n');
    } else {
      process.stdout.write('  ✓ No blocking SORT stage\n');
    }
  } catch (err) {
    process.stderr.write(`  Error: ${err}\n`);
  }
}

async function main() {
  process.stdout.write(`Connecting to MongoDB at ${mongoUrl}...\n`);
  const db = await connectDb(mongoUrl);

  await explainQuery(
    db,
    'Heatmap: clicks by path+bucket, sorted by ts desc',
    (d) =>
      d
        .collection('events')
        .find({
          type: 'click',
          path: 'https://example.com',
          vw_bucket: 'desktop',
        })
        .sort({ ts: -1 })
        .limit(5000)
        .explain('queryPlanner'),
  );

  await explainQuery(db, 'Elements: group clicks by sel', (d) =>
    d
      .collection('events')
      .aggregate(
        [
          {
            $match: {
              type: 'click',
              path: 'https://example.com',
              vw_bucket: 'desktop',
              sel: { $exists: true, $ne: '' },
            },
          },
          { $group: { _id: '$sel', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 200 },
        ],
        { explain: true },
      )
      .toArray()
      .then((r) => r[0]),
  );

  await explainQuery(
    db,
    'Sessions: group by session_id, sort by last_seen',
    (d) =>
      d
        .collection('events')
        .aggregate(
          [
            { $sort: { session_id: 1, ts: 1, _id: 1 } },
            {
              $group: {
                _id: '$session_id',
                event_count: { $sum: 1 },
                first_seen: { $first: '$ts' },
                last_seen: { $last: '$ts' },
                entry_path: { $first: '$path' },
              },
            },
            { $sort: { last_seen: -1 } },
            { $skip: 0 },
            { $limit: 20 },
          ],
          { explain: true },
        )
        .toArray()
        .then((r) => r[0]),
  );

  await explainQuery(db, 'Journey: events for one session, sorted by ts', (d) =>
    d
      .collection('events')
      .find({ session_id: '00000000-0000-0000-0000-000000000000' })
      .sort({ ts: 1, _id: 1 })
      .limit(1000)
      .explain('queryPlanner'),
  );

  await closeDb();
}

main().catch(async (err) => {
  process.stderr.write(`Failed: ${err}\n`);
  await closeDb();
  process.exit(1);
});
