import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  monochrome?: boolean;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ showTagline = false, size = 'md', className = '' }: LogoProps) {
  const height = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;
  const width = Math.round(height * 3.48);

  return (
    <Link
      href="/"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.625rem',
        textDecoration: 'none',
        color: 'inherit',
      }}
      aria-label="Udaan — Turn your potential into progress"
    >
      <Image
        src="/udaan-logo.png"
        alt="Udaan"
        width={width}
        height={height}
        unoptimized
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain', display: 'block' }}
        priority
      />
      {showTagline && (
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted, #737373)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            borderLeft: '1px solid var(--border-light, #e5e5e5)',
            paddingLeft: '0.625rem',
            marginLeft: '0.25rem',
            whiteSpace: 'nowrap',
          }}
        >
          Turn your potential into progress.
        </span>
      )}
    </Link>
  );
}
