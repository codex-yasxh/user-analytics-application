import { closeDb, connectDb, syncIndexes } from '../server/src/db.js';

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cf';

async function main() {
  process.stdout.write(`Connecting to MongoDB at ${mongoUrl}...\n`);
  const db = await connectDb(mongoUrl);
  const indexNames = await syncIndexes(db);
  process.stdout.write(
    `Successfully synced indexes: ${indexNames.join(', ')}\n`,
  );
  await closeDb();
}

main().catch(async (err) => {
  process.stderr.write(`Failed to sync indexes: ${err}\n`);
  await closeDb();
  process.exit(1);
});
