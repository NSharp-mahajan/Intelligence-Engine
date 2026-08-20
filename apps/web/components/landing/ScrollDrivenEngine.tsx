'use client';

import { useState, useEffect, useRef } from 'react';

export function ScrollDrivenEngine() {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const progress = -rect.top / (rect.height - window.innerHeight);
      
      let step = 0;
      if (progress >= 0.8) step = 4;
      else if (progress >= 0.6) step = 3;
      else if (progress >= 0.4) step = 2;
      else if (progress >= 0.2) step = 1;
      
      setActiveStep(Math.max(0, Math.min(4, step)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={styles.section} ref={containerRef}>
      <div style={styles.stickyContainer}>
        {/* LEFT: Sticky Title */}
        <div style={styles.leftColumn}>
          <div style={styles.phaseLabel}>SYSTEM PIPELINE</div>
          <h2 style={styles.title}>
            FROM EVIDENCE<br/>
            TO OPPORTUNITY
          </h2>
          <div style={styles.stepIndicators}>
            {[0, 1, 2, 3, 4].map(idx => (
              <div 
                key={idx} 
                style={{
                  ...styles.indicator,
                  backgroundColor: activeStep >= idx ? 'var(--accent-primary)' : 'var(--border-light)'
                }}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Changing Interface */}
        <div style={styles.rightColumn}>
          <div style={styles.interfaceBox}>
            {activeStep === 0 && (
              <div style={styles.stepContent} className="animate-fade-in">
                <div style={styles.stepTag}>STEP 01 — DEFINE</div>
                <div style={styles.systemWindow}>
                  <div style={styles.sysLabel}>TARGET ROLE</div>
                  <div style={styles.sysValue}>Software Engineer</div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={styles.sysLabel}>GRADUATION</div>
                    <div style={styles.sysValue}>2028</div>
                  </div>
                </div>
              </div>
            )}
            
            {activeStep === 1 && (
              <div style={styles.stepContent} className="animate-fade-in">
                <div style={styles.stepTag}>STEP 02 — EVIDENCE</div>
                <div style={styles.systemWindow}>
                  {['React', 'Node.js', 'REST APIs', 'Projects'].map((item, i) => (
                    <div key={item} style={{ ...styles.sysItem, animationDelay: `${i * 100}ms` }} className="animate-slide-up">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div style={styles.stepContent} className="animate-fade-in">
                <div style={styles.stepTag}>STEP 03 — ANALYZE</div>
                <div style={styles.systemWindow}>
                  <div style={styles.sysGrid}>
                    <div style={styles.sysRow}><span style={styles.sysName}>React</span> <span style={styles.sysCheck}>✓</span></div>
                    <div style={styles.sysRow}><span style={styles.sysName}>Node.js</span> <span style={styles.sysCheck}>✓</span></div>
                    <div style={styles.sysRow}><span style={styles.sysName}>REST APIs</span> <span style={styles.sysCheck}>✓</span></div>
                    <div style={styles.sysRow}><span style={styles.sysName}>PostgreSQL</span> <span style={styles.sysDash}>—</span></div>
                    <div style={styles.sysRow}><span style={styles.sysName}>AWS Deployment</span> <span style={styles.sysDash}>—</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div style={styles.stepContent} className="animate-fade-in">
                <div style={styles.stepTag}>STEP 04 — MATCH</div>
                <div style={styles.systemWindowCenter}>
                  <div style={styles.matchFoundText}>MATCH FOUND</div>
                  <div style={styles.matchScoreBig}>82%</div>
                  <div style={styles.matchAlignText}>ALIGNMENT</div>
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div style={styles.stepContent} className="animate-fade-in">
                <div style={styles.stepTag}>STEP 05 — EXPLAIN</div>
                <div style={styles.systemWindow}>
                  <div style={styles.sysLabel}>STRONG ALIGNMENT</div>
                  <div style={styles.sysItemMinimal}>Frontend</div>
                  <div style={styles.sysItemMinimal}>Backend</div>
                  <div style={styles.sysItemMinimal}>API Development</div>
                  
                  <div style={{ marginTop: '2rem' }}>
                    <div style={{ ...styles.sysLabel, color: 'var(--accent-primary)' }}>CURRENT GAPS</div>
                    <div style={styles.sysItemMinimal}>PostgreSQL</div>
                    <div style={styles.sysItemMinimal}>AWS</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    height: '400vh', // 4 scrollable screens
    position: 'relative',
    backgroundColor: 'var(--bg-primary)',
    borderTop: '1px solid var(--border-light)',
  },
  stickyContainer: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
  },
  leftColumn: {
    flex: 1,
    paddingRight: '4rem',
  },
  phaseLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    letterSpacing: '0.1em',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '4rem',
    fontWeight: 900,
    color: 'var(--text-primary)',
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    marginBottom: '2rem',
  },
  stepIndicators: {
    display: 'flex',
    gap: '0.5rem',
  },
  indicator: {
    height: '4px',
    width: '40px',
    borderRadius: '2px',
    transition: 'background-color 0.3s ease',
  },
  rightColumn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  interfaceBox: {
    width: '100%',
    maxWidth: '500px',
    height: '450px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  stepTag: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
    marginBottom: '2rem',
    fontFamily: 'monospace',
  },
  systemWindow: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  systemWindowCenter: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sysLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  sysValue: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  sysItem: {
    padding: '1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '0.5rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sysItemMinimal: {
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border-light)',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  sysGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sysRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
  },
  sysName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sysCheck: {
    color: 'var(--success-text)',
    fontWeight: 800,
  },
  sysDash: {
    color: 'var(--text-tertiary)',
    fontWeight: 800,
  },
  matchFoundText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '0.05em',
  },
  matchScoreBig: {
    fontSize: '6rem',
    fontWeight: 900,
    color: 'var(--accent-primary)',
    lineHeight: 1,
    margin: '1rem 0',
  },
  matchAlignText: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.2em',
  }
};
