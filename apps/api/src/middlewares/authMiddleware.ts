import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth as clerkRequireAuth, getAuth } from '@clerk/express';

export interface AuthRequest extends Request {
  userId?: string;
  auth?: any;
}

export const requireAuth = [
  clerkRequireAuth(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      if (!auth || !auth.userId) {
        res.status(401).json({ error: 'Unauthorized: No Clerk session' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId },
      });

      if (!user) {
        res.status(401).json({ error: 'Unauthorized: No internal user mapping found.' });
        return;
      }

      // Maintain existing ownership model by injecting the internal user ID
      req.userId = user.id;
      next();
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }
];
