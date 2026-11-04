import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

// The failure path is hard to produce with a real database, so it is a unit test:
// replace the Prisma client with a stub whose query always fails.
// vi.mock is hoisted above the imports, so the stub it uses must be hoisted too.
const queryRaw = vi.hoisted(() =>
    vi.fn().mockRejectedValue(new Error('connection refused'))
);
vi.mock('../db.js', () => ({ prisma: { $queryRaw: queryRaw } }));

describe('GET /health/db when the database is down', () => {
    it('returns 503 without leaking the error', async () => {
        const res = await request(createApp()).get('/health/db');

        expect(res.status).toBe(503);
        expect(res.body).toEqual({ status: 'unavailable' });
        // Guards against a false pass: if the route stopped calling $queryRaw, a
        // TypeError from the stub would also end in the catch and return 503.
        expect(queryRaw).toHaveBeenCalledOnce();
    });
});
