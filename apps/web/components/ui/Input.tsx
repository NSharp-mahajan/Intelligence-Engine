import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1a1a1a' }}>
        {label}
      </label>
      <input
        style={{
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          border: error ? '1px solid #ef4444' : '1px solid #d4d4d8',
          fontSize: '0.9375rem',
          color: '#1a1a1a',
          backgroundColor: '#ffffff',
          outline: 'none',
          transition: 'border-color 0.2s ease',
          ...style,
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
    </div>
  );
}
