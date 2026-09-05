import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth as clerkRequireAuth, getAuth, clerkClient } from '@clerk/express';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/auth/sync
// Syncs a Clerk user with the internal DB. Creates or maps the internal User if missing.
router.post('/sync', clerkRequireAuth(), async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      res.status(401).json({ error: 'Unauthorized: No Clerk session' });
      return;
    }

    const clerkUserId = auth.userId;

    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: { profile: true },
    });

    if (!user) {
      // Need to fetch email from Clerk to store locally.
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) {
        res.status(400).json({ error: 'No email found in Clerk user' });
        return;
      }

      // Check if a user with this email exists (from the old auth system)
      user = await prisma.user.findUnique({ 
        where: { email },
        include: { profile: true }
      });
      
      if (user) {
        // Link existing internal user to Clerk
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId: clerkUserId },
          include: { profile: true }
        });
      } else {
        // Create brand new internal user
        user = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            email,
          },
          include: { profile: true }
        });
      }
    }

    res.json({
      id: user.id,
      email: user.email,
      profile: user.profile,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sync error:', errorMessage, error);
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      profile: user.profile,
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Note: /login, /register, and /logout are removed because Clerk handles authentication entirely.

export default router;
