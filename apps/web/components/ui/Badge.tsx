import React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'neutral' | 'accent';
};

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const styles = {
    success: { backgroundColor: '#f0fdf4', color: '#16a34a' },
    warning: { backgroundColor: '#fff7ed', color: '#ea580c' },
    accent: { backgroundColor: '#fff7ed', color: '#ea580c' }, // Reusing orange for accent
    neutral: { backgroundColor: '#f4f4f5', color: '#52525b' },
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.625rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}
