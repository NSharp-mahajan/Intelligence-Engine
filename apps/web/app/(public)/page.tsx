'use client';

import { HeroInteractive } from '../../components/landing/HeroInteractive';
import { ProblemComparison } from '../../components/landing/ProblemComparison';
import { ScrollDrivenEngine } from '../../components/landing/ScrollDrivenEngine';
import { ExplainableMatchingInteractive } from '../../components/landing/ExplainableMatchingInteractive';
import { EvidenceGraph } from '../../components/landing/EvidenceGraph';
import { ProfileVsEvidence } from '../../components/landing/ProfileVsEvidence';
import { LiveRequirementAnalysis } from '../../components/landing/LiveRequirementAnalysis';
import { WhyCareerIntelligence } from '../../components/landing/WhyCareerIntelligence';
import { ProductPreview } from '../../components/landing/ProductPreview';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation */}
      <nav style={{
        ...styles.nav,
        padding: scrolled ? '1rem 2rem' : '1.5rem 2rem',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.9)' : 'var(--bg-primary)',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
      }}>
        <div style={styles.navLogo}>Career Intelligence</div>
        <div style={styles.navLinks}>
          <a href="#how-it-works" style={styles.navLink}>How It Works</a>
          <a href="#matching" style={styles.navLink}>Explainable Matching</a>
          <a href="#why" style={styles.navLink}>Why Career Intelligence</a>
        </div>
        <div style={styles.navActions}>
          <a href="/login" style={styles.navLink}>Sign In</a>
          <Button onClick={() => router.push('/register')} variant="primary" size="sm">Get Started</Button>
        </div>
      </nav>

      <main style={{ paddingTop: '80px' }}>
        
        {/* HERO SECTION */}
        <section style={styles.heroSection}>
          <h1 style={styles.heroTitle}>
            Stop searching.<br />
            <span style={{ color: 'var(--accent-primary)' }}>Start matching.</span>
          </h1>
          <HeroInteractive />
        </section>

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
    padding: '6rem 2rem 10rem 2rem',
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
