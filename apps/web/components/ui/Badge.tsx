import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'error';
  style?: React.CSSProperties;
}

export function Badge({ children, variant = 'neutral', style }: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.5rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    ...style
  };

  const variants = {
    neutral: {
      backgroundColor: 'var(--bg-surface-hover)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-light)',
    },
    success: {
      backgroundColor: 'var(--success-bg)',
      color: 'var(--success-text)',
      border: '1px solid var(--success-border)',
    },
    warning: {
      backgroundColor: '#fffbeb',
      color: '#b45309',
      border: '1px solid #fde68a',
    },
    error: {
      backgroundColor: 'var(--error-bg)',
      color: 'var(--error-text)',
      border: '1px solid var(--error-border)',
    }
  };

  return (
    <span style={{ ...baseStyle, ...variants[variant] }}>
      {children}
    </span>
  );
}
