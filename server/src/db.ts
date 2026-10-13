import { MongoClient, type Db, type IndexDescription } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export const INDEX_DEFINITIONS: IndexDescription[] = [
  {
    key: { eid: 1 },
    name: 'eid_unique',
    unique: true,
  },
  {
    key: { session_id: 1, ts: 1, _id: 1 },
    name: 'session_ts_id',
  },
  {
    key: { type: 1, path: 1, vw_bucket: 1, ts: -1 },
    name: 'heatmap_lookup',
  },
];

export async function connectDb(mongoUrl: string): Promise<Db> {
  if (db && client) {
    return db;
  }

  client = new MongoClient(mongoUrl, {
    serverSelectionTimeoutMS: 2000,
    connectTimeoutMS: 2000,
  });

  await client.connect();
  db = client.db();
  return db;
}

export function setDb(database: Db): void {
  db = database;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDb first.');
  }
  return db;
}

export async function pingDb(fallbackUrl?: string): Promise<boolean> {
  try {
    if (!client || !db) {
      if (fallbackUrl) {
        await connectDb(fallbackUrl);
      } else {
        return false;
      }
    }
    const res = await db!.admin().ping();
    return Boolean(res.ok);
  } catch {
    return false;
  }
}

export async function syncIndexes(database?: Db): Promise<string[]> {
  const targetDb = database || getDb();
  const collection = targetDb.collection('events');
  return collection.createIndexes(INDEX_DEFINITIONS);
}

export async function closeDb(): Promise<void> {
  if (client) {
    try {
      await client.close();
    } finally {
      client = null;
      db = null;
    }
  }
}
