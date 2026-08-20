'use client';

import { useState } from 'react';

export function WhyCareerIntelligence() {
  const [hovered, setHovered] = useState<number | null>(null);

  const principles = [
    {
      title: 'EVIDENCE OVER CLAIMS',
      reveal: (
        <div style={styles.revealBox}>
          <div style={styles.revealLabel}>EXAMPLE</div>
          <div style={styles.revealText}>React → Hotel Booking Project</div>
        </div>
      )
    },
    {
      title: 'TRANSPARENT OVER BLACK BOX',
      reveal: (
        <div style={styles.revealBox}>
          <div style={styles.revealLabel}>EXPLANATION</div>
          <div style={styles.revealText}>82% MATCH: 3 verified, 2 missing</div>
        </div>
      )
    },
    {
      title: 'ACTIONABLE OVER GENERIC',
      reveal: (
        <div style={styles.revealBox}>
          <div style={styles.revealLabel}>SKILL GAP</div>
          <div style={styles.revealText}>MISSING: PostgreSQL, AWS</div>
        </div>
      )
    }
  ];

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Why Career Intelligence</h2>
      </div>

      <div style={styles.grid}>
        {principles.map((p, idx) => (
          <div 
            key={idx} 
            style={styles.card}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <h3 style={{ ...styles.cardTitle, color: hovered === idx ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
              {p.title}
            </h3>
            
            <div style={{
              ...styles.revealContainer,
              opacity: hovered === idx ? 1 : 0,
              transform: hovered === idx ? 'translateY(0)' : 'translateY(10px)'
            }}>
              {p.reveal}
            </div>
          </div>
        ))}
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
    letterSpacing: '-0.02em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem',
    width: '100%',
    maxWidth: '1000px',
  },
  card: {
    padding: '2rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'border-color 0.3s ease',
    cursor: 'default',
    height: '200px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    transition: 'color 0.3s ease',
  },
  revealContainer: {
    marginTop: 'auto',
    width: '100%',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  revealBox: {
    padding: '1rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
  },
  revealLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginBottom: '0.25rem',
  },
  revealText: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  }
};
