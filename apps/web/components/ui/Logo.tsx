import React from 'react';
import Link from 'next/link';

interface LogoProps {
  monochrome?: boolean;
}

export function Logo({ monochrome = false }: LogoProps) {
  const accentColor = monochrome ? 'currentColor' : 'var(--accent-primary)';
  const nodeColor = monochrome ? 'currentColor' : 'var(--text-primary)';
  
  return (
    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M4 20L10 12H14L20 4" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 10V4H14" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="4" cy="20" r="2.5" fill={nodeColor}/>
        <circle cx="20" cy="4" r="2.5" fill={nodeColor}/>
      </svg>
      <span style={{ 
        fontSize: '1.25rem', 
        fontWeight: 700, 
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        Career Intelligence
      </span>
    </Link>
  );
}
