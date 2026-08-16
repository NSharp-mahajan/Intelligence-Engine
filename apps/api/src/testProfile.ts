import 'dotenv/config';
import { prisma } from './lib/prisma';

async function main() {
  console.log('Testing Profile Onboarding Flow...');
  
  // Cleanup test data first
  await prisma.user.deleteMany({ where: { email: { in: ['userA@test.com', 'userB@test.com'] } } });

  try {
    // 1. Register User A
    const resA = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userA@test.com', password: 'password123' })
    });
    const userA = await resA.json();
    console.log('1. Register User A:', resA.status);

    // 2. Login User A
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userA@test.com', password: 'password123' })
    });
    const cookieA = loginRes.headers.get('set-cookie')?.split(';')[0];
    console.log('2. Login User A:', loginRes.status);

    // 3. Confirm User A has no Profile
    const profileCountA = await prisma.profile.count({ where: { userId: userA.id } });
    console.log('3. User A has no Profile initially:', profileCountA === 0 ? 'Success' : 'Fail');

    // 4 & 5. Submit Onboarding (PATCH /profile)
    const profileData = {
      fullName: 'Alice Test',
      university: 'State Uni',
      graduationYear: 2024,
      targetRole: 'SWE'
    };
    const onboardRes = await fetch('http://localhost:3001/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA! },
      body: JSON.stringify(profileData)
    });
    console.log('4/5. Submit Onboarding:', onboardRes.status);

    // 6 & 7. Confirm Profile row exists and belongs to User A
    const dbProfileA = await prisma.profile.findUnique({ where: { userId: userA.id } });
    console.log('6/7. Profile created for User A in DB:', dbProfileA?.fullName === 'Alice Test' ? 'Success' : 'Fail');

    // 8 & 9. Refresh frontend (GET /profile)
    const getRes = await fetch('http://localhost:3001/api/profile', {
      headers: { Cookie: cookieA! }
    });
    const loadedProfile = await getRes.json();
    console.log('8/9. Loaded profile via API matches:', loadedProfile.profile?.fullName === 'Alice Test' ? 'Success' : 'Fail');

    // 10 & 11. Logout & Login again
    await fetch('http://localhost:3001/api/auth/logout', { method: 'POST', headers: { Cookie: cookieA! } });
    const loginRes2 = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userA@test.com', password: 'password123' })
    });
    const cookieA2 = loginRes2.headers.get('set-cookie')?.split(';')[0];
    
    // 12. Confirm profile still exists
    const getRes2 = await fetch('http://localhost:3001/api/profile', { headers: { Cookie: cookieA2! } });
    const loadedProfile2 = await getRes2.json();
    console.log('10/11/12. Profile persists after relogin:', loadedProfile2.profile?.fullName === 'Alice Test' ? 'Success' : 'Fail');

    // 13 & 14 & 15. Modify Profile
    await fetch('http://localhost:3001/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA2! },
      body: JSON.stringify({ ...profileData, targetRole: 'Senior SWE' })
    });
    const getRes3 = await fetch('http://localhost:3001/api/profile', { headers: { Cookie: cookieA2! } });
    const loadedProfile3 = await getRes3.json();
    console.log('13/14/15. Profile modification persists:', loadedProfile3.profile?.targetRole === 'Senior SWE' ? 'Success' : 'Fail');

    // 16. Create User B
    const resB = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userB@test.com', password: 'password123' })
    });
    const userB = await resB.json();
    
    const loginResB = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userB@test.com', password: 'password123' })
    });
    const cookieB = loginResB.headers.get('set-cookie')?.split(';')[0];
    console.log('16. User B created & logged in:', loginResB.status);

    // 17. Confirm User B cannot access User A's profile
    const getResB = await fetch('http://localhost:3001/api/profile', { headers: { Cookie: cookieB! } });
    const profileB = await getResB.json();
    console.log('17. User B accessing /profile gets empty profile:', profileB.profile === null ? 'Success' : 'Fail');

    // Authorization test: User B attempts to modify User A's profile by passing User A's ID
    const hackRes = await fetch('http://localhost:3001/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB! },
      body: JSON.stringify({ ...profileData, userId: userA.id, fullName: 'Hacked Name' })
    });
    
    // User A should remain unmodified
    const checkUserA = await prisma.profile.findUnique({ where: { userId: userA.id } });
    console.log('17(b). User B cannot spoof userId to modify User A:', checkUserA?.fullName !== 'Hacked Name' ? 'Success' : 'Fail');

  } finally {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: { in: ['userA@test.com', 'userB@test.com'] } } });
    console.log('Test data cleaned up.');
    process.exit(0);
  }
}

main().catch(console.error);
