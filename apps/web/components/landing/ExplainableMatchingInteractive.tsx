'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';

export function ExplainableMatchingInteractive() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Explainable Matching</h2>
        <p style={styles.subtitle}>
          No black boxes. When Career Intelligence calculates a match, it shows you the exact deterministic math.
        </p>
      </div>

      <div style={styles.uiContainer}>
        <div style={styles.cardHeader}>
          <div style={styles.roleTitle}>SOFTWARE ENGINEERING INTERN</div>
          <div style={styles.matchBadge}>82% MATCH</div>
        </div>

        <div style={styles.splitGrid}>
          <div>
            <div style={styles.listLabel}>VERIFIED ALIGNMENT</div>
            <div style={styles.listItem}><span style={styles.check}>✓</span> React</div>
            <div style={styles.listItem}><span style={styles.check}>✓</span> Node.js</div>
            <div style={styles.listItem}><span style={styles.check}>✓</span> REST APIs</div>
          </div>
          <div>
            <div style={styles.listLabel}>MISSING REQUIREMENTS</div>
            <div style={styles.listItem}><span style={styles.dot}>•</span> PostgreSQL</div>
            <div style={styles.listItem}><span style={styles.dot}>•</span> AWS Deployment</div>
          </div>
        </div>

        <div style={styles.actionRow}>
          <Button 
            variant="outline" 
            onClick={() => setExpanded(!expanded)}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            WHY THIS MATCH?
            <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>↓</span>
          </Button>
        </div>

        {expanded && (
          <div style={styles.expandedPanel} className="animate-slide-up">
            <div style={styles.explanationSection}>
              <div style={styles.explanationTitle}>WHY THIS MATCH EXISTS</div>
              <p style={styles.explanationText}>
                Your project evidence demonstrates strong frontend, backend and API development capability.
              </p>
            </div>

            <div style={styles.explanationSection}>
              <div style={styles.explanationTitle}>STRONGEST EVIDENCE</div>
              <div style={styles.evidenceRow}>
                <span style={styles.evidenceKey}>React</span>
                <span style={styles.evidenceArrow}>→</span>
                <span style={styles.evidenceVal}>2 Projects</span>
              </div>
              <div style={styles.evidenceRow}>
                <span style={styles.evidenceKey}>Node.js</span>
                <span style={styles.evidenceArrow}>→</span>
                <span style={styles.evidenceVal}>1 Project</span>
              </div>
              <div style={styles.evidenceRow}>
                <span style={styles.evidenceKey}>REST APIs</span>
                <span style={styles.evidenceArrow}>→</span>
                <span style={styles.evidenceVal}>Multiple integrations</span>
              </div>
            </div>

            <div style={styles.explanationSection}>
              <div style={{ ...styles.explanationTitle, color: 'var(--accent-primary)' }}>NEXT GAP TO CLOSE</div>
              <div style={styles.gapBox}>PostgreSQL + AWS</div>
            </div>
          </div>
        )}
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
    maxWidth: '600px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  uiContainer: {
    width: '100%',
    maxWidth: '700px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '2rem',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
  },
  roleTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
  matchBadge: {
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-primary)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-full)',
    fontWeight: 800,
    fontSize: '1rem',
  },
  splitGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    padding: '2rem',
  },
  listLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
    marginBottom: '1rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '0.75rem',
  },
  check: {
    color: 'var(--success-text)',
    fontWeight: 800,
  },
  dot: {
    color: 'var(--accent-primary)',
    fontWeight: 800,
    fontSize: '1.25rem',
    lineHeight: 0.5,
  },
  actionRow: {
    padding: '0 2rem 2rem 2rem',
  },
  expandedPanel: {
    borderTop: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-primary)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  explanationSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  explanationTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    letterSpacing: '0.1em',
  },
  explanationText: {
    fontSize: '1rem',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    margin: 0,
    fontWeight: 500,
  },
  evidenceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border-light)',
  },
  evidenceKey: {
    fontWeight: 700,
    color: 'var(--text-primary)',
    width: '100px',
  },
  evidenceArrow: {
    color: 'var(--text-tertiary)',
  },
  evidenceVal: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  gapBox: {
    padding: '1rem',
    backgroundColor: 'var(--accent-light)',
    border: '1px dashed var(--accent-primary)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--accent-hover)',
    fontWeight: 700,
    textAlign: 'center',
  }
};
