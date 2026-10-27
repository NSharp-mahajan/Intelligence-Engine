'use client';

import React, { useState } from 'react';
import { resolveClientCompanyLogo } from '../lib/companyLogo';

interface CompanyLogoProps {
  organization: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function CompanyLogo({
  organization,
  logoUrl,
  size = 44,
  className = '',
  style,
}: CompanyLogoProps) {
  const [loadError, setLoadError] = useState(false);

  // Use provided API logoUrl or fallback to client-side resolver
  const resolvedUrl = !loadError && (logoUrl || resolveClientCompanyLogo(organization));

  // Derive initial for fallback tile
  const initial = (organization || '').trim().charAt(0).toUpperCase() || '•';

  if (!resolvedUrl || loadError) {
    return (
      <div
        className={`company-logo-fallback ${className}`}
        role="img"
        aria-label={`${organization} logo`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          borderRadius: '10px',
          backgroundColor: 'var(--bg-surface-hover, #f8fafc)',
          border: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary, #475569)',
          fontWeight: 700,
          fontSize: `${Math.max(14, Math.round(size * 0.44))}px`,
          letterSpacing: '-0.02em',
          userSelect: 'none',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          flexShrink: 0,
          ...style,
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`company-logo-wrap ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-light, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        padding: '3px',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={resolvedUrl}
        alt={`${organization} logo`}
        width={size - 6}
        height={size - 6}
        loading="lazy"
        decoding="async"
        onError={() => setLoadError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '6px',
        }}
      />
    </div>
  );
}

export default CompanyLogo;
