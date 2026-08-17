'use client';

import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.navContainer}>
          <Link href="/" style={styles.brand}>
            Career Intelligence
          </Link>
          <nav style={styles.nav}>
            <Link href="/#how-it-works" style={styles.navLink}>How It Works</Link>
            <Link href="/#why-us" style={styles.navLink}>Why Career Intelligence</Link>
            <Link href="/#matching" style={styles.navLink}>Matching</Link>
            <div style={styles.authButtons}>
              <Link href="/login" style={styles.loginBtn}>Log In</Link>
              <Link href="/register" style={styles.registerBtn}>Get Started</Link>
            </div>
          </nav>
        </div>
      </header>
      <main style={styles.main}>
        {children}
      </main>
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p>&copy; {new Date().getFullYear()} Career Intelligence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e5e5',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  navContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  navLink: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#52525b',
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginLeft: '1rem',
  },
  loginBtn: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  registerBtn: {
    fontSize: '0.875rem',
    fontWeight: '600',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e5e5',
    padding: '2rem',
    marginTop: 'auto',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center' as const,
    color: '#a1a1aa',
    fontSize: '0.875rem',
  }
};
