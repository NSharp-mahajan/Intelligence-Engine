'use client';

import { useState } from 'react';

export function ProblemComparison() {
  const [hovered, setHovered] = useState<'traditional' | 'intelligence' | null>(null);

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>The traditional job search is broken.</h2>
      </div>

      <div style={styles.comparisonContainer} onMouseLeave={() => setHovered(null)}>
        
        {/* Traditional */}
        <div 
          style={{
            ...styles.panel,
            ...styles.panelTraditional,
            flex: hovered === 'intelligence' ? 0.8 : hovered === 'traditional' ? 1.2 : 1,
            opacity: hovered === 'intelligence' ? 0.5 : 1
          }}
          onMouseEnter={() => setHovered('traditional')}
        >
          <div style={styles.panelTitle}>Traditional Job Search</div>
          <div style={styles.noisyList}>
            {[
              [-4, 0.45], [8, 0.72], [-9, 0.35], [3, 0.61],
              [-2, 0.58], [7, 0.49], [-6, 0.78], [1, 0.33],
              [-8, 0.67], [5, 0.51], [-1, 0.44], [9, 0.69]
            ].map(([x, op], i) => (
              <div key={i} style={{
                ...styles.noisyItem,
                transform: `translateX(${x}px)`,
                opacity: op
              }}>
                Unknown Fit • Keyword Match • Scattered Evidence
              </div>
            ))}
          </div>
          <div style={styles.panelFooter}>Noisy. Unstructured. Guessing.</div>
        </div>

        {/* Intelligence */}
        <div 
          style={{
            ...styles.panel,
            ...styles.panelIntelligence,
            flex: hovered === 'traditional' ? 0.8 : hovered === 'intelligence' ? 1.2 : 1,
            opacity: hovered === 'traditional' ? 0.5 : 1
          }}
          onMouseEnter={() => setHovered('intelligence')}
        >
          <div style={styles.panelTitleInt}>Career Intelligence</div>
          <div style={styles.structuredList}>
            <div style={styles.structuredItem}>
              <span style={styles.check}>✓</span> Targeted Opportunities
            </div>
            <div style={styles.structuredItem}>
              <span style={styles.check}>✓</span> Evidence-Based Matching
            </div>
            <div style={styles.structuredItem}>
              <span style={styles.check}>✓</span> Explainable Fit
            </div>
            <div style={styles.structuredItem}>
              <span style={styles.check}>✓</span> Actionable Gaps
            </div>
          </div>
          <div style={styles.panelFooterInt}>Structured. Deterministic. Proven.</div>
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
    letterSpacing: '-0.02em',
  },
  comparisonContainer: {
    display: 'flex',
    width: '100%',
    maxWidth: '1000px',
    height: '400px',
    gap: '1rem',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  panel: {
    padding: '2rem',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    position: 'relative',
  },
  panelTraditional: {
    backgroundColor: '#e5e7eb',
    border: '1px solid #d1d5db',
  },
  panelIntelligence: {
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-dark)',
  },
  panelTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#374151',
    marginBottom: '2rem',
  },
  panelTitleInt: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-inverse)',
    marginBottom: '2rem',
  },
  noisyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
  },
  noisyItem: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  structuredList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flex: 1,
  },
  structuredItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-inverse)',
    padding: '1rem',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  check: {
    color: 'var(--accent-primary)',
    fontWeight: 800,
  },
  panelFooter: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: 'auto',
  },
  panelFooterInt: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: 'auto',
  }
};
