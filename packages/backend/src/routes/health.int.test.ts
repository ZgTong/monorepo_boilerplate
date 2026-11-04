import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

describe('GET /health/db against a real PostgreSQL', () => {
    afterAll(async () => {
        // Close the pg pool, otherwise open sockets keep the worker alive.
        await prisma.$disconnect();
    });

    it('returns ok when the database is reachable', async () => {
        const res = await request(createApp()).get('/health/db');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });
});
