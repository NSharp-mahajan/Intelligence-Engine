'use client';

export function ProductPreview() {
  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Your Career Intelligence Dashboard</h2>
        <p style={styles.subtitle}>A realistic preview of the system inside.</p>
      </div>

      <div style={styles.dashboardContainer}>
        {/* Top metrics */}
        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>PROFILE READINESS</div>
            <div style={styles.metricValue}>100%</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>VERIFIED SKILLS</div>
            <div style={styles.metricValue}>3</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>PROJECT EVIDENCE</div>
            <div style={styles.metricValue}>4</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>MATCHED OPPORTUNITIES</div>
            <div style={{ ...styles.metricValue, color: 'var(--accent-primary)' }}>6</div>
          </div>
        </div>

        {/* Lower layout */}
        <div style={styles.lowerLayout}>
          <div style={styles.leftColumn}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>CAREER DIRECTION</div>
              <div style={styles.panelBody}>
                <div style={styles.dirLabel}>Target Role</div>
                <div style={styles.dirValue}>Software Engineer</div>
                <div style={{ ...styles.dirLabel, marginTop: '1rem' }}>Graduation Timeline</div>
                <div style={styles.dirValue}>2028</div>
              </div>
            </div>
          </div>
          
          <div style={styles.rightColumn}>
            <div style={styles.panelHighlight}>
              <div style={styles.panelHeaderHighlight}>TOP MATCH</div>
              <div style={styles.matchBody}>
                <div>
                  <div style={styles.matchRole}>Software Engineering Intern</div>
                  <div style={styles.matchCompany}>TechCorp Inc.</div>
                </div>
                <div style={styles.matchScoreBox}>
                  <div style={styles.matchScore}>82%</div>
                  <div style={styles.matchAlign}>ALIGNMENT</div>
                </div>
              </div>
            </div>
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
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
  },
  dashboardContainer: {
    width: '100%',
    maxWidth: '1000px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  metricCard: {
    padding: '1.5rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
  },
  metricLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  lowerLayout: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  leftColumn: {
    flex: 1,
    minWidth: '250px',
  },
  rightColumn: {
    flex: 2,
    minWidth: '400px',
  },
  panel: {
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '1rem',
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-light)',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
  },
  panelBody: {
    padding: '1.5rem',
  },
  dirLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    marginBottom: '0.25rem',
  },
  dirValue: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  panelHighlight: {
    border: '2px solid var(--accent-primary)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  panelHeaderHighlight: {
    padding: '1rem',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--text-inverse)',
    fontSize: '0.75rem',
    fontWeight: 800,
    letterSpacing: '0.05em',
  },
  matchBody: {
    padding: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--accent-light)',
  },
  matchRole: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--accent-hover)',
    marginBottom: '0.25rem',
  },
  matchCompany: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
  },
  matchScoreBox: {
    textAlign: 'center',
  },
  matchScore: {
    fontSize: '3rem',
    fontWeight: 900,
    color: 'var(--accent-hover)',
    lineHeight: 1,
  },
  matchAlign: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    letterSpacing: '0.1em',
    marginTop: '0.25rem',
  }
};
