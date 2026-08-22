'use client';

import { ReactNode } from 'react';

interface GlassAuthLayoutProps {
  children: ReactNode;
}

// ----------------------------------------------------------------------
// PLACEHOLDER BACKGROUND IMAGE CONFIGURATION
// Replace this path with the final background image.
// The image should be 1920x1080+ and represent intelligence/data/networks.
// ----------------------------------------------------------------------
const AUTH_BACKGROUND_IMAGE = "/images/background-image-registration.png";

export function GlassAuthLayout({ children }: GlassAuthLayoutProps) {
  return (
    <div style={styles.pageContainer}>
      {/* Background Image & Overlays */}
      <div 
        style={{
          ...styles.backgroundImage,
          backgroundImage: `url(${AUTH_BACKGROUND_IMAGE})`
        }} 
      />
      <div style={styles.overlayDark} />
      <div style={styles.overlayAtmosphere} />

      {/* Glass Panel */}
      <div style={styles.glassContainer}>
        
        {/* Left Side: Brand Visual (Hidden on Mobile) */}
        <div style={styles.leftPanel} className="hide-on-mobile">
          <div style={styles.leftContent}>
            
            <div style={styles.brandWrapper}>
              <div style={styles.logoMark}>CI</div>
              <span style={styles.brandText}>CAREER INTELLIGENCE</span>
            </div>

            <div style={styles.messaging}>
              <h1 style={styles.headline}>Build evidence.<br />Know where you fit.</h1>
              <p style={styles.subtext}>
                Connect your skills, projects and technical evidence to opportunities where your profile actually fits.
              </p>
            </div>

            {/* Product Visualization: Miniature Engine */}
            <div style={styles.visualization}>
              <div style={styles.engineStatus}>
                <div style={styles.statusPulse} />
                MATCH ENGINE ACTIVE
              </div>

              <div style={styles.flowDiagram}>
                <div style={styles.evidenceRow}>
                  {['React', 'Node.js', 'REST APIs'].map((skill, idx) => (
                    <div key={skill} style={{ ...styles.glassNode, animationDelay: `${idx * 0.15}s` }}>
                      {skill}
                    </div>
                  ))}
                </div>

                <div style={styles.convergingLines}>
                  <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 0 C20 20, 60 20, 60 40" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <path d="M60 0 L60 40" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <path d="M100 0 C100 20, 60 20, 60 40" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    {/* Animated traces */}
                    <circle cx="20" cy="0" r="1.5" fill="var(--accent-primary)">
                      <animateMotion path="M0 0 C0 20, 40 20, 40 40" dur="3s" repeatCount="indefinite" begin="0s" />
                    </circle>
                    <circle cx="60" cy="0" r="1.5" fill="var(--accent-primary)">
                      <animateMotion path="M0 0 L0 40" dur="3s" repeatCount="indefinite" begin="1s" />
                    </circle>
                    <circle cx="100" cy="0" r="1.5" fill="var(--accent-primary)">
                      <animateMotion path="M0 0 C0 20, -40 20, -40 40" dur="3s" repeatCount="indefinite" begin="2s" />
                    </circle>
                  </svg>
                </div>

                <div style={styles.matchCore}>
                  MATCH
                </div>

                <div style={styles.downwardLine}>
                  <div style={styles.verticalTrace} />
                </div>

                <div style={styles.opportunityResult}>
                  <div style={styles.roleLabel}>Software Engineer</div>
                  <div style={styles.matchScore}>82% Match</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Vertical Divider */}
        <div style={styles.divider} className="hide-on-mobile" />

        {/* Right Side: Auth Form */}
        <div style={styles.rightPanel}>
          <div style={styles.formContainer}>
            <div style={styles.mobileHeader} className="mobile-only">
              <div style={styles.logoMarkMobile}>CI</div>
              <span style={styles.brandTextMobile}>CAREER INTELLIGENCE</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    width: '100vw',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflowX: 'hidden',
    backgroundColor: '#0a0a0a', // Dark fallback
  },
  backgroundImage: {
    position: 'absolute',
    top: -20, // Slight overflow for slow pan
    left: -20,
    width: 'calc(100% + 40px)',
    height: 'calc(100% + 40px)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 1,
    opacity: 0,
    animation: 'fadeInSlow 2s ease forwards, slowPan 30s ease-in-out infinite alternate',
  },
  overlayDark: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 5, 5, 0.7)', // Dark warm overlay
    zIndex: 2,
  },
  overlayAtmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 3,
  },
  glassContainer: {
    width: '90%',
    maxWidth: '1150px',
    minHeight: '650px',
    backgroundColor: 'rgba(250, 250, 250, 0.55)', // True glassmorphism: translucent neutral
    backdropFilter: 'blur(30px) saturate(120%)',
    WebkitBackdropFilter: 'blur(30px) saturate(120%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderTop: '1px solid rgba(255, 255, 255, 0.45)', // Highlight from top
    borderLeft: '1px solid rgba(255, 255, 255, 0.45)', // Highlight from left
    borderRadius: '24px',
    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255,255,255,0.15)',
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
    zIndex: 10,
    overflow: 'hidden',
    animation: 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  leftPanel: {
    flex: '0 0 45%',
    padding: '3.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 2,
  },
  divider: {
    width: '1px',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    boxShadow: '1px 0 0 rgba(255, 255, 255, 0.2)',
    zIndex: 2,
  },
  rightPanel: {
    flex: '1',
    padding: '3.5rem 4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly lighter right side for form readability
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px',
  },
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  brandWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '4rem',
  },
  logoMark: {
    width: '24px',
    height: '24px',
    backgroundColor: 'var(--text-primary)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.75rem',
    borderRadius: '4px',
  },
  brandText: {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.1em',
  },
  messaging: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '3rem',
  },
  headline: {
    fontSize: '2.25rem', // 36px
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  subtext: {
    fontSize: '0.9375rem', // 15px
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: '90%',
  },
  visualization: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: 'inset 0 0 20px rgba(255,255,255,0.2)',
  },
  engineStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.65rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    color: 'var(--text-secondary)',
    marginBottom: '1.5rem',
  },
  statusPulse: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10B981', // subtle green for status
    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
    animation: 'blink 2s ease-in-out infinite',
  },
  flowDiagram: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  evidenceRow: {
    display: 'flex',
    gap: '1rem',
  },
  glassNode: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    animation: 'float 3s ease-in-out infinite alternate',
  },
  convergingLines: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCore: {
    padding: '0.5rem 1.5rem',
    backgroundColor: 'var(--text-primary)',
    color: 'var(--text-inverse)',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  downwardLine: {
    width: '1px',
    height: '30px',
    backgroundColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  verticalTrace: {
    position: 'absolute',
    top: 0,
    left: '-1px',
    width: '3px',
    height: '8px',
    backgroundColor: 'var(--accent-primary)',
    animation: 'trace-travel-vertical 2s linear infinite',
  },
  opportunityResult: {
    padding: '0.75rem 1.25rem',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.08)',
  },
  roleLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  matchScore: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: 'var(--accent-primary)', // Subtle orange highlight
  },
  mobileHeader: {
    marginBottom: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoMarkMobile: {
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--text-primary)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.875rem',
    borderRadius: '6px',
  },
  brandTextMobile: {
    fontSize: '0.875rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.1em',
  },
};
