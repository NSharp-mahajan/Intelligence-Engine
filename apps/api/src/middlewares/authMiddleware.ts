import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth as clerkRequireAuth, getAuth } from '@clerk/express';

export interface AuthRequest extends Request {
  userId?: string;
  auth?: ReturnType<typeof getAuth>;
}

export const requireAuth = [
  clerkRequireAuth(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      if (!auth || !auth.userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId },
      });

      if (!user) {
        res.status(401).json({ error: { code: 'USER_NOT_MAPPED', message: 'Account is not available.' } });
        return;
      }

      // Maintain existing ownership model by injecting the internal user ID
      req.userId = user.id;
      next();
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
      return;
    }
  }
];
