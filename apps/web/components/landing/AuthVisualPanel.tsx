'use client';

export function AuthVisualPanel() {
  return (
    <div style={styles.panel}>
      <div style={styles.topLogo}>
        <div style={styles.logoMark}>CI</div>
      </div>
      
      <div style={styles.visualContainer}>
        {/* Abstract intelligence graph */}
        <div style={styles.graph}>
          
          {/* Left: Evidence */}
          <div style={styles.evidenceColumn}>
            <div style={styles.label}>EVIDENCE</div>
            {['React', 'Node.js', 'REST APIs', 'Projects', 'Skills'].map((item, i) => (
              <div key={item} style={{...styles.node, animationDelay: `${i * 0.2}s`}}>
                <span style={styles.nodeDot} />
                {item}
              </div>
            ))}
          </div>

          {/* Lines to Center */}
          <div style={styles.linesColumn}>
             <svg style={styles.svgLines}>
                {[10, 30, 50, 70, 90].map((y, i) => (
                  <path 
                    key={i}
                    d={`M 0,${y}% C 50,${y}% 50,50% 100,50%`}
                    stroke="var(--border-light)"
                    strokeWidth="1"
                    fill="none"
                  />
                ))}
                <path 
                  d="M 0,50% C 50,50% 50,50% 100,50%"
                  stroke="var(--accent-primary)"
                  strokeWidth="2"
                  fill="none"
                  style={styles.animatedPath}
                />
             </svg>
          </div>

          {/* Center: Intelligence */}
          <div style={styles.centerColumn}>
            <div style={styles.engineNode}>
              <div style={styles.engineRing} />
              <div style={styles.engineCore}>
                <div style={styles.engineText}>CAREER</div>
                <div style={styles.engineText}>INTELLIGENCE</div>
                <div style={styles.engineTextLight}>ENGINE</div>
              </div>
            </div>
          </div>

          {/* Lines to Right */}
          <div style={styles.linesColumnRight}>
             <svg style={styles.svgLines}>
                <path 
                  d="M 0,50% L 100,50%"
                  stroke="var(--success-text)"
                  strokeWidth="2"
                  fill="none"
                />
             </svg>
          </div>

          {/* Right: Opportunity */}
          <div style={styles.opportunityColumn}>
             <div style={styles.label}>OPPORTUNITY</div>
             <div style={styles.matchNode}>
                <div style={styles.matchScore}>82%</div>
                <div style={styles.matchLabel}>MATCH</div>
             </div>
          </div>

        </div>
      </div>

      <div style={styles.footer}>
        <h2 style={styles.heroText}>Build evidence.<br/>Understand your direction.</h2>
        <p style={styles.heroSubtext}>Career Intelligence connects what you can prove with where you can go next.</p>
        <div style={styles.brandTag}>CAREER INTELLIGENCE<br/><span style={styles.brandTagMuted}>DETERMINISTIC MATCHING ENGINE</span></div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '3rem',
    position: 'relative',
    overflow: 'hidden',
    borderRight: '1px solid var(--border-light)',
    backgroundImage: `linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
  },
  topLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoMark: {
    width: '32px',
    height: '32px',
    backgroundColor: 'var(--text-primary)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.875rem',
    borderRadius: '4px',
    letterSpacing: '-0.05em',
  },
  visualContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graph: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '500px',
    height: '300px',
  },
  evidenceColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100px',
    zIndex: 2,
  },
  label: {
    fontSize: '0.65rem',
    fontWeight: 800,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  node: {
    padding: '0.5rem',
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-light)',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    position: 'relative',
  },
  nodeDot: {
    width: '6px',
    height: '6px',
    backgroundColor: 'var(--success-text)',
    borderRadius: '50%',
  },
  linesColumn: {
    flex: 1,
    height: '100%',
    position: 'relative',
    opacity: 0.6,
  },
  linesColumnRight: {
    width: '40px',
    height: '100%',
    position: 'relative',
    opacity: 0.6,
  },
  svgLines: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  animatedPath: {
    animation: 'pulse-glow 2s infinite alternate',
  },
  centerColumn: {
    zIndex: 2,
  },
  engineNode: {
    width: '140px',
    height: '140px',
    backgroundColor: '#ffffff',
    border: '2px solid var(--text-primary)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  engineRing: {
    position: 'absolute',
    inset: '-6px',
    border: '1px dashed var(--border-light)',
    borderRadius: '50%',
    animation: 'spin 20s linear infinite',
  },
  engineCore: {
    textAlign: 'center',
  },
  engineText: {
    fontSize: '0.7rem',
    fontWeight: 900,
    color: 'var(--text-primary)',
    letterSpacing: '0.05em',
    lineHeight: 1.2,
  },
  engineTextLight: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginTop: '0.25rem',
  },
  opportunityColumn: {
    width: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  matchNode: {
    backgroundColor: 'var(--success-text)',
    color: '#ffffff',
    padding: '1rem',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(21, 128, 61, 0.2)',
  },
  matchScore: {
    fontSize: '1.5rem',
    fontWeight: 900,
    lineHeight: 1,
  },
  matchLabel: {
    fontSize: '0.55rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    marginTop: '0.25rem',
  },
  footer: {
    zIndex: 2,
  },
  heroText: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    marginBottom: '1rem',
  },
  heroSubtext: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    maxWidth: '85%',
    marginBottom: '2rem',
  },
  brandTag: {
    fontSize: '0.65rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.1em',
  },
  brandTagMuted: {
    color: 'var(--text-tertiary)',
  }
};
