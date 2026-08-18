import React from 'react';
import Link from 'next/link';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 20L10 12H14L20 4" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 10V4H14" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="4" cy="20" r="2" fill="#1a1a1a"/>
        <circle cx="20" cy="4" r="2" fill="#1a1a1a"/>
      </svg>
      <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
        Career Intelligence
      </span>
    </Link>
  );
}
