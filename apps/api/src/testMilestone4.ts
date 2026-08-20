import 'dotenv/config';
import { prisma } from './lib/prisma';
import request from 'supertest';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import skillsRoutes from './routes/skills';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/skills', skillsRoutes);

async function runTests() {
  console.log('--- STARTING MILESTONE 4 TESTS ---\n');

  // CLEANUP BEFORE TEST
  await prisma.session.deleteMany();
  await prisma.candidateSkill.deleteMany();
  await prisma.projectSkill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();

  // 1. Register User A
  let userACookie: string;
  const regResA = await request(app).post('/api/auth/register').send({ email: 'usera@test.com', password: 'password123' });
  if (regResA.status !== 201) throw new Error(`Register A failed: ${JSON.stringify(regResA.body)}`);
  userACookie = regResA.headers['set-cookie'][0];

  // 2. Register User B
  let userBCookie: string;
  const regResB = await request(app).post('/api/auth/register').send({ email: 'userb@test.com', password: 'password123' });
  if (regResB.status !== 201) throw new Error(`Register B failed: ${JSON.stringify(regResB.body)}`);
  userBCookie = regResB.headers['set-cookie'][0];

  console.log('✓ Users A and B logged in');

  // PROFILE TESTS
  console.log('\n--- TESTING PROFILES ---');
  
  // Test 1: Unauthenticated profile request -> 401
  const res1 = await request(app).get('/api/profile');
  if (res1.status === 401) console.log('✓ Unauthenticated request rejected (401)');
  else throw new Error(`Expected 401, got ${res1.status}`);

  // Test 2: Authenticated user without profile -> 404
  const res2 = await request(app).get('/api/profile').set('Cookie', userACookie);
  if (res2.status === 404 && res2.body.error.code === 'PROFILE_NOT_FOUND') console.log('✓ No profile returns 404');
  else throw new Error(`Expected 404 PROFILE_NOT_FOUND, got ${res2.status} ${JSON.stringify(res2.body)}`);

  // Test 3: Create profile
  const profilePayload = {
    fullName: 'User A',
    university: 'Test Univ',
    graduationYear: 2025,
    targetRole: 'SWE'
  };
  const res3 = await request(app).post('/api/profile').set('Cookie', userACookie).send(profilePayload);
  if (res3.status === 201 && res3.body.profile.fullName === 'User A') console.log('✓ Profile created');
  else throw new Error(`Expected 201, got ${res3.status} ${JSON.stringify(res3.body)}`);

  // Test 4: Retrieve profile
  const res4 = await request(app).get('/api/profile').set('Cookie', userACookie);
  if (res4.status === 200 && res4.body.profile.fullName === 'User A') console.log('✓ Profile retrieved');
  else throw new Error(`Expected 200, got ${res4.status}`);

  // Test 5: Update profile
  const res5 = await request(app).put('/api/profile').set('Cookie', userACookie).send({ ...profilePayload, fullName: 'User A Updated' });
  if (res5.status === 200 && res5.body.profile.fullName === 'User A Updated') console.log('✓ Profile updated');
  else throw new Error(`Expected 200, got ${res5.status}`);

  // Test 6: Invalid profile payload -> 400
  const res6 = await request(app).put('/api/profile').set('Cookie', userACookie).send({ fullName: '' });
  if (res6.status === 400 && res6.body.error.code === 'VALIDATION_ERROR') console.log('✓ Invalid profile payload rejected (400)');
  else throw new Error(`Expected 400, got ${res6.status}`);

  // SKILLS TESTS
  console.log('\n--- TESTING SKILLS ---');
  
  // Test 7: Add skill to Candidate
  const res7 = await request(app).post('/api/profile/skills').set('Cookie', userACookie).send({ skillName: 'React', category: 'FRAMEWORK' });
  if (res7.status === 201 && res7.body.candidateSkill.skill.name === 'react') console.log('✓ Skill added to candidate (normalized to lower case)');
  else throw new Error(`Expected 201, got ${res7.status} ${JSON.stringify(res7.body)}`);

  // Test 8: Duplicate skill association -> 409
  const res8 = await request(app).post('/api/profile/skills').set('Cookie', userACookie).send({ skillName: ' REACT ' });
  if (res8.status === 409) console.log('✓ Duplicate skill association rejected (409)');
  else throw new Error(`Expected 409, got ${res8.status} ${JSON.stringify(res8.body)}`);

  // Test 9: Retrieve candidate skills
  const res9 = await request(app).get('/api/profile/skills').set('Cookie', userACookie);
  if (res9.status === 200 && res9.body.candidateSkills.length === 1) console.log('✓ Candidate skills retrieved');
  else throw new Error(`Expected 200, got ${res9.status}`);

  const skillId = res7.body.candidateSkill.skillId;

  // Test 10: Remove candidate skill
  const res10 = await request(app).delete(`/api/profile/skills/${skillId}`).set('Cookie', userACookie);
  if (res10.status === 200) console.log('✓ Candidate skill removed');
  else throw new Error(`Expected 200, got ${res10.status}`);

  // PROJECTS TESTS
  console.log('\n--- TESTING PROJECTS ---');

  // Test 11: Create project
  const projectPayload = { name: 'My Project', description: 'Test project description' };
  const res11 = await request(app).post('/api/profile/projects').set('Cookie', userACookie).send(projectPayload);
  if (res11.status === 201) console.log('✓ Project created');
  else throw new Error(`Expected 201, got ${res11.status} ${JSON.stringify(res11.body)}`);
  
  const projectId = res11.body.project.id;

  // Test 12: Retrieve projects
  const res12 = await request(app).get('/api/profile/projects').set('Cookie', userACookie);
  if (res12.status === 200 && res12.body.projects.length === 1) console.log('✓ Projects retrieved');
  else throw new Error(`Expected 200, got ${res12.status}`);

  // Test 13: Add skill to project
  const res13 = await request(app).post(`/api/profile/projects/${projectId}/skills`).set('Cookie', userACookie).send({ skillName: 'Node.js' });
  if (res13.status === 201) console.log('✓ Skill added to project');
  else throw new Error(`Expected 201, got ${res13.status} ${JSON.stringify(res13.body)}`);

  // SECURITY TESTS
  console.log('\n--- TESTING OWNERSHIP & SECURITY ---');

  // First create profile for User B
  await request(app).post('/api/profile').set('Cookie', userBCookie).send({
    fullName: 'User B', university: 'Test Univ', targetRole: 'SWE'
  });

  // Test 14: User B cannot access User A's project
  const res14 = await request(app).get(`/api/profile/projects/${projectId}`).set('Cookie', userBCookie);
  if (res14.status === 404) console.log("✓ User B cannot read User A's project");
  else throw new Error(`Expected 404, got ${res14.status}`);

  // Test 15: User B cannot modify User A's project
  const res15 = await request(app).put(`/api/profile/projects/${projectId}`).set('Cookie', userBCookie).send({ name: 'Hacked', description: 'Hacked' });
  if (res15.status === 404) console.log("✓ User B cannot update User A's project");
  else throw new Error(`Expected 404, got ${res15.status}`);

  // Test 16: User B cannot attach skill to User A's project
  const res16 = await request(app).post(`/api/profile/projects/${projectId}/skills`).set('Cookie', userBCookie).send({ skillName: 'Hack' });
  if (res16.status === 404) console.log("✓ User B cannot attach skill to User A's project");
  else throw new Error(`Expected 404, got ${res16.status}`);

  // Test 17: User B cannot delete User A's project
  const res17 = await request(app).delete(`/api/profile/projects/${projectId}`).set('Cookie', userBCookie);
  if (res17.status === 404) console.log("✓ User B cannot delete User A's project");
  else throw new Error(`Expected 404, got ${res17.status}`);

  console.log('\n--- CLEANING UP ---');
  await prisma.session.deleteMany();
  await prisma.candidateSkill.deleteMany();
  await prisma.projectSkill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();

  // Final check
  const users = await prisma.user.count();
  const profiles = await prisma.profile.count();
  const projects = await prisma.project.count();
  
  if (users === 0 && profiles === 0 && projects === 0) {
    console.log('✓ Database clean');
  } else {
    throw new Error('Database not clean');
  }

  console.log('\nAll tests passed successfully! 🚀');
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
