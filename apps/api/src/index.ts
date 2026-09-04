import 'dotenv/config';

import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';

import skillsRoutes from './routes/skills';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
