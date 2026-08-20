import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    width: '100%',
    marginBottom: '1rem',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: error ? 'var(--error-text)' : 'var(--text-primary)',
    display: 'flex',
    justifyContent: 'space-between',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${error ? 'var(--error-border)' : isFocused ? 'var(--border-focus)' : 'var(--border-light)'}`,
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    outline: 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    boxShadow: isFocused ? `0 0 0 3px ${error ? 'var(--error-bg)' : 'var(--accent-light)'}` : 'var(--shadow-sm)',
    ...style,
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label style={labelStyle}>
          {label}
          {props.required && <span style={{ color: 'var(--error-text)' }}>*</span>}
        </label>
      )}
      <input
        style={inputStyle}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--error-text)', marginTop: '0.25rem' }}>{error}</span>}
    </div>
  );
}
