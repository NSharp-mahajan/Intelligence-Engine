import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login',
  '/register',
  '/sso-callback',
  '/sync-profile',
  '/api/(.*)',
  '/opportunities',
  '/opportunities/(.*)',
  '/opportunities(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  const isPublic =
    isPublicRoute(req) ||
    path === '/opportunities' ||
    path.startsWith('/opportunities/');

  if (!isPublic) {
    await auth.protect();
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
