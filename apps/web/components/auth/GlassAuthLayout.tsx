'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';

interface GlassAuthLayoutProps {
  children: ReactNode;
}

export function GlassAuthLayout({ children }: GlassAuthLayoutProps) {
  return (
    <div className="auth-page-container">
      <div className="auth-card-wrapper">
        
        {/* LEFT PANEL: BRANDING & PRODUCT VISUALIZATION (HIDDEN ON MOBILE) */}
        <div className="auth-left-panel hide-on-mobile">
          
          {/* Header Brand */}
          <div>
            <Link href="/" className="auth-brand-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M4 20L10 12H14L20 4" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 10V4H14" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="4" cy="20" r="2.5" fill="#151515"/>
                <circle cx="20" cy="4" r="2.5" fill="#151515"/>
              </svg>
              <span>Intelligence-Engine</span>
            </Link>
          </div>

          {/* Left Body Messaging & Visualization */}
          <div className="auth-left-body">
            <h1 className="auth-left-headline">
              Build evidence.<br />
              Know where you fit.
            </h1>

            <p className="auth-left-subtext">
              Connect your skills, projects and technical evidence to opportunities where your profile actually fits.
            </p>

            {/* Product Visualization: Miniature Matching Panel */}
            <div className="auth-visual-card">
              <div className="auth-visual-status">
                <span className="auth-status-dot" />
                <span>MATCH ENGINE ACTIVE</span>
              </div>

              <div className="auth-visual-section-label">Your Skills</div>
              <div className="auth-visual-skills-row">
                <span className="auth-skill-chip">React</span>
                <span className="auth-skill-chip">Node.js</span>
                <span className="auth-skill-chip">REST APIs</span>
              </div>

              <div className="auth-visual-flow-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" />
                  <path d="M19 12l-7 7-7-7" />
                </svg>
              </div>

              <div className="auth-visual-matching-badge">
                <span>MATCHING ENGINE</span>
              </div>

              <div className="auth-visual-flow-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" />
                  <path d="M19 12l-7 7-7-7" />
                </svg>
              </div>

              <div className="auth-visual-result-card">
                <div>
                  <div className="auth-result-label">OPPORTUNITY</div>
                  <div className="auth-result-title">Software Engineer</div>
                </div>
                <div className="auth-result-badge">82% Match</div>
              </div>
            </div>

          </div>

          {/* Left Footer Statement */}
          <div className="auth-left-footer">
            Your skills. Your evidence. Your next move.
          </div>

        </div>

        {/* RIGHT PANEL: AUTHENTICATION FORM */}
        <div className="auth-right-panel">
          <div className="auth-form-wrapper">
            <div className="auth-mobile-header mobile-only">
              <Link href="/" className="auth-brand-logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <path d="M4 20L10 12H14L20 4" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 10V4H14" stroke="#D9531E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="4" cy="20" r="2.5" fill="#151515"/>
                  <circle cx="20" cy="4" r="2.5" fill="#151515"/>
                </svg>
                <span>Intelligence-Engine</span>
              </Link>
            </div>
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
