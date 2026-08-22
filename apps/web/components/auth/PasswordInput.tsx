'use client';

import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  isFocused?: boolean;
}

export function PasswordInput({ value, onChange, onFocus, onBlur, placeholder = '••••••••', isFocused }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={styles.container}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        required
        autoComplete="current-password"
        style={{
          ...styles.input,
          ...(isFocused ? styles.inputFocused : {})
        }}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        style={styles.toggleButton}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <svg viewBox="0 0 24 24" style={styles.icon}>
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" style={styles.icon}>
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem', // 52-56px height target (approx 14px padding + 16px font + border = 46px, plus label gap)
    paddingRight: '3rem',
    borderRadius: '12px',
    border: '1px solid var(--border-light)',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  inputFocused: {
    border: '1px solid var(--accent-primary)',
    boxShadow: '0 0 0 3px rgba(234, 88, 12, 0.15)', // Orange glow
    backgroundColor: '#ffffff',
  },
  toggleButton: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
  },
  icon: {
    width: '20px',
    height: '20px',
  }
};
