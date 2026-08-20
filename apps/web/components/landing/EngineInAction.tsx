'use client';

import { useState, useEffect, useRef } from 'react';

export function EngineInAction() {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 600));
      if (!isMounted) return;
      setStep(1); // Stage 1: Evidence cards fade into position
      
      await new Promise(r => setTimeout(r, 800));
      if (!isMounted) return;
      setStep(2); // Stage 2: Connection lines activate
      
      await new Promise(r => setTimeout(r, 800));
      if (!isMounted) return;
      setStep(3); // Stage 3: Engine changes to MATCH CALCULATED
      
      await new Promise(r => setTimeout(r, 400));
      if (!isMounted) return;
      setStep(4); // Stage 5: Opportunity card visible (start)
      
      // Stage 4: Match score counts upward
      let currentScore = 0;
      const interval = setInterval(() => {
        currentScore += 2;
        if (currentScore >= 82) {
          if (isMounted) setScore(82);
          clearInterval(interval);
        } else {
          if (isMounted) setScore(currentScore);
        }
      }, 20);
    };
    
    sequence();
    return () => { isMounted = false; };
  }, [isVisible]);

  const getEngineStatus = () => {
    if (step < 3) return 'ANALYZING PROFILE';
    return 'MATCH CALCULATED';
  };

  return (
    <section ref={sectionRef} style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>See the engine in action.</h2>
        <p style={styles.subtitle}>
          Career Intelligence turns your verified technical evidence into an explainable opportunity match.
        </p>
      </div>

      <div style={styles.container}>
        {/* LEFT: YOUR EVIDENCE */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>YOUR EVIDENCE</div>
          <div style={styles.evidenceList}>
            {[
              { label: 'React', type: 'skill' },
              { label: 'Node.js', type: 'skill' },
              { label: 'REST APIs', type: 'skill' },
              { label: '3 Verified Projects', type: 'proof' }
            ].map((item, idx) => (
              <div 
                key={idx}
                style={{
                  ...styles.evidenceItem,
                  ...(item.type === 'proof' ? styles.evidenceItemProof : {}),
                  opacity: step >= 1 ? 1 : 0,
                  transform: step >= 1 ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `all 0.5s ease ${idx * 150}ms`
                }}
              >
                <span style={styles.checkIcon}>✓</span> {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: INTELLIGENCE ENGINE */}
        <div style={styles.centerColumn}>
          {/* SVG Connections Left */}
          <div style={styles.connectionLeft}>
            <svg style={styles.svgPath}>
              <path 
                d="M 0,50 C 50,50 50,150 100,150" 
                stroke={step >= 2 ? 'var(--accent-primary)' : 'var(--border-light)'} 
                strokeWidth="2" 
                fill="none" 
                strokeDasharray="200"
                strokeDashoffset={step >= 2 ? 0 : 200}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
              <path 
                d="M 0,250 C 50,250 50,150 100,150" 
                stroke={step >= 2 ? 'var(--accent-primary)' : 'var(--border-light)'} 
                strokeWidth="2" 
                fill="none" 
                strokeDasharray="200"
                strokeDashoffset={step >= 2 ? 0 : 200}
                style={{ transition: 'stroke-dashoffset 1s ease-out 0.2s' }}
              />
            </svg>
          </div>

          {/* Engine Core */}
          <div style={{
            ...styles.engineCore,
            borderColor: step >= 3 ? 'var(--success-text)' : step >= 1 ? 'var(--accent-primary)' : 'var(--border-dark)'
          }}>
            <div style={styles.engineTopRow}>
              <div style={styles.engineBrand}>CAREER INTELLIGENCE</div>
              <div style={styles.statusIndicator}>
                <span style={{
                  ...styles.statusDot, 
                  backgroundColor: step >= 1 ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  boxShadow: step >= 1 && step < 3 ? '0 0 8px var(--accent-primary)' : 'none'
                }} />
                ACTIVE
              </div>
            </div>
            
            <div style={styles.engineTitle}>MATCH ENGINE</div>
            
            <div style={{
              ...styles.engineState,
              color: step >= 3 ? 'var(--success-text)' : 'var(--accent-primary)'
            }}>
              {getEngineStatus()}
              {step >= 1 && step < 3 && <span style={styles.blink}>_</span>}
            </div>

            <div style={styles.engineMetricsGrid}>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>SIGNALS ANALYZED</div>
                <div style={styles.metricValue}>{step >= 1 ? '24' : '0'}</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>EVIDENCE VERIFIED</div>
                <div style={styles.metricValue}>{step >= 2 ? '4' : '0'}</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>REQUIREMENTS</div>
                <div style={styles.metricValue}>{step >= 2 ? '7' : '0'}</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>MATCH CONFIDENCE</div>
                <div style={{...styles.metricValue, color: step >= 3 ? 'var(--accent-primary)' : 'var(--text-primary)'}}>{score}%</div>
              </div>
            </div>
          </div>

          {/* SVG Connections Right */}
          <div style={styles.connectionRight}>
            <svg style={styles.svgPath}>
              <path 
                d="M 0,150 L 100,150" 
                stroke={step >= 3 ? 'var(--accent-primary)' : 'var(--border-light)'} 
                strokeWidth="2" 
                fill="none" 
                strokeDasharray="100"
                strokeDashoffset={step >= 3 ? 0 : 100}
                style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
              />
            </svg>
          </div>
        </div>

        {/* RIGHT: OPPORTUNITY MATCH */}
        <div style={{
          ...styles.column,
          opacity: step >= 4 ? 1 : 0,
          transform: step >= 4 ? 'translateX(0)' : 'translateX(20px)',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={styles.columnHeader}>OPPORTUNITY MATCH</div>
          <div style={styles.oppCard}>
            <div style={styles.oppHeader}>
              <div style={styles.oppScoreBox}>
                <div style={styles.oppScoreVal}>{score}%</div>
                <div style={styles.oppScoreLabel}>MATCH</div>
              </div>
              <div style={styles.oppTitleBox}>
                <div style={styles.oppTitle}>Software Engineering Intern</div>
                <div style={styles.oppCompany}>TechCorp Inc.</div>
              </div>
            </div>

            <div style={styles.oppDetails}>
              <div style={styles.oppSectionLabel}>STRONG ALIGNMENT</div>
              <div style={styles.oppReqList}>
                <div style={styles.oppReqItem}><span style={styles.checkIconSuccess}>✓</span> React</div>
                <div style={styles.oppReqItem}><span style={styles.checkIconSuccess}>✓</span> Node.js</div>
                <div style={styles.oppReqItem}><span style={styles.checkIconSuccess}>✓</span> REST APIs</div>
              </div>

              <div style={{...styles.oppSectionLabel, marginTop: '1.25rem'}}>MISSING</div>
              <div style={styles.oppReqList}>
                <div style={styles.oppReqItem}><span style={styles.dotIcon}>•</span> PostgreSQL</div>
                <div style={styles.oppReqItem}><span style={styles.dotIcon}>•</span> AWS Deployment</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '6rem 2rem',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
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
    letterSpacing: '-0.02em',
    marginBottom: '1rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  container: {
    width: '100%',
    maxWidth: '1100px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '3rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.05)',
    display: 'grid',
    gridTemplateColumns: '250px 1fr 300px',
    gap: '0',
    position: 'relative',
    backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px)`,
    backgroundSize: '20px 20px',
  },
  /* Stacking on mobile handled via CSS in a real app, using flex-wrap here as a fallback */
  column: {
    display: 'flex',
    flexDirection: 'column',
    zIndex: 2,
    backgroundColor: 'var(--bg-surface)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
  },
  columnHeader: {
    fontSize: '0.65rem',
    fontWeight: 800,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginBottom: '1.5rem',
  },
  evidenceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  evidenceItem: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: 'var(--shadow-sm)',
  },
  evidenceItemProof: {
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-inverse)',
    borderColor: 'var(--border-dark)',
  },
  checkIcon: {
    color: 'var(--text-tertiary)',
    fontWeight: 800,
  },
  checkIconSuccess: {
    color: 'var(--success-text)',
    fontWeight: 800,
  },
  dotIcon: {
    color: 'var(--accent-primary)',
    fontWeight: 800,
  },
  centerColumn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '0 1rem',
  },
  connectionLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '50%',
    height: '100%',
    zIndex: 1,
  },
  connectionRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '50%',
    height: '100%',
    zIndex: 1,
  },
  svgPath: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  engineCore: {
    backgroundColor: 'var(--bg-dark)',
    border: '2px solid var(--border-dark)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '300px',
    zIndex: 2,
    boxShadow: 'var(--shadow-lg)',
    transition: 'border-color 0.5s ease',
  },
  engineTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  engineBrand: {
    fontSize: '0.6rem',
    fontWeight: 800,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.6rem',
    fontWeight: 800,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
  },
  engineTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-inverse)',
    letterSpacing: '-0.02em',
    marginBottom: '0.25rem',
  },
  engineState: {
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    marginBottom: '2rem',
    minHeight: '1rem',
    transition: 'color 0.3s ease',
  },
  blink: {
    animation: 'blink 1s step-end infinite',
  },
  engineMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    borderTop: '1px solid var(--border-dark)',
    paddingTop: '1rem',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  metricLabel: {
    fontSize: '0.55rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-inverse)',
    fontFamily: 'monospace',
  },
  oppCard: {
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
  },
  oppHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '1.25rem',
    borderBottom: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-primary)',
    gap: '1rem',
  },
  oppScoreBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '3px solid var(--accent-primary)',
    backgroundColor: 'var(--bg-surface)',
  },
  oppScoreVal: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--accent-primary)',
    lineHeight: 1,
  },
  oppScoreLabel: {
    fontSize: '0.45rem',
    fontWeight: 800,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginTop: '2px',
  },
  oppTitleBox: {
    flex: 1,
  },
  oppTitle: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    marginBottom: '0.15rem',
  },
  oppCompany: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  oppDetails: {
    padding: '1.25rem',
    backgroundColor: 'var(--bg-surface)',
  },
  oppSectionLabel: {
    fontSize: '0.65rem',
    fontWeight: 800,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
  },
  oppReqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  oppReqItem: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  }
};
