'use client';

import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.navContainer}>
          <Logo />
          <nav style={styles.nav}>
            <Link href="/#how-it-works" style={styles.navLink}>How It Works</Link>
            <Link href="/#why-us" style={styles.navLink}>Why Career Intelligence</Link>
            <Link href="/#matching" style={styles.navLink}>Matching</Link>
            <div style={styles.authButtons}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="ghost">Log In</Button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <Button variant="primary">Get Started</Button>
              </Link>
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
    backgroundColor: '#faf9f6',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
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
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '2.5rem',
  },
  navLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#52525b',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginLeft: '1rem',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e5e5',
    padding: '2.5rem',
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
