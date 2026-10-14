import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import express from 'express';
import { MongoClient, type Db } from 'mongodb';
import { createApp } from '../server/src/app.js';
import type { Config } from '../server/src/config.js';
import { syncIndexes } from '../server/src/db.js';

export interface E2eInstance {
  apiUrl: string;
  staticUrl: string;
  db: Db;
  client: MongoClient;
  dbName: string;
  cleanup: () => Promise<void>;
}

export async function startE2e(): Promise<E2eInstance> {
  const mongoUrlBase =
    process.env.MONGO_URL_TEST || 'mongodb://localhost:27017';
  const dbName = `cf_e2e_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const mongoUrl = `${mongoUrlBase.replace(/\/$/, '')}/${dbName}`;

  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  await syncIndexes(db);

  const config: Config = {
    NODE_ENV: 'test',
    PORT: 0,
    MONGO_URL: mongoUrl,
    DASHBOARD_ORIGIN: '*',
    RATE_LIMIT_ENABLED: false,
    INGEST_ENABLED: true,
    LOG_LEVEL: 'silent',
  };

  const app = createApp({ db, config });

  const apiServer = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const apiAddr = apiServer.address() as AddressInfo;
  const apiUrl = `http://127.0.0.1:${apiAddr.port}`;

  // Build the tracker with the test API URL and copy demo pages
  execSync(`npx tsx tracker/build.ts`, { cwd: process.cwd(), stdio: 'pipe' });
  execSync(`npx tsx scripts/copy-demo.ts`, {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env, VITE_API_URL: apiUrl },
  });

  // Serve the static files (cf.js + demo pages)
  const staticApp = express();
  staticApp.use(express.static('dashboard/public'));
  const staticServer = await new Promise<Server>((resolve) => {
    const s = staticApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const staticAddr = staticServer.address() as AddressInfo;
  const staticUrl = `http://127.0.0.1:${staticAddr.port}`;

  const cleanup = async () => {
    await new Promise<void>((r, e) =>
      staticServer.close((err) => (err ? e(err) : r())),
    );
    await new Promise<void>((r, e) =>
      apiServer.close((err) => (err ? e(err) : r())),
    );
    try {
      await db.dropDatabase();
    } finally {
      await client.close();
    }
  };

  return { apiUrl, staticUrl, db, client, dbName, cleanup };
}
