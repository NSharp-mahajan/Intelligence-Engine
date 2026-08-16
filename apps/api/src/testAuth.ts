import { prisma } from './lib/prisma';

async function main() {
  console.log('Testing authentication flows...');
  
  // Cleanup test data first
  await prisma.user.deleteMany({ where: { email: { in: ['usera@example.com', 'userb@example.com'] } } });

  try {
    // 1. Register User A
    const resA = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usera@example.com', password: 'password123' })
    });
    const userA = await resA.json();
    console.log('Register User A:', resA.status, userA.id ? 'Success' : 'Fail');
    const cookieA = resA.headers.get('set-cookie');
    const sessionIdA = cookieA?.split(';')[0].split('=')[1];

    // 2. Verify no profile
    const profileCount = await prisma.profile.count({ where: { userId: userA.id } });
    console.log('User A Profile count (should be 0):', profileCount);

    // 3. Verify session exists
    const sessionCount = await prisma.session.count({ where: { userId: userA.id } });
    console.log('User A Session count (should be 1):', sessionCount);

    // 4. Verify password is hashed
    const dbUserA = await prisma.user.findUnique({ where: { id: userA.id } });
    console.log('User A Password Hashed:', dbUserA?.passwordHash !== 'password123' ? 'Yes' : 'No');

    // 5. Login User A
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usera@example.com', password: 'password123' })
    });
    const cookieLogin = loginRes.headers.get('set-cookie');
    console.log('Login User A:', loginRes.status);
    const sessionIdLogin = cookieLogin?.split(';')[0].split('=')[1];

    // 6. GET /me
    const meRes = await fetch('http://localhost:3001/api/auth/me', {
      headers: { Cookie: `sessionId=${sessionIdLogin}` }
    });
    const meA = await meRes.json();
    console.log('GET /me User A:', meA.email === 'usera@example.com' ? 'Success' : 'Fail');

    // 7. Create User B
    const resB = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userb@example.com', password: 'password123' })
    });
    const userB = await resB.json();
    console.log('Register User B:', resB.status);

    // 8. Authenticate as User A
    const meRes2 = await fetch('http://localhost:3001/api/auth/me', {
      headers: { Cookie: `sessionId=${sessionIdLogin}` }
    });
    const meA2 = await meRes2.json();
    console.log('Auth as User A returns User A:', meA2.id === userA.id ? 'Success' : 'Fail');

    // 9. Attempt to impersonate User B
    const meRes3 = await fetch('http://localhost:3001/api/auth/me', {
      method: 'POST',
      headers: { Cookie: `sessionId=${sessionIdLogin}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userB.id })
    });
    // This is a GET endpoint normally, but even if sent in body, it should still be User A
    const meRes4 = await fetch('http://localhost:3001/api/auth/me', {
      headers: { Cookie: `sessionId=${sessionIdLogin}`, 'userId': userB.id } // Trying to spoof header
    });
    const meA3 = await meRes4.json();
    console.log('Impersonate blocked (returns User A):', meA3.id === userA.id ? 'Success' : 'Fail');

    // 10. Logout User A
    const logoutRes = await fetch('http://localhost:3001/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: `sessionId=${sessionIdLogin}` }
    });
    console.log('Logout User A:', logoutRes.status);

    // 11. Verify session gone
    const sessionGone = await prisma.session.findUnique({ where: { id: sessionIdLogin! } });
    console.log('Session is gone from DB:', !sessionGone ? 'Yes' : 'No');

    // 12. GET /me with old session
    const meResExpired = await fetch('http://localhost:3001/api/auth/me', {
      headers: { Cookie: `sessionId=${sessionIdLogin}` }
    });
    console.log('GET /me old session returns 401:', meResExpired.status === 401 ? 'Success' : 'Fail');

    // 13. Verify expired sessions are rejected
    const expiredSession = await prisma.session.create({
      data: {
        userId: userA.id,
        expiresAt: new Date(Date.now() - 10000)
      }
    });
    const meResExpired2 = await fetch('http://localhost:3001/api/auth/me', {
      headers: { Cookie: `sessionId=${expiredSession.id}` }
    });
    console.log('GET /me expired session returns 401:', meResExpired2.status === 401 ? 'Success' : 'Fail');

    // 14. Duplicate email
    const duplicateRes = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usera@example.com', password: 'password123' })
    });
    console.log('Duplicate email returns 400:', duplicateRes.status === 400 ? 'Success' : 'Fail');

    // 15. Invalid credentials
    const invalidLogin = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usera@example.com', password: 'wrongpassword' })
    });
    console.log('Invalid credentials returns 401:', invalidLogin.status === 401 ? 'Success' : 'Fail');

  } finally {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: { in: ['usera@example.com', 'userb@example.com'] } } });
    console.log('Test data cleaned up.');
    process.exit(0);
  }
}

main().catch(console.error);
