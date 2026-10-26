'use client';

import React from 'react';

export function LiveRequirementAnalysis() {
  return (
    <section className="live-analysis-section" id="live-analysis">
      <div className="live-analysis-container">
        
        {/* SECTION HEADER */}
        <div className="live-analysis-header">
          <div className="live-analysis-eyebrow">
            <span className="live-analysis-dot" />
            <span>DETERMINISTIC EVALUATION PIPELINE</span>
          </div>
          <h2 className="live-analysis-title">Live Requirement Analysis</h2>
          <p className="live-analysis-subtitle">
            See how your skills and project evidence are evaluated against the requirements of an opportunity.
          </p>
        </div>

        {/* 3-STAGE CONNECTED ANALYSIS GRID */}
        <div className="live-analysis-grid">
          
          {/* STAGE 1: OPPORTUNITY REQUIREMENTS */}
          <div className="analysis-stage-card">
            <div>
              <div className="analysis-stage-label">STAGE 1 · OPPORTUNITY</div>
              <h3 className="analysis-card-title">Software Engineer</h3>
              <div className="analysis-card-sub">Example Technology · Remote</div>

              <div className="analysis-divider" />

              {/* REQUIRED SECTION (80% WEIGHT) */}
              <div className="req-group">
                <div className="req-group-header">
                  <span className="req-group-badge req-badge-required">REQUIRED · 80%</span>
                  <span style={{ fontSize: '0.6875rem', color: '#166534', fontWeight: 650 }}>3 of 3 covered</span>
                </div>
                <div className="req-items-list">
                  <div className="req-row">
                    <span className="req-icon-check">✓</span>
                    <span>React</span>
                  </div>
                  <div className="req-row">
                    <span className="req-icon-check">✓</span>
                    <span>Node.js</span>
                  </div>
                  <div className="req-row">
                    <span className="req-icon-check">✓</span>
                    <span>REST APIs</span>
                  </div>
                </div>
              </div>

              {/* PREFERRED SECTION (20% WEIGHT) */}
              <div className="req-group" style={{ marginBottom: 0 }}>
                <div className="req-group-header">
                  <span className="req-group-badge req-badge-preferred">PREFERRED · 20%</span>
                  <span style={{ fontSize: '0.6875rem', color: '#854D0E', fontWeight: 650 }}>0 of 2 covered</span>
                </div>
                <div className="req-items-list">
                  <div className="req-row req-row-missing">
                    <span className="req-icon-circle">○</span>
                    <span>PostgreSQL</span>
                  </div>
                  <div className="req-row req-row-missing">
                    <span className="req-icon-circle">○</span>
                    <span>AWS</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.6875rem', color: '#787670', borderTop: '1px solid #F0EDE8', paddingTop: '0.625rem', marginTop: '0.75rem' }}>
              Structured role requirements parsed from opportunity listing.
            </div>
          </div>

          {/* STAGE TRANSITION CONNECTOR 1 -> 2 */}
          <div className="stage-transition-connector">
            <span className="stage-transition-badge">COMPARE</span>
            <svg className="stage-transition-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </div>

          {/* STAGE 2: YOUR EVIDENCE */}
          <div className="analysis-stage-card">
            <div>
              <div className="analysis-stage-label">STAGE 2 · CANDIDATE</div>
              <h3 className="analysis-card-title">Your Evidence</h3>
              <div className="analysis-card-sub">Profile Skills & Project Provenance</div>

              <div className="analysis-divider" />

              <div className="evidence-rows-list">
                <div className="evidence-entry">
                  <span className="evidence-entry-skill">React</span>
                  <span className="evidence-entry-badge evidence-badge-profile">PROFILE</span>
                </div>
                <div className="evidence-entry">
                  <span className="evidence-entry-skill">Node.js</span>
                  <span className="evidence-entry-badge evidence-badge-project">PROJECT</span>
                </div>
                <div className="evidence-entry">
                  <span className="evidence-entry-skill">REST APIs</span>
                  <span className="evidence-entry-badge evidence-badge-project">PROJECT</span>
                </div>
                <div className="evidence-entry">
                  <span className="evidence-entry-skill">PostgreSQL</span>
                  <span className="evidence-entry-badge evidence-badge-project">PROJECT</span>
                </div>
              </div>
            </div>

            <div className="evidence-card-footer">
              <span style={{ color: '#D9531E', fontWeight: 650 }}>Proven Work: </span>
              Skills linked directly to verified Career Intelligence project implementation.
            </div>
          </div>

          {/* STAGE TRANSITION CONNECTOR 2 -> 3 */}
          <div className="stage-transition-connector">
            <span className="stage-transition-badge">EVALUATE</span>
            <svg className="stage-transition-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </div>

          {/* STAGE 3: MATCH RESULT (VISUAL CLIMAX) */}
          <div className="analysis-stage-card analysis-stage-result">
            <div>
              <div className="result-card-topbar">
                <div className="analysis-stage-label" style={{ color: '#D9531E', margin: 0 }}>
                  STAGE 3 · ENGINE RESULT
                </div>
                <div className="result-complete-pill">
                  <span className="result-complete-dot" />
                  <span>Analysis complete</span>
                </div>
              </div>

              {/* Central Score Block */}
              <div className="result-score-block">
                <div className="result-score-number">80%</div>
                <div className="result-score-title">DETERMINISTIC MATCH</div>
              </div>

              {/* Progress Bar (80% filled) */}
              <div className="result-progress-track">
                <div className="result-progress-bar" style={{ width: '80%' }} />
              </div>

              {/* Coverage Table */}
              <div className="result-stats-table">
                <div className="result-stat-row">
                  <span className="result-stat-label">Required (80% weight)</span>
                  <span className="result-stat-val" style={{ color: '#166534' }}>3 / 3</span>
                </div>
                <div className="result-stat-row">
                  <span className="result-stat-label">Preferred (20% weight)</span>
                  <span className="result-stat-val" style={{ color: '#854D0E' }}>0 / 2</span>
                </div>
              </div>

              {/* Breakdown Insights */}
              <div className="result-insights">
                <div className="result-insight-item result-insight-matched">
                  <span>✓</span>
                  <span>Strong alignment on required skills</span>
                </div>
                <div className="result-insight-item result-insight-missing">
                  <span>○</span>
                  <span>2 preferred skills to strengthen</span>
                </div>
              </div>

              {/* Subtitle Explanation */}
              <div className="result-explanation-text">
                Your required skills are fully covered. Preferred requirements are still missing.
              </div>
            </div>

            {/* Weighting Rule Footnote */}
            <div className="result-weight-rule">
              Required requirements carry more weight than preferred requirements.
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
