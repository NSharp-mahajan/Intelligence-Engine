'use client';

import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';

export default function LandingPage() {
  return (
    <div style={styles.container}>
      
      {/* 1. HERO SECTION */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Stop searching.<br />Start matching.
          </h1>
          <p style={styles.heroSubtitle}>
            Career Intelligence analyzes your skills and project evidence to match you with roles you are actually qualified for—and tells you exactly why.
          </p>
          <div style={styles.heroCtas}>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <Button variant="primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>Build Your Profile</Button>
            </Link>
            <Link href="#how-it-works" style={{ textDecoration: 'none' }}>
              <Button variant="outline" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>See How It Works</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE AGITATION (PROBLEM SECTION) */}
      <section id="why-us" style={styles.problemSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>The Broken Job Search</h2>
          <p style={styles.sectionSubtitle}>The current system relies on keyword-stuffed resumes and blind applications.</p>
        </div>
        <div style={styles.grid3}>
          <div style={styles.problemCard}>
            <div style={styles.problemIcon}>01</div>
            <h3 style={styles.cardTitle}>The Black Hole</h3>
            <p style={styles.cardText}>Applying to hundreds of job boards only to receive automated rejections or total silence damages your morale.</p>
          </div>
          <div style={styles.problemCard}>
            <div style={styles.problemIcon}>02</div>
            <h3 style={styles.cardTitle}>The Guessing Game</h3>
            <p style={styles.cardText}>You never truly know if your skill level matches the employer's unwritten expectations for the role.</p>
          </div>
          <div style={styles.problemCard}>
            <div style={styles.problemIcon}>03</div>
            <h3 style={styles.cardTitle}>Scattered Evidence</h3>
            <p style={styles.cardText}>Your code is on GitHub, your portfolio is separate, and your resume is a PDF. Your evidence is completely disjointed.</p>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" style={styles.howItWorksSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>How Career Intelligence Works</h2>
          <p style={styles.sectionSubtitle}>A systematic approach to discovering your next role.</p>
        </div>
        
        <div style={styles.stepsContainer}>
          <Step 
            num="01" 
            title="Define your target" 
            text="Set your career goals, graduation timeline, and target roles in a clean, guided profile setup." 
          />
          <Step 
            num="02" 
            title="Connect your evidence" 
            text="Log your actual projects, link your GitHub, and map out the skills you can tangibly prove." 
          />
          <Step 
            num="03" 
            title="Let the engine work" 
            text="We continuously analyze the technical overlap between your proven capability and the open market." 
          />
          <Step 
            num="04" 
            title="Understand the match" 
            text="See exactly why a job fits you, what gaps you might have, and how to position your application." 
          />
        </div>
      </section>

      {/* 4. EXPLAINABLE MATCHING UI */}
      <section id="matching" style={styles.matchSection}>
        <div style={styles.matchGrid}>
          <div style={styles.matchTextContent}>
            <h2 style={styles.matchTitle}>Explainable Matching</h2>
            <p style={styles.matchDesc}>
              We don't just give you an arbitrary "match percentage." We break down exactly why an opportunity is right for you. 
              <br/><br/>
              When you know exactly which of your skills align and where your gaps are, your applications become significantly stronger and your interview prep becomes targeted.
            </p>
          </div>
          
          <div style={styles.matchUiWrapper}>
            <div style={styles.matchUiBox}>
              <div style={styles.matchUiHeader}>
                <div>
                  <h4 style={styles.matchRole}>Software Engineering Intern</h4>
                  <p style={styles.matchCompany}>TechCorp Inc.</p>
                </div>
                <span style={styles.matchBadge}>Strong Match</span>
              </div>
              
              <div style={styles.matchUiBody}>
                <div style={styles.matchUiCol}>
                  <h5 style={styles.matchUiColTitle}>Verified Alignment</h5>
                  <ul style={styles.matchList}>
                    <li style={styles.matchItem}><span style={styles.check}>✓</span> React (2 Projects)</li>
                    <li style={styles.matchItem}><span style={styles.check}>✓</span> Node.js (1 Project)</li>
                    <li style={styles.matchItem}><span style={styles.check}>✓</span> REST APIs</li>
                  </ul>
                </div>
                <div style={styles.matchUiCol}>
                  <h5 style={styles.matchUiColTitle}>Missing Requirements</h5>
                  <ul style={styles.matchList}>
                    <li style={styles.matchItem}><span style={styles.bullet}>•</span> PostgreSQL</li>
                    <li style={styles.matchItem}><span style={styles.bullet}>•</span> AWS Deployment</li>
                  </ul>
                </div>
              </div>
              
              <div style={styles.matchUiFooter}>
                <strong style={styles.footerLabel}>Intelligence Insight:</strong>
                <p style={styles.footerText}>"You easily satisfy the core frontend/backend requirements. Your main gaps are in database management and cloud infrastructure."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TARGET AUDIENCE */}
      <section style={styles.audienceSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Built for the modern candidate</h2>
        </div>
        <div style={styles.grid3}>
          <div style={styles.audienceCard}>
            <h3 style={styles.audienceTitle}>CS Students</h3>
            <p style={styles.audienceText}>Looking for that crucial first internship? Map your academic projects to real-world job requirements to prove your readiness.</p>
          </div>
          <div style={styles.audienceCard}>
            <h3 style={styles.audienceTitle}>Recent Grads</h3>
            <p style={styles.audienceText}>Transitioning from theory to industry requires showing tangible evidence. We help you package your capstones into hireable proof.</p>
          </div>
          <div style={styles.audienceCard}>
            <h3 style={styles.audienceTitle}>Career Switchers</h3>
            <p style={styles.audienceText}>Graduating from a bootcamp? Let your portfolio do the talking. Match with employers who value proven skills over traditional credentials.</p>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section style={styles.finalCtaSection}>
        <div style={styles.finalCtaContent}>
          <h2 style={styles.finalCtaTitle}>Your next career move shouldn't be a guessing game.</h2>
          <div style={{ marginTop: '2.5rem' }}>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <Button variant="primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }}>
                Create your free account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Component
function Step({ num, title, text }: { num: string; title: string; text: string }) {
  return (
    <div style={styles.step}>
      <div style={styles.stepNum}>{num}</div>
      <h3 style={styles.stepTitle}>{title}</h3>
      <p style={styles.stepText}>{text}</p>
    </div>
  );
}

// Styling System
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },

  // Shared
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '4rem',
    maxWidth: '700px',
    margin: '0 auto 4rem auto',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#1a1a1a',
    letterSpacing: '-0.03em',
    marginBottom: '1rem',
  },
  sectionSubtitle: {
    fontSize: '1.125rem',
    color: '#52525b',
    lineHeight: 1.6,
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '0 2rem',
  },

  // Hero
  heroSection: {
    padding: '10rem 2rem 8rem 2rem',
    backgroundColor: '#faf9f6',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    borderBottom: '1px solid #e5e5e5',
  },
  heroContent: {
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: '5rem',
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: '-0.04em',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },
  heroSubtitle: {
    fontSize: '1.375rem',
    color: '#52525b',
    lineHeight: 1.5,
    marginBottom: '3rem',
    maxWidth: '650px',
  },
  heroCtas: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  // Problem Section
  problemSection: {
    padding: '8rem 0',
    backgroundColor: '#ffffff',
  },
  problemCard: {
    padding: '2.5rem',
    backgroundColor: '#faf9f6',
    borderRadius: '12px',
    border: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  problemIcon: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#ea580c',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e5e5',
    marginBottom: '0.5rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  cardText: {
    color: '#52525b',
    lineHeight: 1.6,
    fontSize: '1rem',
  },

  // How It Works
  howItWorksSection: {
    padding: '8rem 0',
    backgroundColor: '#faf9f6',
    borderTop: '1px solid #e5e5e5',
  },
  stepsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '3rem',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
  },
  stepNum: {
    fontSize: '3.5rem',
    fontWeight: 800,
    color: '#e5e5e5', // subtle number
    marginBottom: '1rem',
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  stepTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '0.75rem',
  },
  stepText: {
    color: '#52525b',
    lineHeight: 1.6,
  },

  // Match Section
  matchSection: {
    padding: '10rem 2rem',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e5e5',
    borderBottom: '1px solid #e5e5e5',
  },
  matchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '6rem',
    maxWidth: '1200px',
    margin: '0 auto',
    alignItems: 'center',
  },
  matchTextContent: {
    paddingRight: '2rem',
  },
  matchTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#1a1a1a',
    letterSpacing: '-0.03em',
    marginBottom: '1.5rem',
  },
  matchDesc: {
    fontSize: '1.125rem',
    color: '#52525b',
    lineHeight: 1.6,
  },
  matchUiWrapper: {
    width: '100%',
  },
  matchUiBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
  },
  matchUiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    borderBottom: '1px solid #f4f4f5',
    paddingBottom: '1.5rem',
  },
  matchRole: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },
  matchCompany: {
    fontSize: '0.875rem',
    color: '#52525b',
  },
  matchBadge: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    padding: '0.375rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  matchUiBody: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  matchUiCol: {
    flex: 1,
    minWidth: '200px',
  },
  matchUiColTitle: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#a1a1aa',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  matchList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  matchItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    fontWeight: 500,
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
    backgroundColor: '#faf9f6',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
  },
  footerLabel: {
    display: 'block',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
    fontWeight: 700,
  },
  footerText: {
    fontSize: '0.875rem',
    color: '#52525b',
    lineHeight: 1.5,
    fontStyle: 'italic',
    margin: 0,
  },

  // Target Audience
  audienceSection: {
    padding: '8rem 0',
    backgroundColor: '#faf9f6',
  },
  audienceCard: {
    padding: '2rem 0',
    borderTop: '1px solid #1a1a1a',
  },
  audienceTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '1rem',
    marginTop: '1.5rem',
  },
  audienceText: {
    color: '#52525b',
    lineHeight: 1.6,
  },

  // Final CTA
  finalCtaSection: {
    padding: '10rem 2rem',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    justifyContent: 'center',
  },
  finalCtaContent: {
    maxWidth: '600px',
    textAlign: 'center',
  },
  finalCtaTitle: {
    fontSize: '3rem',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.03em',
    marginBottom: '1rem',
    lineHeight: 1.2,
  },
};
