'use client';

import React, { ReactNode } from 'react';
import { Logo } from '../ui/Logo';

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
            <Logo size="md" />
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
            Turn your potential into progress.
          </div>

        </div>

        {/* RIGHT PANEL: AUTHENTICATION FORM */}
        <div className="auth-right-panel">
          <div className="auth-form-wrapper">
            <div className="auth-mobile-header mobile-only">
              <Logo size="sm" />
            </div>
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
