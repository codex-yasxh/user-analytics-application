import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

const PORT = Number(process.env.PORT || 4001);

export const handler = (req: IncomingMessage, res: ServerResponse): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: { code: 'NOT_FOUND', message: 'Route not found' },
      }),
    );
    return;
  }

  let body = '';
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const parsed = JSON.parse(body) as { events?: unknown[] };
      const count = Array.isArray(parsed?.events) ? parsed.events.length : 0;
      process.stdout.write(
        `[mock-ingest] Batch received: ${count} event(s)\n${JSON.stringify(parsed, null, 2)}\n`,
      );
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          accepted: count,
          duplicates: 0,
          rejected: 0,
        }),
      );
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: { code: 'BAD_REQUEST', message: 'Invalid JSON payload' },
        }),
      );
    }
  });
};

export const server = createServer(handler);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    process.stdout.write(
      `Mock ingest server listening on http://localhost:${PORT}\n`,
    );
  });
}
