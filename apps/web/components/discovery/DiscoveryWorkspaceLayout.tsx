'use client';

import { useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { Logo } from '../ui/Logo';
import type { User } from '../../lib/types';

interface DiscoveryWorkspaceLayoutProps {
  children: React.ReactNode;
  user: User;
  onSignOut: () => void;
}

export function DiscoveryWorkspaceLayout({ children, user, onSignOut }: DiscoveryWorkspaceLayoutProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const name = user.profile?.fullName || 'Candidate';

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={{ ...styles.headerInner }} className="discovery-header-inner">
          <Logo />
          <nav aria-label="Discovery navigation" style={styles.navigation} className="discovery-navigation">
            <Link href="/opportunities" aria-current="page" style={styles.activeNavItem}>Opportunities</Link>
          </nav>
          <div style={styles.userMenuContainer}>
            <button type="button" aria-expanded={isUserMenuOpen} aria-haspopup="menu" onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)} style={styles.userControl}>
              <span style={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
              <span style={styles.userName} className="discovery-user-name">{name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {isUserMenuOpen && (
              <div role="menu" style={styles.userMenu}>
                <div style={styles.userMenuDetails}><span style={styles.userMenuName}>{name}</span><span style={styles.userMenuEmail}>{user.email}</span></div>
                <Link href="/portal" role="menuitem" style={styles.menuItem} onClick={() => setIsUserMenuOpen(false)}>Return to Career Workspace</Link>
                <button type="button" role="menuitem" onClick={onSignOut} style={styles.signOutItem}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main style={styles.main}>{children}</main>
      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 640px) { .discovery-user-name { display: none; } .discovery-header-inner { padding: 0 1rem !important; gap: 1rem !important; } .discovery-navigation { margin-left: auto; } }` }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { minHeight: '100vh', backgroundColor: 'var(--bg-primary)' },
  header: { position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' },
  headerInner: { maxWidth: '1280px', minHeight: '72px', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '3rem' },
  navigation: { display: 'flex', alignSelf: 'stretch', alignItems: 'stretch' },
  activeNavItem: { display: 'inline-flex', alignItems: 'center', padding: '0 0.25rem', borderBottom: '2px solid var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '0.9375rem', fontWeight: 600 },
  userMenuContainer: { position: 'relative', marginLeft: 'auto' },
  userControl: { display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem', border: '1px solid transparent', borderRadius: 'var(--radius-md)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600 },
  avatar: { width: '32px', height: '32px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-dark)', color: 'var(--text-inverse)', fontSize: '0.8125rem' },
  userName: { maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userMenu: { position: 'absolute', right: 0, top: 'calc(100% + 0.625rem)', width: '260px', padding: '0.5rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' },
  userMenuDetails: { display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.625rem 0.75rem 0.875rem', borderBottom: '1px solid var(--border-light)', marginBottom: '0.5rem' },
  userMenuName: { fontSize: '0.875rem', fontWeight: 600 },
  userMenuEmail: { color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis' },
  menuItem: { display: 'flex', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 },
  signOutItem: { display: 'flex', width: '100%', padding: '0.625rem 0.75rem', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, textAlign: 'left' },
  main: { width: '100%', minHeight: 'calc(100vh - 72px)' },
};
