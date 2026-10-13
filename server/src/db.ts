import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

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
