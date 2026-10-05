'use client';

import React from 'react';

export function EvidenceGraph() {
  return (
    <section className="evidence-chain-section" id="evidence-chain">
      <div className="evidence-chain-container">
        
        {/* LEFT COLUMN: MARKETING & EXPLANATORY MESSAGE */}
        <div className="evidence-chain-content">
          <div className="evidence-chain-eyebrow">
            <span className="evidence-chain-dot" />
            <span>EVIDENCE TRACEABILITY</span>
          </div>

          <h2 className="evidence-chain-title">
            Your skills should connect to evidence.
          </h2>

          <p className="evidence-chain-subtitle">
            Your profile is more than a list of skills. Connect what you know to the projects where you actually used it.
          </p>

          <div className="evidence-chain-insight-card">
            <div className="evidence-chain-insight-label">CORE DIFFERENTIATOR</div>
            <div className="evidence-chain-insight-text">
              A skill is more meaningful when you can show where you used it. Connecting skills to tangible project work turns static keywords into transparent, traceable evidence.
            </div>
          </div>

          <div className="evidence-chain-bullets">
            <div className="evidence-chain-bullet">
              <span className="evidence-chain-bullet-icon">✓</span>
              <span>Profile skills link directly to real project implementations</span>
            </div>
            <div className="evidence-chain-bullet">
              <span className="evidence-chain-bullet-icon">✓</span>
              <span>Opportunity requirements match against demonstrated work</span>
            </div>
            <div className="evidence-chain-bullet">
              <span className="evidence-chain-bullet-icon">✓</span>
              <span>Transparent traceability from requirement back to source project</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: EVIDENCE CHAIN PRODUCT VISUALIZATION */}
        <div className="evidence-chain-visual-card">
          
          {/* Top Bar Header with Product Insight Callout */}
          <div className="evidence-visual-topbar">
            <div className="evidence-visual-topbar-label">
              EVIDENCE CHAIN · 3-STAGE TRACEABILITY
            </div>
            <div className="evidence-visual-callout-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span>3 skills supported by project evidence</span>
            </div>
          </div>

          {/* 3 Connected Areas Flow */}
          <div className="evidence-chain-flow">
            
            {/* AREA 1: YOUR SKILLS */}
            <div className="evidence-flow-area">
              <div className="evidence-area-header">1. YOUR SKILLS</div>
              <div className="skills-chips-list">
                <div className="skill-chip-item skill-chip-active">
                  <span>React</span>
                  <span className="skill-chip-bullet" />
                </div>
                <div className="skill-chip-item skill-chip-active">
                  <span>Node.js</span>
                  <span className="skill-chip-bullet" />
                </div>
                <div className="skill-chip-item skill-chip-active">
                  <span>REST APIs</span>
                  <span className="skill-chip-bullet" />
                </div>
                <div className="skill-chip-item">
                  <span>PostgreSQL</span>
                </div>
              </div>
            </div>

            {/* CONNECTOR 1 -> 2 */}
            <div className="flow-arrow-connector flow-arrow-active" title="Evidence Path">
              <svg className="flow-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </div>

            {/* AREA 2: PROJECT EVIDENCE */}
            <div className="evidence-flow-area">
              <div className="evidence-area-header">2. PROJECT EVIDENCE</div>
              <div className="project-evidence-card">
                <div className="project-card-top">
                  <div className="project-mark-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <div className="project-card-info">
                    <div className="project-card-name">Career Intelligence</div>
                    <div className="project-card-sub">Opportunity matching platform</div>
                  </div>
                </div>

                <div className="project-used-badge">
                  Used in project
                </div>

                <div className="project-skills-list">
                  <span className="project-skill-tag">React</span>
                  <span className="project-skill-tag">Node.js</span>
                  <span className="project-skill-tag">REST APIs</span>
                  <span className="project-skill-tag">PostgreSQL</span>
                </div>
              </div>
            </div>

            {/* CONNECTOR 2 -> 3 */}
            <div className="flow-arrow-connector flow-arrow-active" title="Matches Requirement">
              <svg className="flow-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </div>

            {/* AREA 3: OPPORTUNITY REQUIREMENT */}
            <div className="evidence-flow-area">
              <div className="evidence-area-header">3. OPPORTUNITY REQUIREMENT</div>
              <div className="target-role-card">
                <div className="target-role-header">
                  <div className="target-role-title">Software Engineer</div>
                  <div className="target-role-meta">Required skills</div>
                </div>

                <div className="target-reqs-list">
                  <div className="target-req-item">
                    <span className="target-req-check">✓</span>
                    <span>React</span>
                  </div>
                  <div className="target-req-item">
                    <span className="target-req-check">✓</span>
                    <span>Node.js</span>
                  </div>
                  <div className="target-req-item">
                    <span className="target-req-check">✓</span>
                    <span>REST APIs</span>
                  </div>
                  <div className="target-req-item">
                    <span className="target-req-check">✓</span>
                    <span>PostgreSQL</span>
                  </div>
                </div>

                <div className="target-evidence-connected-badge">
                  <span className="target-connected-dot" />
                  <span>Evidence connected</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
