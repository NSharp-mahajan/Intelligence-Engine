'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';

export function LiveRequirementAnalysis() {
  const [step, setStep] = useState(0);

  const analyze = async () => {
    setStep(1);
    await new Promise(r => setTimeout(r, 800)); // READING ROLE
    setStep(2); // CHECKING EVIDENCE
    await new Promise(r => setTimeout(r, 800));
    setStep(3); // COMPARING REQUIREMENTS
    await new Promise(r => setTimeout(r, 800));
    setStep(4); // CALCULATING ALIGNMENT
    await new Promise(r => setTimeout(r, 1000));
    setStep(5); // DONE
  };

  const getStatusText = () => {
    switch (step) {
      case 1: return 'READING ROLE...';
      case 2: return 'CHECKING EVIDENCE...';
      case 3: return 'COMPARING REQUIREMENTS...';
      case 4: return 'CALCULATING ALIGNMENT...';
      case 5: return 'ANALYSIS COMPLETE';
      default: return 'SYSTEM IDLE';
    }
  };

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Live Requirement Analysis</h2>
        <p style={styles.subtitle}>Watch the deterministic engine evaluate a candidate profile against a real role.</p>
      </div>

      <div style={styles.container}>
        <div style={styles.topRow}>
          <div style={styles.box}>
            <div style={styles.boxTitle}>OPPORTUNITY</div>
            <div style={styles.roleName}>Software Engineering Intern</div>
            <div style={styles.reqList}>
              <div style={styles.req}>React</div>
              <div style={styles.req}>Node.js</div>
              <div style={styles.req}>REST APIs</div>
              <div style={styles.req}>PostgreSQL</div>
              <div style={styles.req}>AWS</div>
            </div>
          </div>
          
          <div style={styles.box}>
            <div style={styles.boxTitle}>CANDIDATE EVIDENCE</div>
            <div style={styles.reqList}>
              <div style={styles.req}>React</div>
              <div style={styles.req}>Node.js</div>
              <div style={styles.req}>REST APIs</div>
            </div>
          </div>
        </div>

        <div style={styles.actionCenter}>
          {step === 0 ? (
            <Button variant="primary" size="lg" onClick={analyze}>Analyze Match</Button>
          ) : (
            <div style={styles.statusPill}>
              <div style={step < 5 ? styles.spinner : styles.dot} />
              {getStatusText()}
            </div>
          )}
        </div>

        <div style={{ ...styles.resultBox, opacity: step === 5 ? 1 : 0, transform: step === 5 ? 'translateY(0)' : 'translateY(20px)' }}>
          <div style={styles.score}>82% MATCH</div>
          <div style={styles.resultDetails}>
            <span style={{ color: 'var(--success-text)' }}>3 VERIFIED</span>
            <span style={{ color: 'var(--text-tertiary)' }}> | </span>
            <span style={{ color: 'var(--accent-primary)' }}>2 MISSING</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '8rem 2rem',
    backgroundColor: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-light)',
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
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
  },
  container: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  topRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
  },
  box: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
  },
  boxTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginBottom: '1rem',
  },
  roleName: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '1.5rem',
  },
  reqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  req: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  actionCenter: {
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 0',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 2rem',
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-inverse)',
    borderRadius: 'var(--radius-full)',
    fontFamily: 'monospace',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  dot: {
    width: '12px',
    height: '12px',
    backgroundColor: 'var(--success-text)',
    borderRadius: '50%',
  },
  resultBox: {
    backgroundColor: 'var(--accent-light)',
    border: '2px solid var(--accent-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    textAlign: 'center',
    transition: 'all 0.5s ease',
  },
  score: {
    fontSize: '3rem',
    fontWeight: 900,
    color: 'var(--accent-hover)',
    lineHeight: 1,
    marginBottom: '0.5rem',
  },
  resultDetails: {
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
  }
};
