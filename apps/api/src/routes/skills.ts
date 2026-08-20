import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/skills (Get all available skills in the system)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ skills });
  } catch (error) {
    console.error('Get all skills error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
