import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    res.status(401).json({ error: 'Unauthorized: No session provided' });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid session' });
      return;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sessionId } });
      res.clearCookie('sessionId');
      res.status(401).json({ error: 'Unauthorized: Session expired' });
      return;
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};
