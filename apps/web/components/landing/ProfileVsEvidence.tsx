'use client';

import { useState, useEffect } from 'react';

export function ProfileVsEvidence() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Anyone can list a skill.</h2>
        <p style={styles.subtitle}>Evidence makes it meaningful.</p>
      </div>

      <div style={styles.comparisonGrid}>
        {/* LEFT: Traditional */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>TRADITIONAL PROFILE</div>
          <div style={styles.badgeList}>
            <div style={styles.badge}>React</div>
            <div style={styles.badge}>Node.js</div>
            <div style={styles.badge}>MongoDB</div>
            <div style={styles.badge}>Python</div>
          </div>
          <div style={styles.labelBottom}>CLAIM</div>
        </div>

        {/* RIGHT: Career Intelligence */}
        <div style={styles.cardHighlight}>
          <div style={styles.cardHeaderHighlight}>CAREER INTELLIGENCE</div>
          <div style={styles.evidenceList}>
            
            <div style={styles.evidenceItem}>
              <div style={styles.evidenceTitle}>React</div>
              <div style={{ ...styles.evidenceDetails, opacity: step >= 1 ? 1 : 0, maxHeight: step >= 1 ? '50px' : '0' }}>
                <div style={styles.evidenceArrow}>→ Hotel Booking Project</div>
                <div style={styles.evidenceArrow}>→ 12 API endpoints</div>
              </div>
            </div>

            <div style={styles.evidenceItem}>
              <div style={styles.evidenceTitle}>Node.js</div>
              <div style={{ ...styles.evidenceDetails, opacity: step >= 1 ? 1 : 0, maxHeight: step >= 1 ? '50px' : '0' }}>
                <div style={styles.evidenceArrow}>→ Backend Service</div>
                <div style={styles.evidenceArrow}>→ REST API implementation</div>
              </div>
            </div>

            <div style={styles.evidenceItem}>
              <div style={styles.evidenceTitle}>MongoDB</div>
              <div style={{ ...styles.evidenceDetails, opacity: step >= 1 ? 1 : 0, maxHeight: step >= 1 ? '50px' : '0' }}>
                <div style={styles.evidenceArrow}>→ Database integration</div>
              </div>
            </div>

          </div>
          <div style={{
            ...styles.labelBottomHighlight,
            color: step === 2 ? 'var(--text-inverse)' : 'var(--accent-hover)',
            backgroundColor: step === 2 ? 'var(--accent-primary)' : 'transparent',
            borderColor: step === 2 ? 'var(--accent-primary)' : 'var(--accent-primary)'
          }}>
            {step === 0 ? 'EVIDENCE' : 'SIGNAL'}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '8rem 2rem',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '4rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    width: '100%',
    maxWidth: '900px',
  },
  card: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  cardHighlight: {
    backgroundColor: 'var(--bg-surface)',
    border: '2px solid var(--accent-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 10px 30px -10px rgba(234, 88, 12, 0.2)',
  },
  cardHeader: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  cardHeaderHighlight: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    letterSpacing: '0.1em',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  badgeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'center',
    flex: 1,
  },
  badge: {
    padding: '0.75rem 2rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  evidenceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    flex: 1,
  },
  evidenceItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  evidenceTitle: {
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontSize: '1.125rem',
  },
  evidenceDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    transition: 'all 0.5s ease',
    overflow: 'hidden',
  },
  evidenceArrow: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    paddingLeft: '1rem',
  },
  labelBottom: {
    marginTop: '3rem',
    padding: '0.75rem',
    textAlign: 'center',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
  },
  labelBottomHighlight: {
    marginTop: '3rem',
    padding: '0.75rem',
    textAlign: 'center',
    border: '2px solid var(--accent-primary)',
    borderRadius: 'var(--radius-md)',
    fontWeight: 700,
    letterSpacing: '0.1em',
    transition: 'all 0.5s ease',
  }
};
