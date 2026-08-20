'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          
          {/* Brand Column */}
          <div style={styles.brandCol}>
            <div style={styles.logo}>Career Intelligence</div>
            <p style={styles.brandDesc}>
              The deterministic matching engine for modern engineering careers. Stop guessing, start proving.
            </p>
          </div>

          {/* Product Links */}
          <div style={styles.linkCol}>
            <div style={styles.colTitle}>Product</div>
            <a href="#how-it-works" style={styles.link}>How it Works</a>
            <a href="#matching" style={styles.link}>Explainable Matching</a>
            <a href="#why" style={styles.link}>Evidence Engine</a>
            <a href="/pricing" style={styles.link}>Pricing</a>
          </div>

          {/* Resources Links */}
          <div style={styles.linkCol}>
            <div style={styles.colTitle}>Resources</div>
            <a href="/docs" style={styles.link}>Documentation</a>
            <a href="/blog" style={styles.link}>Engineering Blog</a>
            <a href="/integrations" style={styles.link}>Integrations</a>
            <a href="/support" style={styles.link}>Support</a>
          </div>

          {/* Company Links */}
          <div style={styles.linkCol}>
            <div style={styles.colTitle}>Company</div>
            <a href="/about" style={styles.link}>About Us</a>
            <a href="/careers" style={styles.link}>Careers</a>
            <a href="/legal/privacy" style={styles.link}>Privacy Policy</a>
            <a href="/legal/terms" style={styles.link}>Terms of Service</a>
          </div>
        </div>

        <div style={styles.bottomBar}>
          <div style={styles.copyright}>
            © {currentYear} Career Intelligence Inc. All rights reserved.
          </div>
          <div style={styles.statusBox}>
            <span style={styles.statusDot} /> All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    backgroundColor: 'var(--bg-surface)',
    borderTop: '1px solid var(--border-light)',
    padding: '6rem 2rem 2rem 2rem',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '4rem',
    marginBottom: '6rem',
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    paddingRight: '2rem',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 900,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  brandDesc: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  linkCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  colTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  link: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  bottomBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '2rem',
    borderTop: '1px solid var(--border-light)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  copyright: {
    fontSize: '0.875rem',
    color: 'var(--text-tertiary)',
  },
  statusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--success-text)',
  }
};
