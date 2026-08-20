import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false, 
  style,
  disabled,
  ...props 
}: ButtonProps) {
  
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'inherit',
    outline: 'none',
    border: '1px solid transparent',
  };

  const sizeStyles = {
    sm: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
    },
    md: {
      padding: '0.5rem 1rem',
      fontSize: '0.9375rem',
    },
    lg: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
    }
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--accent-primary)',
      color: 'var(--text-inverse)',
      borderColor: 'var(--accent-primary)',
    },
    secondary: {
      backgroundColor: 'var(--text-primary)',
      color: 'var(--text-inverse)',
      borderColor: 'var(--text-primary)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-light)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: 'var(--error-bg)',
      color: 'var(--error-text)',
      borderColor: 'var(--error-border)',
    }
  };

  // Hover states using inline handlers since we don't have CSS modules or styled-components
  // Actually, standard css classes are better for hover, but let's just stick to inline 
  // since the user wants us to refine the existing inline architecture or use globals.css.
  // Let's add standard classes to globals.css and just apply them here.

  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''}`}
      style={{ ...baseStyles, ...sizeStyles[size], ...variantStyles[variant], ...style }}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'primary') {
          e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
          e.currentTarget.style.borderColor = 'var(--accent-hover)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.backgroundColor = '#333333';
        } else if (variant === 'outline' || variant === 'ghost') {
          e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        } else if (variant === 'danger') {
          e.currentTarget.style.backgroundColor = '#fecaca';
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.backgroundColor = variantStyles[variant].backgroundColor;
        e.currentTarget.style.borderColor = variantStyles[variant].borderColor;
        e.currentTarget.style.color = variantStyles[variant].color;
      }}
      onFocus={(e) => {
        if (disabled) return;
        e.currentTarget.style.boxShadow = `0 0 0 2px var(--bg-primary), 0 0 0 4px ${variant === 'primary' ? 'var(--accent-primary)' : 'var(--text-primary)'}`;
      }}
      onBlur={(e) => {
        if (disabled) return;
        e.currentTarget.style.boxShadow = 'none';
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(1)';
      }}
      {...props}
    >
      {children}
    </button>
  );
}
