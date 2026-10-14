import type { NextFunction, Request, Response } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/app.js';
import { startTestServer, type TestServerInstance } from './test-helper.js';

describe('App factory and security basics', () => {
  let instance: TestServerInstance;

  beforeAll(async () => {
    instance = await startTestServer();
  });

  afterAll(async () => {
    if (instance) {
      await instance.cleanup();
    }
  });

  it('/health returns 200 { status: "ok" }', async () => {
    const res = await fetch(`${instance.baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('includes helmet security headers and removes x-powered-by', async () => {
    const res = await fetch(`${instance.baseUrl}/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('/ready returns 200 when database ping succeeds', async () => {
    const res = await fetch(`${instance.baseUrl}/ready`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ready' });
  });

  it('an unknown path is 404 in the standard error shape', async () => {
    const res = await fetch(`${instance.baseUrl}/nonexistent-path`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  it('a read route called with Origin: https://evil.example returns no access-control-allow-origin header', async () => {
    const res = await fetch(`${instance.baseUrl}/api/sessions`, {
      method: 'GET',
      headers: {
        Origin: 'https://evil.example',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('a read route called with allowed DASHBOARD_ORIGIN returns access-control-allow-origin', async () => {
    const res = await fetch(`${instance.baseUrl}/api/sessions`, {
      method: 'GET',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    );
  });

  it('a read route preflight called with allowed DASHBOARD_ORIGIN returns access-control-allow-origin', async () => {
    const res = await fetch(`${instance.baseUrl}/api/sessions`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    );
  });

  it('the ingest preflight returns * for access-control-allow-origin', async () => {
    const res = await fetch(`${instance.baseUrl}/api/events`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://any-storefront.example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('sets trust proxy to 1', () => {
    expect(instance.app.get('trust proxy')).toBe(1);
  });

  it('hides internals on 500 and returns standard error shape', () => {
    let capturedStatus = 0;
    let capturedJson: unknown = null;
    const mockRes = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(data: unknown) {
        capturedJson = data;
        return this;
      },
    } as unknown as Response;

    errorHandler(
      new Error('Sensitive internal details'),
      {} as Request,
      mockRes,
      (() => {}) as unknown as NextFunction,
    );

    expect(capturedStatus).toBe(500);
    expect(capturedJson).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
    expect(JSON.stringify(capturedJson)).not.toContain(
      'Sensitive internal details',
    );
  });
});
