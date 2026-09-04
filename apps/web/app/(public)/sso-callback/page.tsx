import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  // Clerk handles the OAuth callback here, then redirects to redirectUrlComplete
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
      <AuthenticateWithRedirectCallback signUpForceRedirectUrl="/sync-profile" signInForceRedirectUrl="/sync-profile" />
    </div>
  );
}
