import React from 'react';

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e5e5',
        borderRadius: '8px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f4f4f5', ...style }}>
      {children}
    </div>
  );
}

export function CardBody({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: '1.5rem', ...style }}>{children}</div>;
}
