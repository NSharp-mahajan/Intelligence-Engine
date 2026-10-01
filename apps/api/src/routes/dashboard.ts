import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import { DashboardService } from '../services/dashboardService';

const router = Router();

// GET /api/dashboard - Get personalized dashboard intelligence
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const dashboardService = new DashboardService(prisma);
    const data = await dashboardService.getDashboardData(req.userId!);
    res.json(data);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
