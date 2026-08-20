'use client';

import { useState, useEffect } from 'react';

export function HeroInteractive() {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);

  useEffect(() => {
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 800));
      setStep(1); // Evidence appears
      await new Promise(r => setTimeout(r, 800));
      setStep(2); // Connecting
      await new Promise(r => setTimeout(r, 800));
      setStep(3); // Analyzing
      await new Promise(r => setTimeout(r, 1000));
      setStep(4); // Comparing
      await new Promise(r => setTimeout(r, 1000));
      setStep(5); // Match found, opportunity appears
      
      // Animate score
      let currentScore = 0;
      const interval = setInterval(() => {
        currentScore += 2;
        if (currentScore >= 82) {
          setScore(82);
          clearInterval(interval);
        } else {
          setScore(currentScore);
        }
      }, 20);
    };
    sequence();
  }, []);

  const getEngineStatus = () => {
    switch (step) {
      case 0:
      case 1: return 'COLLECTING EVIDENCE';
      case 2:
      case 3: return 'ANALYZING';
      case 4: return 'COMPARING REQUIREMENTS';
      case 5: return 'MATCH FOUND';
      default: return 'COLLECTING EVIDENCE';
    }
  };

  return (
    <div style={styles.container}>
      {/* LEFT: EVIDENCE */}
      <div style={styles.column}>
        <div style={styles.columnTitle}>Candidate Evidence</div>
        <div style={styles.evidenceList}>
          {['React', 'Node.js', 'REST APIs', 'Projects', 'GitHub Evidence'].map((item, idx) => (
            <div 
              key={item}
              style={{
                ...styles.evidenceItem,
                opacity: step >= 1 ? 1 : 0,
                transform: step >= 1 ? 'translateX(0)' : 'translateX(-20px)',
                transitionDelay: `${idx * 150}ms`,
                backgroundColor: hoverTarget === item ? 'var(--accent-light)' : 'var(--bg-surface)',
                borderColor: hoverTarget === item ? 'var(--accent-primary)' : 'var(--border-light)'
              }}
              onMouseEnter={() => setHoverTarget(item)}
              onMouseLeave={() => setHoverTarget(null)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: ENGINE */}
      <div style={styles.centerColumn}>
        {/* Connection Lines (SVG) */}
        <svg style={styles.svgConnections}>
          <path 
            d="M 0,50 Q 100,50 150,150 T 300,150" 
            stroke={step >= 2 ? 'var(--accent-primary)' : 'var(--border-light)'} 
            strokeWidth="2" 
            fill="none" 
            strokeDasharray="400"
            strokeDashoffset={step >= 2 ? 0 : 400}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.3s' }}
          />
        </svg>

        <div style={{
          ...styles.engineBox,
          borderColor: step >= 5 ? 'var(--success-text)' : step >= 2 ? 'var(--accent-primary)' : 'var(--border-light)',
          boxShadow: step >= 5 ? '0 0 20px rgba(21, 128, 61, 0.2)' : 'var(--shadow-sm)'
        }}>
          <div style={styles.engineTitle}>CAREER INTELLIGENCE</div>
          <div style={styles.engineSubtitle}>MATCH ENGINE</div>
          <div style={{
            ...styles.engineStatus,
            color: step >= 5 ? 'var(--success-text)' : 'var(--accent-primary)'
          }}>
            {getEngineStatus()}
            {step > 1 && step < 5 && <span style={styles.blink}>_</span>}
          </div>
        </div>

        <svg style={styles.svgConnectionsRight}>
          <path 
            d="M 0,150 L 200,150" 
            stroke={step >= 4 ? 'var(--accent-primary)' : 'var(--border-light)'} 
            strokeWidth="2" 
            fill="none" 
            strokeDasharray="200"
            strokeDashoffset={step >= 4 ? 0 : 200}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
      </div>

      {/* RIGHT: OPPORTUNITY */}
      <div style={{
        ...styles.column,
        opacity: step >= 5 ? 1 : 0,
        transform: step >= 5 ? 'translateX(0)' : 'translateX(20px)',
        transition: 'all 0.5s ease-out'
      }}>
        <div style={styles.columnTitle}>Opportunity</div>
        <div 
          style={styles.oppCard}
          onMouseEnter={() => setHoverTarget('opportunity')}
          onMouseLeave={() => setHoverTarget(null)}
        >
          <div style={styles.oppTitle}>Software Engineering Intern</div>
          <div style={styles.oppCompany}>TechCorp Inc.</div>
          
          <div 
            style={styles.scoreCircle}
            onMouseEnter={() => setHoverTarget('score')}
            onMouseLeave={() => setHoverTarget('opportunity')}
          >
            <div style={styles.scoreText}>{score}%</div>
            <div style={styles.scoreLabel}>ALIGNMENT</div>
            
            {hoverTarget === 'score' && (
              <div style={styles.tooltip}>
                3 requirements strongly aligned<br/>
                2 requirements currently missing
              </div>
            )}
          </div>

          <div style={styles.requirementsList}>
            <div style={styles.reqItem}>
              <span style={styles.reqIconSuccess}>✓</span> React
            </div>
            <div style={styles.reqItem}>
              <span style={styles.reqIconSuccess}>✓</span> Node.js
            </div>
            <div style={styles.reqItem}>
              <span style={styles.reqIconSuccess}>✓</span> REST APIs
            </div>
            <div style={styles.reqItem}>
              <span style={styles.reqIconMissing}>!</span> PostgreSQL
            </div>
            <div style={styles.reqItem}>
              <span style={styles.reqIconMissing}>!</span> AWS
            </div>
          </div>

          {hoverTarget === 'opportunity' && (
            <div style={styles.tooltipBottom}>
              5 requirements analyzed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1000px',
    margin: '4rem auto 0',
    padding: '2rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.05)',
    position: 'relative',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    width: '250px',
    zIndex: 2,
  },
  columnTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '1rem',
  },
  evidenceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  evidenceItem: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    transition: 'all 0.3s ease',
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  centerColumn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: '300px',
  },
  svgConnections: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '50%',
    height: '100%',
    zIndex: 1,
  },
  svgConnectionsRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '50%',
    height: '100%',
    zIndex: 1,
  },
  engineBox: {
    backgroundColor: 'var(--bg-dark)',
    padding: '1.5rem 2rem',
    borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
    transition: 'all 0.3s ease',
  },
  engineTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
  },
  engineSubtitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-inverse)',
    letterSpacing: '-0.02em',
    marginTop: '0.25rem',
  },
  engineStatus: {
    fontSize: '0.7rem',
    fontWeight: 700,
    marginTop: '1rem',
    letterSpacing: '0.05em',
    fontFamily: 'monospace',
  },
  blink: {
    animation: 'blink 1s step-end infinite',
  },
  oppCard: {
    padding: '1.5rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    position: 'relative',
    transition: 'border-color 0.2s',
    cursor: 'default',
  },
  oppTitle: {
    fontSize: '1.125rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  oppCompany: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  scoreCircle: {
    margin: '1.5rem auto',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '4px solid var(--accent-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scoreText: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--accent-primary)',
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
    marginTop: '0.25rem',
  },
  requirementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  reqItem: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  reqIconSuccess: {
    color: 'var(--success-text)',
    fontWeight: 700,
  },
  reqIconMissing: {
    color: 'var(--accent-primary)', /* Orange for missing */
    fontWeight: 700,
  },
  tooltip: {
    position: 'absolute',
    top: '-3rem',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-inverse)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    zIndex: 10,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  tooltipBottom: {
    position: 'absolute',
    bottom: '-2.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-inverse)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    zIndex: 10,
  }
};
