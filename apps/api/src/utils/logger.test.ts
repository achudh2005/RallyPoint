import { describe, it, expect, vi } from 'vitest';
import { logger, requestLogger } from './logger.js';
import type { Request, Response, NextFunction } from 'express';

describe('Structured Logger', () => {
  it('formats info logs with ISO timestamp and metadata', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Test message', { key: 'value' });
    expect(spy).toHaveBeenCalled();
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('Test message');
    expect(parsed.meta).toEqual({ key: 'value' });
    expect(parsed.timestamp).toBeDefined();
    spy.mockRestore();
  });

  it('formats error logs correctly', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Error occurred');
    expect(spy).toHaveBeenCalled();
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('Error occurred');
    spy.mockRestore();
  });

  it('attaches requestLogger to response finish event', () => {
    const req = { method: 'GET', originalUrl: '/test', get: () => 'agent' } as unknown as Request;
    let finishCallback: () => void = () => {};
    const res = {
      statusCode: 200,
      on: (event: string, cb: () => void) => {
        if (event === 'finish') finishCallback = cb;
      },
    } as unknown as Response;
    const next: NextFunction = vi.fn();

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    finishCallback();
    expect(spy).toHaveBeenCalled();
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.message).toBe('HTTP Request');
    expect(parsed.meta.status).toBe(200);
    expect(parsed.meta.path).toBe('/test');
    spy.mockRestore();
  });
});
