import { Router } from 'express';
import { prisma } from '../db.js';

export const healthRouter = Router();

// Liveness: used by the ALB/ECS health check, must not depend on the database.
healthRouter.get('/', (_req, res) => {
    res.json({ status: 'ok' });
});

// Readiness: confirms the database is reachable.
healthRouter.get('/db', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok' });
    } catch {
        res.status(503).json({ status: 'unavailable' });
    }
});
