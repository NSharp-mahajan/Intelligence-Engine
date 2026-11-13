import 'dotenv/config';

import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';

import skillsRoutes from './routes/skills';
import opportunitiesRoutes from './routes/opportunities';
import dashboardRoutes from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

const rawFrontendUrl = process.env.FRONTEND_URL?.trim();
const normalizedFrontendUrl = rawFrontendUrl ? rawFrontendUrl.replace(/\/+$/, '') : undefined;

const allowedOrigins = [
  rawFrontendUrl,
  normalizedFrontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes(normalizedOrigin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

// Prevent proxy and browser caching of sensitive auth, profile, and dashboard state
app.use((req, res, next) => {
  if (
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/profile') ||
    req.path.startsWith('/api/dashboard')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.json());
app.use(cookieParser());
// Register Clerk before any route calls getAuth() or requireAuth().
// This makes token verification and request auth state available consistently,
// including the first request to the session/profile sync endpoint.
app.use(clerkMiddleware());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is alive' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
