'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={styles.container}>
      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Students don't need more opportunity listings.
          </h1>
          <p style={styles.heroSubtitle}>
            They need to understand which opportunities actually fit them. Stop guessing and start matching based on your actual skills and projects.
          </p>
          <div style={styles.heroCtas}>
            <Link href="/register" style={styles.primaryCta}>
              Get Started
            </Link>
            <Link href="#how-it-works" style={styles.secondaryCta}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="why-us" style={styles.problemSection}>
        <div style={styles.problemContent}>
          <h2 style={styles.sectionTitle}>The Broken Search</h2>
          <div style={styles.problemGrid}>
            <div style={styles.problemCard}>
              <h3 style={styles.problemCardTitle}>Endless Scrolling</h3>
              <p style={styles.problemCardText}>Searching through thousands of irrelevant listings wastes time and destroys morale.</p>
            </div>
            <div style={styles.problemCard}>
              <h3 style={styles.problemCardTitle}>Unknown Fit</h3>
              <p style={styles.problemCardText}>Applying blindly without knowing if you meet the core requirements leads to silent rejections.</p>
            </div>
            <div style={styles.problemCard}>
              <h3 style={styles.problemCardTitle}>Scattered Evidence</h3>
              <p style={styles.problemCardText}>Your skills, projects, and portfolio are scattered. We bring them together to prove your capability.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={styles.howItWorksSection}>
        <div style={styles.howContent}>
          <h2 style={styles.sectionTitle}>How Career Intelligence Works</h2>
          <div style={styles.stepsList}>
            <div style={styles.step}>
              <div style={styles.stepNum}>01</div>
              <h3 style={styles.stepTitle}>Build your profile</h3>
              <p style={styles.stepText}>Connect your identity, education, and target roles in minutes.</p>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>02</div>
              <h3 style={styles.stepTitle}>Understand your skills</h3>
              <p style={styles.stepText}>Catalog your technical and soft skills supported by actual project evidence.</p>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>03</div>
              <h3 style={styles.stepTitle}>Match with opportunities</h3>
              <p style={styles.stepText}>Our engine discovers the roles that align directly with your unique background.</p>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>04</div>
              <h3 style={styles.stepTitle}>Understand why</h3>
              <p style={styles.stepText}>Never guess again. See exactly why you match and what gaps you need to fill.</p>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLAINABLE MATCH SECTION (ILLUSTRATIVE) */}
      <section id="matching" style={styles.matchSection}>
        <div style={styles.matchContent}>
          <div style={styles.matchText}>
            <h2 style={styles.sectionTitle}>Explainable Matching</h2>
            <p style={styles.matchSubtitle}>
              We don't just give you a percentage. We break down exactly why an opportunity is right for you, making your application significantly stronger.
            </p>
          </div>
          
          <div style={styles.matchUiBox}>
            <div style={styles.matchUiHeader}>
              <h4>Software Engineering Intern</h4>
              <span style={styles.matchBadge}>Strong Match</span>
            </div>
            
            <div style={styles.matchUiBody}>
              <div style={styles.matchUiCol}>
                <h5 style={styles.matchUiColTitle}>Strong Matches</h5>
                <ul style={styles.matchList}>
                  <li style={styles.matchItem}><span style={styles.check}>✓</span> React</li>
                  <li style={styles.matchItem}><span style={styles.check}>✓</span> Node.js</li>
                  <li style={styles.matchItem}><span style={styles.check}>✓</span> REST APIs</li>
                </ul>
              </div>
              <div style={styles.matchUiCol}>
                <h5 style={styles.matchUiColTitle}>Missing</h5>
                <ul style={styles.matchList}>
                  <li style={styles.matchItem}><span style={styles.bullet}>•</span> PostgreSQL</li>
                  <li style={styles.matchItem}><span style={styles.bullet}>•</span> AWS</li>
                </ul>
              </div>
            </div>
            
            <div style={styles.matchUiFooter}>
              <strong>Why this matches:</strong>
              <p>"You already satisfy most of the core requirements. Your main gaps are PostgreSQL and AWS."</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={styles.finalCtaSection}>
        <h2 style={styles.finalCtaTitle}>Your next opportunity shouldn't be a guessing game.</h2>
        <Link href="/register" style={styles.primaryCta}>
          Build Your Profile
        </Link>
      </section>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  hero: {
    padding: '8rem 2rem',
    backgroundColor: '#faf9f6',
    display: 'flex',
    justifyContent: 'center',
    textAlign: 'center' as const,
  },
  heroContent: {
    maxWidth: '800px',
  },
  heroTitle: {
    fontSize: '4rem',
    fontWeight: '800',
    lineHeight: '1.1',
    letterSpacing: '-0.03em',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: '#52525b',
    lineHeight: '1.6',
    marginBottom: '2.5rem',
    maxWidth: '600px',
    margin: '0 auto 2.5rem auto',
  },
  heroCtas: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryCta: {
    backgroundColor: '#16a34a', // Green
    color: '#ffffff',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1.125rem',
    textDecoration: 'none',
    boxShadow: '0 4px 14px 0 rgba(22, 163, 74, 0.39)',
  },
  secondaryCta: {
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1.125rem',
    textDecoration: 'none',
    border: '1px solid #e5e5e5',
  },
  problemSection: {
    padding: '6rem 2rem',
    backgroundColor: '#ffffff',
  },
  problemContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    marginBottom: '3rem',
    textAlign: 'center' as const,
  },
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  problemCard: {
    padding: '2rem',
    backgroundColor: '#faf9f6',
    borderRadius: '12px',
    border: '1px solid #e5e5e5',
  },
  problemCardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1rem',
  },
  problemCardText: {
    color: '#52525b',
    lineHeight: '1.6',
  },
  howItWorksSection: {
    padding: '6rem 2rem',
    backgroundColor: '#faf9f6',
  },
  howContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  stepsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
  },
  step: {
    padding: '2rem',
  },
  stepNum: {
    fontSize: '3rem',
    fontWeight: '800',
    color: '#ea580c', // Orange
    marginBottom: '1rem',
    opacity: 0.9,
  },
  stepTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1rem',
  },
  stepText: {
    color: '#52525b',
    lineHeight: '1.6',
  },
  matchSection: {
    padding: '6rem 2rem',
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
  },
  matchContent: {
    maxWidth: '1000px',
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4rem',
    alignItems: 'center',
  },
  matchText: {
    paddingRight: '2rem',
  },
  matchSubtitle: {
    fontSize: '1.125rem',
    color: '#52525b',
    lineHeight: '1.6',
    marginTop: '-1.5rem',
  },
  matchUiBox: {
    backgroundColor: '#faf9f6',
    border: '1px solid #e5e5e5',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
  },
  matchUiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: '1rem',
  },
  matchBadge: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  matchUiBody: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '2rem',
  },
  matchUiCol: {
    flex: 1,
  },
  matchUiColTitle: {
    fontSize: '0.875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#a1a1aa',
    marginBottom: '1rem',
  },
  matchList: {
    listStyle: 'none',
  },
  matchItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    fontWeight: '500',
  },
  check: {
    color: '#16a34a',
    fontWeight: 'bold',
  },
  bullet: {
    color: '#ea580c',
    fontWeight: 'bold',
  },
  matchUiFooter: {
    backgroundColor: '#ffffff',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
  finalCtaSection: {
    padding: '8rem 2rem',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  finalCtaTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    marginBottom: '2.5rem',
    maxWidth: '600px',
  }
};
