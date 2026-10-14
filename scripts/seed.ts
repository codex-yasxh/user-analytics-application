import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { bucketOf } from '../packages/shared/src/bucket-of.js';
import { normalizePath } from '../packages/shared/src/normalize-path.js';

interface HotspotRect {
  selector: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const FALLBACK_HOTSPOTS: Record<string, Record<string, HotspotRect[]>> = {
  desktop: {
    home: [
      { selector: 'a.nav-products', x: 1040, y: 25, w: 75, h: 24 },
      { selector: 'button.add-to-cart', x: 260, y: 430, w: 180, h: 38 },
      { selector: 'button.add-to-cart', x: 610, y: 430, w: 180, h: 38 },
      { selector: 'button.add-to-cart', x: 960, y: 430, w: 180, h: 38 },
    ],
    product: [
      { selector: 'a.nav-products', x: 1040, y: 25, w: 75, h: 24 },
      { selector: 'button.add-to-cart', x: 670, y: 470, w: 140, h: 48 },
      { selector: 'button.buy-now', x: 830, y: 470, w: 140, h: 48 },
      { selector: 'button.quick-view', x: 670, y: 535, w: 170, h: 36 },
    ],
    checkout: [
      { selector: 'input#name', x: 340, y: 170, w: 280, h: 38 },
      { selector: 'button.place-order', x: 340, y: 390, w: 280, h: 44 },
    ],
  },
  tablet: {
    home: [
      { selector: 'a.nav-products', x: 620, y: 25, w: 65, h: 24 },
      { selector: 'button.add-to-cart', x: 230, y: 410, w: 160, h: 38 },
      { selector: 'button.add-to-cart', x: 530, y: 410, w: 160, h: 38 },
    ],
    product: [
      { selector: 'a.nav-products', x: 620, y: 25, w: 65, h: 24 },
      { selector: 'button.add-to-cart', x: 440, y: 450, w: 130, h: 44 },
      { selector: 'button.buy-now', x: 585, y: 450, w: 130, h: 44 },
    ],
    checkout: [
      { selector: 'button.place-order', x: 240, y: 380, w: 280, h: 44 },
    ],
  },
  mobile: {
    home: [
      { selector: 'a.nav-products', x: 290, y: 22, w: 60, h: 22 },
      { selector: 'button.add-to-cart', x: 195, y: 460, w: 160, h: 38 },
    ],
    product: [
      { selector: 'button.add-to-cart', x: 120, y: 520, w: 140, h: 44 },
      { selector: 'button.buy-now', x: 270, y: 520, w: 100, h: 44 },
    ],
    checkout: [
      { selector: 'button.place-order', x: 195, y: 420, w: 320, h: 44 },
    ],
  },
};

function loadHotspots(): Record<string, Record<string, HotspotRect[]>> {
  const jsonPath = path.resolve(process.cwd(), 'scripts', 'hotspots.json');
  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(raw) as Record<string, Record<string, HotspotRect[]>>;
  } catch {
    return FALLBACK_HOTSPOTS;
  }
}

const VIEWPORT_SIZES = {
  desktop: { vw: 1280, vh: 800, doc_w: 1280, doc_h: 1200 },
  tablet: { vw: 768, vh: 1024, doc_w: 768, doc_h: 1400 },
  mobile: { vw: 390, vh: 844, doc_w: 390, doc_h: 1800 },
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export async function seedDatabase(
  options: {
    mongoUrl?: string;
    demoOrigin?: string;
    sessionCount?: number;
  } = {},
): Promise<{ sessionsCount: number; eventsCount: number }> {
  const mongoUrl =
    options.mongoUrl || process.env.MONGO_URL || 'mongodb://localhost:27017/cf';
  const demoOrigin = (
    options.demoOrigin ||
    process.env.DEMO_ORIGIN ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
  const sessionCount = options.sessionCount || 30;
  const HOTSPOTS = loadHotspots();

  const client = new MongoClient(mongoUrl);
  await client.connect();

  const db = client.db();
  const collection = db.collection('events');

  // Delete previous seed data for idempotency
  await collection.deleteMany({ src: 'seed' });

  const homeUrl = `${demoOrigin}/demo/home.html`;
  const productUrl = `${demoOrigin}/demo/product.html`;
  const checkoutUrl = `${demoOrigin}/demo/checkout.html`;

  const paths = {
    home: normalizePath(homeUrl),
    product: normalizePath(productUrl),
    checkout: normalizePath(checkoutUrl),
  };

  interface SeedEventDoc {
    eid: string;
    session_id: string;
    type: 'page_view' | 'click';
    url: string;
    path: string;
    ts: Date;
    received_at: Date;
    src: 'seed';
    vw: number;
    vh: number;
    vw_bucket: string;
    x?: number;
    y?: number;
    doc_w?: number;
    doc_h?: number;
    sel?: string;
  }

  const now = Date.now();
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  const allEvents: SeedEventDoc[] = [];

  for (let s = 0; s < sessionCount; s++) {
    const sessionId = crypto.randomUUID();
    // Spread sessions over the last 14 days
    const sessionStartTime = now - Math.floor(Math.random() * TWO_WEEKS_MS);
    let currentTime = sessionStartTime;

    // Pick bucket: 60% desktop, 25% tablet, 15% mobile
    const rand = Math.random();
    const bucket = rand < 0.6 ? 'desktop' : rand < 0.85 ? 'tablet' : 'mobile';
    const vp = VIEWPORT_SIZES[bucket];

    // Page 1: Home
    allEvents.push({
      eid: crypto.randomUUID(),
      session_id: sessionId,
      type: 'page_view',
      url: homeUrl,
      path: paths.home,
      ts: new Date(currentTime),
      received_at: new Date(currentTime + 50),
      src: 'seed',
      vw: vp.vw,
      vh: vp.vh,
      vw_bucket: bucketOf(vp.vw),
    });

    currentTime += Math.floor(randomBetween(2000, 8000));

    // Home clicks
    const homeHotspots = HOTSPOTS[bucket].home;
    const homeClickCount = Math.floor(randomBetween(1, 3));
    for (let c = 0; c < homeClickCount; c++) {
      const target =
        homeHotspots[Math.floor(Math.random() * homeHotspots.length)];
      const x = Math.round(
        target.x + randomBetween(-target.w / 3, target.w / 3),
      );
      const y = Math.round(
        target.y + randomBetween(-target.h / 3, target.h / 3),
      );

      allEvents.push({
        eid: crypto.randomUUID(),
        session_id: sessionId,
        type: 'click',
        url: homeUrl,
        path: paths.home,
        ts: new Date(currentTime),
        received_at: new Date(currentTime + 50),
        src: 'seed',
        vw: vp.vw,
        vh: vp.vh,
        vw_bucket: bucketOf(vp.vw),
        x,
        y,
        doc_w: vp.doc_w,
        doc_h: vp.doc_h,
        sel: target.selector,
      });

      currentTime += Math.floor(randomBetween(1500, 5000));
    }

    // 70% of sessions proceed to product page
    if (Math.random() < 0.7) {
      allEvents.push({
        eid: crypto.randomUUID(),
        session_id: sessionId,
        type: 'page_view',
        url: productUrl,
        path: paths.product,
        ts: new Date(currentTime),
        received_at: new Date(currentTime + 50),
        src: 'seed',
        vw: vp.vw,
        vh: vp.vh,
        vw_bucket: bucketOf(vp.vw),
      });

      currentTime += Math.floor(randomBetween(3000, 10000));

      // Product clicks
      const productHotspots = HOTSPOTS[bucket].product;
      const productClickCount = Math.floor(randomBetween(1, 3));
      for (let c = 0; c < productClickCount; c++) {
        const target =
          productHotspots[Math.floor(Math.random() * productHotspots.length)];
        const x = Math.round(
          target.x + randomBetween(-target.w / 3, target.w / 3),
        );
        const y = Math.round(
          target.y + randomBetween(-target.h / 3, target.h / 3),
        );

        allEvents.push({
          eid: crypto.randomUUID(),
          session_id: sessionId,
          type: 'click',
          url: productUrl,
          path: paths.product,
          ts: new Date(currentTime),
          received_at: new Date(currentTime + 50),
          src: 'seed',
          vw: vp.vw,
          vh: vp.vh,
          vw_bucket: bucketOf(vp.vw),
          x,
          y,
          doc_w: vp.doc_w,
          doc_h: vp.doc_h,
          sel: target.selector,
        });

        currentTime += Math.floor(randomBetween(2000, 6000));
      }

      // 40% of sessions proceed to checkout
      if (Math.random() < 0.4) {
        allEvents.push({
          eid: crypto.randomUUID(),
          session_id: sessionId,
          type: 'page_view',
          url: checkoutUrl,
          path: paths.checkout,
          ts: new Date(currentTime),
          received_at: new Date(currentTime + 50),
          src: 'seed',
          vw: vp.vw,
          vh: vp.vh,
          vw_bucket: bucketOf(vp.vw),
        });

        currentTime += Math.floor(randomBetween(4000, 12000));

        const checkoutHotspots = HOTSPOTS[bucket].checkout;
        const target =
          checkoutHotspots[Math.floor(Math.random() * checkoutHotspots.length)];
        const x = Math.round(
          target.x + randomBetween(-target.w / 4, target.w / 4),
        );
        const y = Math.round(
          target.y + randomBetween(-target.h / 4, target.h / 4),
        );

        allEvents.push({
          eid: crypto.randomUUID(),
          session_id: sessionId,
          type: 'click',
          url: checkoutUrl,
          path: paths.checkout,
          ts: new Date(currentTime),
          received_at: new Date(currentTime + 50),
          src: 'seed',
          vw: vp.vw,
          vh: vp.vh,
          vw_bucket: bucketOf(vp.vw),
          x,
          y,
          doc_w: vp.doc_w,
          doc_h: vp.doc_h,
          sel: target.selector,
        });
      }
    }
  }

  // Insert all seed events in batches
  if (allEvents.length > 0) {
    await collection.insertMany(allEvents, { ordered: false });
  }

  await client.close();

  return { sessionsCount: sessionCount, eventsCount: allEvents.length };
}

// Direct execution from CLI
if (
  process.argv[1]?.endsWith('seed.ts') ||
  process.argv[1]?.endsWith('seed.js')
) {
  seedDatabase()
    .then(({ sessionsCount, eventsCount }) => {
      process.stdout.write(
        `Successfully seeded ${sessionsCount} sessions (${eventsCount} events) with src: "seed"\n`,
      );
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`Seeding failed: ${err}\n`);
      process.exit(1);
    });
}
