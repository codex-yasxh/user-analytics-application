import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import type { Express } from 'express';
import { MongoClient, type Db } from 'mongodb';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { syncIndexes } from '../src/db.js';

export interface TestServerInstance {
  server: Server;
  app: Express;
  baseUrl: string;
  db: Db;
  client: MongoClient;
  dbName: string;
  config: Config;
  cleanup: () => Promise<void>;
}

export async function startTestServer(
  configOverrides: Partial<Config> = {},
): Promise<TestServerInstance> {
  const mongoUrlBase =
    process.env.MONGO_URL_TEST || 'mongodb://localhost:27017';
  const dbName = `cf_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const mongoUrl = `${mongoUrlBase.replace(/\/$/, '')}/${dbName}`;

  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  await syncIndexes(db);

  const config: Config = {
    NODE_ENV: 'test',
    PORT: 0,
    MONGO_URL: mongoUrl,
    DASHBOARD_ORIGIN: 'http://localhost:5173',
    RATE_LIMIT_ENABLED: false,
    INGEST_ENABLED: true,
    LOG_LEVEL: 'silent',
    ...configOverrides,
  };

  const app = createApp({ db, config });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const addr = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const cleanup = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    try {
      await db.dropDatabase();
    } finally {
      await client.close();
    }
  };

  return {
    server,
    app,
    baseUrl,
    db,
    client,
    dbName,
    config,
    cleanup,
  };
}
