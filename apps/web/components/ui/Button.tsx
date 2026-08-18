import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
};

export function Button({ variant = 'primary', fullWidth = false, style, ...props }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.25rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    border: 'none',
  };

  const variants = {
    primary: {
      backgroundColor: props.disabled ? '#fdba74' : '#ea580c', // Orange
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: props.disabled ? '#a1a1aa' : '#1a1a1a', // Charcoal
      color: '#ffffff',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#1a1a1a',
      border: '1px solid #e5e5e5',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#52525b',
      padding: '0.5rem 1rem',
    },
  };

  return (
    <button style={{ ...baseStyle, ...variants[variant], ...style }} {...props}>
      {props.children}
    </button>
  );
}
