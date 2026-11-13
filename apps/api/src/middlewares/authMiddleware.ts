import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getAuth } from '@clerk/express';

export interface AuthRequest extends Request {
  userId?: string;
  auth?: ReturnType<typeof getAuth>;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userId) {
    return next();
  }
  try {
    let clerkUserId: string | undefined;
    try {
      const auth = getAuth(req);
      clerkUserId = auth?.userId ?? undefined;
    } catch {
      // In mock test environments where clerkMiddleware was not run, fallback to mock properties
      if (typeof req.auth === 'object' && req.auth && 'userId' in req.auth) {
        clerkUserId = (req.auth as { userId?: string }).userId;
      }
    }

    if (!clerkUserId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
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
};
