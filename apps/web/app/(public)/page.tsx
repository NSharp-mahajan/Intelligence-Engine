'use client';

import { EngineInAction } from '../../components/landing/EngineInAction';
import { ProblemComparison } from '../../components/landing/ProblemComparison';
import { ScrollDrivenEngine } from '../../components/landing/ScrollDrivenEngine';
import { ExplainableMatchingInteractive } from '../../components/landing/ExplainableMatchingInteractive';
import { EvidenceGraph } from '../../components/landing/EvidenceGraph';
import { ProfileVsEvidence } from '../../components/landing/ProfileVsEvidence';
import { LiveRequirementAnalysis } from '../../components/landing/LiveRequirementAnalysis';
import { WhyCareerIntelligence } from '../../components/landing/WhyCareerIntelligence';
import { ProductPreview } from '../../components/landing/ProductPreview';
import { Footer } from '../../components/landing/Footer';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation */}
      <nav 
        className="landing-nav"
        style={{
          padding: scrolled ? '0.75rem 2rem' : '1.125rem 2rem',
          boxShadow: scrolled ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
          backgroundColor: scrolled ? 'rgba(248, 247, 244, 0.92)' : 'var(--bg-primary)',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid transparent',
        }}
      >
        <div className="landing-nav-inner">
          <Link href="/" className="landing-nav-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M4 20L10 12H14L20 4" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 10V4H14" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="4" cy="20" r="2.5" fill="#151515"/>
              <circle cx="20" cy="4" r="2.5" fill="#151515"/>
            </svg>
            <span>Intelligence-Engine</span>
          </Link>

          <div className="landing-nav-links hide-on-mobile">
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#matching" className="landing-nav-link">Explainable Matching</a>
            <a href="#why" className="landing-nav-link">Why Intelligence-Engine</a>
          </div>

          <div className="landing-nav-actions">
            <Link href="/login" className="landing-nav-link">Sign In</Link>
            <Button 
              onClick={() => router.push('/register')} 
              variant="primary" 
              size="sm"
              className="landing-nav-cta"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main style={{ paddingTop: '64px' }}>
        
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-container">
            
            {/* LEFT COLUMN: MARKETING MESSAGE */}
            <div className="hero-content">
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                <span>EVIDENCE-BASED CAREER MATCHING</span>
              </div>

              <h1 className="hero-title">
                Stop searching.<br />
                <span className="hero-title-accent">Start matching.</span>
              </h1>

              <p className="hero-subtitle">
                See where your skills and project experience fit — and understand what you&apos;re missing before you apply.
              </p>

              <div className="hero-cta-group">
                <Link href="/register" className="hero-btn-primary">
                  Get Started
                </Link>
                <a href="#how-it-works" className="hero-btn-secondary">
                  See How It Works
                </a>
              </div>

              <div className="hero-trust-bar">
                <span className="hero-trust-item">
                  <span className="hero-trust-check">✓</span> Deterministic matching
                </span>
                <span className="hero-trust-sep">·</span>
                <span className="hero-trust-item">
                  <span className="hero-trust-check">✓</span> Verified project evidence
                </span>
                <span className="hero-trust-sep">·</span>
                <span className="hero-trust-item">
                  <span className="hero-trust-check">✓</span> Zero guesswork
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: REALISTIC PRODUCT INTERFACE VISUALIZATION */}
            <div className="hero-visual-wrapper">
              
              {/* Product Mockup Top Label */}
              <div className="hero-visual-eyebrow">
                <span className="hero-visual-eyebrow-text">OPPORTUNITY MATCH</span>
                <span className="hero-visual-eyebrow-badge">
                  <span className="hero-live-dot" /> LIVE EVALUATION
                </span>
              </div>

              {/* Main Product Card */}
              <div className="hero-product-card">
                
                {/* Window Chrome / Bar */}
                <div className="product-card-topbar">
                  <div className="product-card-dots">
                    <span className="dot dot-close" />
                    <span className="dot dot-min" />
                    <span className="dot dot-expand" />
                  </div>
                  <div className="product-card-view-mode">
                    SYSTEM VIEW · DETERMINISTIC ENGINE
                  </div>
                </div>

                {/* Card Header */}
                <div className="product-card-header">
                  <div>
                    <h3 className="product-card-title">Software Engineer</h3>
                    <div className="product-card-org">Example Technology</div>
                  </div>
                  <div className="product-card-meta-tags">
                    <span className="meta-tag">Remote</span>
                    <span className="meta-tag">Full-time</span>
                  </div>
                </div>

                {/* Score Section */}
                <div className="product-card-score-box">
                  <div className="score-box-top">
                    <div className="score-label">MATCH SCORE</div>
                    <div className="score-badge">82% Match</div>
                  </div>
                  <div className="score-progress-track">
                    <div className="score-progress-bar" style={{ width: '82%' }} />
                  </div>
                  <div className="score-fit-text">
                    <span className="score-fit-icon">●</span> Strong fit based on your current evidence
                  </div>
                </div>

                {/* Matched vs Missing Requirements Grid */}
                <div className="product-card-requirements-grid">
                  <div className="requirements-col">
                    <div className="requirements-heading requirements-heading-matched">
                      MATCHED REQUIREMENTS
                    </div>
                    <ul className="requirements-list">
                      <li className="requirement-item requirement-matched">
                        <span className="req-icon req-check">✓</span>
                        <span className="req-name">Java</span>
                      </li>
                      <li className="requirement-item requirement-matched">
                        <span className="req-icon req-check">✓</span>
                        <span className="req-name">REST APIs</span>
                      </li>
                      <li className="requirement-item requirement-matched">
                        <span className="req-icon req-check">✓</span>
                        <span className="req-name">PostgreSQL</span>
                      </li>
                    </ul>
                  </div>

                  <div className="requirements-col">
                    <div className="requirements-heading requirements-heading-missing">
                      MISSING REQUIREMENTS
                    </div>
                    <ul className="requirements-list">
                      <li className="requirement-item requirement-missing">
                        <span className="req-icon req-circle">○</span>
                        <span className="req-name">System Design</span>
                      </li>
                      <li className="requirement-item requirement-missing">
                        <span className="req-icon req-circle">○</span>
                        <span className="req-name">Docker</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Evidence Provenance Section */}
                <div className="product-card-evidence-section">
                  <div className="evidence-heading">EVIDENCE</div>
                  <div className="evidence-items">
                    <div className="evidence-row">
                      <span className="evidence-skill">Java</span>
                      <span className="evidence-provenance">Profile Skill</span>
                    </div>
                    <div className="evidence-row">
                      <span className="evidence-skill">REST APIs</span>
                      <span className="evidence-provenance">Career Intelligence Project</span>
                    </div>
                    <div className="evidence-row">
                      <span className="evidence-skill">PostgreSQL</span>
                      <span className="evidence-provenance">Career Intelligence Project</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="product-card-action">
                  <button type="button" className="product-card-btn">
                    View Opportunity →
                  </button>
                </div>

                {/* Footnote */}
                <div className="product-card-footnote">
                  * Illustrative example for demonstration. All names and scores are illustrative.
                </div>
              </div>

              {/* Floating Secondary Overlapping Card */}
              <div className="hero-floating-card">
                <div className="floating-card-top">
                  <div>
                    <div className="floating-card-title">AI Engineer</div>
                    <div className="floating-card-org">Example Labs</div>
                  </div>
                  <span className="floating-score-badge">74% Match</span>
                </div>
                <div className="floating-card-footer">
                  <span className="floating-dot">●</span> 4 of 5 required skills verified
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ENGINE IN ACTION */}
        <EngineInAction />

        {/* PROBLEM COMPARISON */}
        <ProblemComparison />

        {/* HOW IT WORKS (SCROLL ENGINE) */}
        <div id="how-it-works">
          <ScrollDrivenEngine />
        </div>

        {/* PROFILE VS EVIDENCE */}
        <ProfileVsEvidence />

        {/* EVIDENCE GRAPH */}
        <EvidenceGraph />

        {/* LIVE REQUIREMENT ANALYSIS */}
        <LiveRequirementAnalysis />

        {/* EXPLAINABLE MATCHING */}
        <div id="matching">
          <ExplainableMatchingInteractive />
        </div>

        {/* WHY CAREER INTELLIGENCE */}
        <div id="why">
          <WhyCareerIntelligence />
        </div>

        {/* PRODUCT PREVIEW */}
        <ProductPreview />

        {/* FINAL CTA SECTION */}
        <section style={styles.ctaSection}>
          <div style={styles.ctaContainer}>
            <h2 style={styles.ctaTitle}>Your next career move shouldn't be a guessing game.</h2>
            
            <div style={styles.ctaAnimationBar}>
              <div style={styles.ctaNode}>Evidence</div>
              <div style={styles.ctaLine}><div style={styles.ctaTrace} /></div>
              <div style={styles.ctaNode}>Intelligence</div>
              <div style={styles.ctaLine}><div style={{ ...styles.ctaTrace, animationDelay: '1s' }} /></div>
              <div style={styles.ctaNode}>Opportunity</div>
            </div>

            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => router.push('/register')}
              style={{ padding: '1rem 3rem', fontSize: '1.125rem' }}
            >
              Build Your Evidence →
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    transition: 'all 0.3s ease',
  },
  navLogo: {
    fontWeight: 900,
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  navLinks: {
    display: 'flex',
    gap: '2rem',
  },
  navLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  heroSection: {
    padding: '6rem 2rem 2rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: '4.5rem', /* Reduced from previous massive sizes, 72px approx */
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    color: 'var(--text-primary)',
    marginBottom: '2rem',
  },
  ctaSection: {
    backgroundColor: 'var(--bg-dark)',
    padding: '10rem 2rem',
    display: 'flex',
    justifyContent: 'center',
  },
  ctaContainer: {
    textAlign: 'center',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4rem',
  },
  ctaTitle: {
    fontSize: '3rem',
    fontWeight: 800,
    color: 'var(--text-inverse)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  ctaAnimationBar: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  ctaNode: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  ctaLine: {
    flex: 1,
    height: '2px',
    backgroundColor: 'var(--border-dark)',
    margin: '0 2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaTrace: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '30%',
    background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
    animation: 'trace-travel 2s infinite linear',
  }
};
