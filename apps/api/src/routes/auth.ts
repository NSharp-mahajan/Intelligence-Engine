import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // For cross-origin dev if needed, or 'strict'
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
      return;
    }
    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User (NO Profile creation)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });

    // Create session in DB
    const expiresAt = new Date(Date.now() + cookieOptions.maxAge);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    // Set cookie
    res.cookie('sessionId', session.id, cookieOptions);

    // Return safe user data
    res.status(201).json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Create session in DB
    const expiresAt = new Date(Date.now() + cookieOptions.maxAge);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    // Set cookie
    res.cookie('sessionId', session.id, cookieOptions);

    // Return safe user data
    res.json({
      id: user.id,
      email: user.email,
      profile: user.profile,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId) {
    try {
      await prisma.session.delete({ where: { id: sessionId } });
    } catch (error) {
      // Ignore if session already doesn't exist
    }
  }

  res.clearCookie('sessionId', { ...cookieOptions, maxAge: 0 });
  res.json({ message: 'Logged out successfully' });
});

export default router;
