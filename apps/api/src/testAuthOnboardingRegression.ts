import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import { isProfileComplete } from './lib/profileCompleteness';
import { AuthRequest } from './middlewares/authMiddleware';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failed++;
  }
}

// Mock app replicating index.ts middleware and route mounting
function createTestApp() {
  const app = express();

  const allowedOrigins = [
    'https://intelligence-engine-livid.vercel.app',
    'http://localhost:3000',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }));

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
  app.use(clerkMiddleware());

  // Test harness auth injector:
  // If header 'x-test-clerk-user-id' is set, simulate Clerk auth object on req
  app.use((req: AuthRequest, _res, next) => {
    const testClerkId = req.headers['x-test-clerk-user-id'] as string;
    if (testClerkId) {
      (req as any).auth = {
        userId: testClerkId,
      };
    }
    const testUserId = req.headers['x-test-user-id'] as string;
    if (testUserId) {
      req.userId = testUserId;
    }
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);

  return app;
}

async function runRegressionTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Udaan Auth & Onboarding Regression Suite');
  console.log('======================================================\n');

  const app = createTestApp();
  const testClerkId = `clerk_test_${Date.now()}`;
  const testEmail = `test_candidate_${Date.now()}@example.com`;

  try {
    // -------------------------------------------------------------------------
    // 1. CORS Normalization Verification
    // -------------------------------------------------------------------------
    console.log('[Suite 1] CORS Preflight & Trailing Slash Normalization');
    const corsRes = await request(app)
      .options('/api/auth/sync')
      .set('Origin', 'https://intelligence-engine-livid.vercel.app/')
      .set('Access-Control-Request-Method', 'POST');

    assert(corsRes.status === 204, 'Preflight with trailing slash origin returns 204');
    assert(
      corsRes.headers['access-control-allow-origin'] === 'https://intelligence-engine-livid.vercel.app/',
      'Preflight sets Access-Control-Allow-Origin'
    );

    // -------------------------------------------------------------------------
    // 2. Token Not Yet Available / Unauthenticated Access
    // -------------------------------------------------------------------------
    console.log('\n[Suite 2] Token Not Yet Available / Missing Session');
    const noTokenMeRes = await request(app).get('/api/auth/me');
    assert(noTokenMeRes.status === 401, 'GET /api/auth/me without token returns 401');
    assert(noTokenMeRes.body?.error?.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
    assert(noTokenMeRes.headers['cache-control']?.includes('no-store'), 'Response includes Cache-Control: no-store');

    const noTokenProfileRes = await request(app).get('/api/profile');
    assert(noTokenProfileRes.status === 401, 'GET /api/profile without token returns 401');
    assert(noTokenProfileRes.body?.error?.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

    // -------------------------------------------------------------------------
    // 3. User Not Mapped in Database
    // -------------------------------------------------------------------------
    console.log('\n[Suite 3] Clerk Session Exists but Internal User Not Mapped');
    const unmappedRes = await request(app)
      .get('/api/auth/me')
      .set('x-test-clerk-user-id', testClerkId);

    assert(unmappedRes.status === 401, 'GET /api/auth/me for unmapped user returns 401');
    assert(unmappedRes.body?.error?.code === 'USER_NOT_MAPPED', 'Returns specific USER_NOT_MAPPED code for recovery');

    // -------------------------------------------------------------------------
    // 4. Account Mapping / User Creation
    // -------------------------------------------------------------------------
    console.log('\n[Suite 4] Internal User Creation & Sync');
    // Pre-create user in DB directly to simulate Clerk sync completion
    const createdUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        clerkId: testClerkId,
        email: testEmail,
      },
    });
    assert(Boolean(createdUser.id), 'User successfully mapped and created in PostgreSQL');

    // Now GET /api/auth/me should succeed with profileComplete: false
    const mappedMeRes = await request(app)
      .get('/api/auth/me')
      .set('x-test-clerk-user-id', testClerkId);

    assert(mappedMeRes.status === 200, 'GET /api/auth/me returns 200 after mapping');
    assert(mappedMeRes.body.profile === null, 'Profile is initially null');
    assert(mappedMeRes.body.profileComplete === false, 'profileComplete is false before onboarding');
    assert(mappedMeRes.headers['cache-control']?.includes('no-store'), 'Includes Cache-Control: no-store');

    // -------------------------------------------------------------------------
    // 5. Incomplete Profile Rejection Logic
    // -------------------------------------------------------------------------
    console.log('\n[Suite 5] Profile Completeness Verification & Rejection Logic');
    assert(
      isProfileComplete(null) === false,
      'isProfileComplete(null) is false'
    );
    assert(
      isProfileComplete({ fullName: 'Alice', university: null, targetRole: 'AI Engineer' }) === false,
      'Profile without university is rejected'
    );
    assert(
      isProfileComplete({ fullName: 'Alice', university: 'MIT', targetRole: null }) === false,
      'Profile without targetRole is rejected'
    );
    assert(
      isProfileComplete({ fullName: '', university: 'MIT', targetRole: 'AI Engineer' }) === false,
      'Profile without fullName is rejected'
    );
    assert(
      isProfileComplete({ fullName: 'Alice', university: 'MIT', targetRole: 'AI Engineer' }) === true,
      'Profile with fullName, university, and targetRole is accepted'
    );

    // -------------------------------------------------------------------------
    // 6. Cross-Step Validation Tests (Frontend Form Contract)
    // -------------------------------------------------------------------------
    console.log('\n[Suite 6] Onboarding Cross-Step Validation Contract');
    // Test backend rejects invalid CGPA without scale
    const invalidCgpaRes = await request(app)
      .post('/api/profile')
      .set('x-test-clerk-user-id', testClerkId)
      .send({
        fullName: 'Alice Test',
        university: 'Stanford',
        targetRole: 'Software Engineer',
        cgpa: 3.8, // missing cgpaScale
      });
    assert(invalidCgpaRes.status === 400, 'POST /api/profile rejects CGPA missing scale');

    // Test backend rejects CGPA exceeding scale maximum
    const outOfBoundsCgpaRes = await request(app)
      .post('/api/profile')
      .set('x-test-clerk-user-id', testClerkId)
      .send({
        fullName: 'Alice Test',
        university: 'Stanford',
        targetRole: 'Software Engineer',
        cgpa: 8.5,
        cgpaScale: 'SCALE_4_0',
      });
    assert(outOfBoundsCgpaRes.status === 400, 'POST /api/profile rejects CGPA > 4.0 for SCALE_4_0');

    // -------------------------------------------------------------------------
    // 7. Successful Profile Creation & Onboarding Transition
    // -------------------------------------------------------------------------
    console.log('\n[Suite 7] Successful Profile Creation & Onboarding Completion');
    const validProfilePayload = {
      fullName: 'Alice Candidate',
      university: 'Stanford University',
      targetRole: 'AI Engineer',
      graduationYear: 2026,
      cgpa: 3.9,
      cgpaScale: 'SCALE_4_0',
      githubUrl: 'https://github.com/alice',
      linkedinUrl: 'https://linkedin.com/in/alice',
      portfolioUrl: 'https://alice.dev',
    };

    const createProfileRes = await request(app)
      .post('/api/profile')
      .set('x-test-clerk-user-id', testClerkId)
      .send(validProfilePayload);

    assert(createProfileRes.status === 201, 'POST /api/profile returns 201 Created');
    assert(createProfileRes.body?.profile?.fullName === 'Alice Candidate', 'Created profile name matches');
    assert(createProfileRes.body?.profileComplete === true, 'Response profileComplete is true');
    assert(createProfileRes.headers['cache-control']?.includes('no-store'), 'POST /profile returns Cache-Control: no-store');

    // -------------------------------------------------------------------------
    // 8. No Redirect Loop: /auth/me returns profileComplete === true
    // -------------------------------------------------------------------------
    console.log('\n[Suite 8] Post-Onboarding Session Refresh (No Redirect Loop)');
    const postOnboardingMeRes = await request(app)
      .get('/api/auth/me')
      .set('x-test-clerk-user-id', testClerkId);

    assert(postOnboardingMeRes.status === 200, 'GET /api/auth/me returns 200');
    assert(postOnboardingMeRes.body?.profileComplete === true, 'profileComplete is strictly true');
    assert(postOnboardingMeRes.body?.profile?.targetRole === 'AI Engineer', 'Profile contains targetRole');
    assert(postOnboardingMeRes.headers['cache-control']?.includes('no-store'), 'Prevents stale cache redirects');

    // -------------------------------------------------------------------------
    // 9. Profile Update (PUT /profile) & PROFILE_EXISTS Auto-Recovery
    // -------------------------------------------------------------------------
    console.log('\n[Suite 9] Profile Duplicate Conflict (409) & PUT Update');
    const duplicatePostRes = await request(app)
      .post('/api/profile')
      .set('x-test-clerk-user-id', testClerkId)
      .send(validProfilePayload);

    assert(duplicatePostRes.status === 409, 'Submitting POST when profile exists returns 409 PROFILE_EXISTS');
    assert(duplicatePostRes.body?.error?.code === 'PROFILE_EXISTS', 'Error code is PROFILE_EXISTS');

    const updateProfileRes = await request(app)
      .put('/api/profile')
      .set('x-test-clerk-user-id', testClerkId)
      .send({
        ...validProfilePayload,
        targetRole: 'Senior AI Engineer',
      });

    assert(updateProfileRes.status === 200, 'PUT /api/profile returns 200 OK');
    assert(updateProfileRes.body?.profile?.targetRole === 'Senior AI Engineer', 'Target role updated successfully');
    assert(updateProfileRes.body?.profileComplete === true, 'Updated profile remains complete');

    // Cleanup test data
    await prisma.user.delete({ where: { id: createdUser.id } });
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests();
