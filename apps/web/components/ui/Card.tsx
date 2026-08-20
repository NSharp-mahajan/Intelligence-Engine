import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ children, style }: CardProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow var(--transition-normal)',
      ...style
    }}
    onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, style }: CardProps) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      borderBottom: '1px solid var(--border-light)',
      backgroundColor: 'var(--bg-surface)',
      ...style
    }}>
      {children}
    </div>
  );
}

export function CardBody({ children, style }: CardProps) {
  return (
    <div style={{
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      ...style
    }}>
      {children}
    </div>
  );
}
