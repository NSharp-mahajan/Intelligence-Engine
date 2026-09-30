'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '../../../../lib/api';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody } from '../../../../components/ui/Card';
import type { OpportunityResponse, Opportunity, MatchResultResponse } from '../../../../lib/types';

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtEnum(value: string): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Safely sanitizes HTML in the browser using DOMParser.
 * Removes dangerous tags and attributes, and secures links.
 */
function sanitizeHtmlClientSide(html: string): string {
  if (typeof window === 'undefined') return ''; // Return empty during SSR
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Remove dangerous tags
  const forbiddenTags = ['script', 'iframe', 'object', 'embed', 'style', 'link', 'base', 'meta', 'applet'];
  forbiddenTags.forEach(tag => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });

  // 2. Remove dangerous attributes & secure links
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    for (let i = el.attributes.length - 1; i >= 0; i--) {
      const attr = el.attributes[i];
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();

      // Remove event handlers, style attributes, and dangerous URL schemes
      if (
        name.startsWith('on') || 
        name === 'style' || 
        /^[\s\x00-\x1F]*(javascript|vbscript|data):/i.test(value)
      ) {
        el.removeAttribute(attr.name);
      }
    }

    // Ensure all links open in new tab securely
    if (el.tagName.toLowerCase() === 'a') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OpportunityDetailPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const opportunityId = unwrappedParams.id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [sanitizedDescription, setSanitizedDescription] = useState('');

  const [matchLoading, setMatchLoading] = useState(true);
  const [matchError, setMatchError] = useState('');
  const [matchResult, setMatchResult] = useState<MatchResultResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOpportunity() {
      setLoading(true);
      setError('');
      try {
        const result = await fetchApi<OpportunityResponse>(`/opportunities/${opportunityId}`);
        if (!cancelled) {
          setOpportunity(result.opportunity);
          setSanitizedDescription(sanitizeHtmlClientSide(result.opportunity.description));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Opportunity not found');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadMatch() {
      setMatchLoading(true);
      setMatchError('');
      try {
        const res = await fetchApi<MatchResultResponse>(`/opportunities/${opportunityId}/match`);
        if (!cancelled) {
          setMatchResult(res);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setMatchError(err instanceof Error ? err.message : 'Failed to calculate match');
        }
      } finally {
        if (!cancelled) {
          setMatchLoading(false);
        }
      }
    }

    loadOpportunity();
    loadMatch();

    return () => { cancelled = true; };
  }, [opportunityId]);

  if (loading && !opportunity) {
    return (
      <div style={styles.container}>
        <div style={styles.stateBox}>Loading opportunity details…</div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div style={styles.container}>
        <Link href="/opportunities" style={styles.backLink}>
          ← Back to Opportunities
        </Link>
        <div style={styles.errorAlert}>{error || 'Opportunity not found'}</div>
      </div>
    );
  }

  const postedLabel = formatDate(opportunity.postedDate);

  return (
    <div style={styles.container} className="animate-fade-in">
      <Link href="/opportunities" style={styles.backLink}>
        ← Back to Opportunities
      </Link>

      <div style={styles.header}>
        <h1 style={styles.title}>{opportunity.title}</h1>
        <div style={styles.metaRow}>
          <span style={styles.company}>{opportunity.organization}</span>
          {opportunity.location && (
            <>
              <span style={styles.sep}>·</span>
              <span style={styles.location}>{opportunity.location}</span>
            </>
          )}
        </div>
        
        <div style={styles.badgeRow}>
          {opportunity.workMode && opportunity.workMode !== 'UNKNOWN' && (
            <Badge variant="neutral">{fmtEnum(opportunity.workMode)}</Badge>
          )}
          {opportunity.employmentType && opportunity.employmentType !== 'UNKNOWN' && (
            <Badge variant="neutral">{fmtEnum(opportunity.employmentType)}</Badge>
          )}
          {opportunity.experienceLevel && opportunity.experienceLevel !== 'UNKNOWN' && (
            <Badge variant="neutral">{fmtEnum(opportunity.experienceLevel)}</Badge>
          )}
        </div>
      </div>

      <div style={styles.layout} className="detail-layout">
        <div style={styles.mainContent}>
          {/* Your Match Section */}
          <div style={styles.matchSection}>
            <h2 style={styles.sectionTitle}>Your Match</h2>
            <Card style={styles.matchCard}>
              <CardBody>
                {matchLoading ? (
                  <div style={styles.matchStateBox}>Calculating match…</div>
                ) : matchError ? (
                  <div style={styles.matchErrorAlert}>
                    Unable to load match details right now.
                  </div>
                ) : matchResult && (!matchResult.hasStructuredRequirements || matchResult.score === null) ? (
                  <div style={styles.matchUnavailableBox}>
                    <div style={styles.matchHeaderRow}>
                      <span style={styles.matchUnavailableTitle}>Match unavailable</span>
                      <Badge variant="neutral">UNSTRUCTURED</Badge>
                    </div>
                    <p style={styles.matchUnavailableSubtitle}>
                      This opportunity doesn't currently have structured skill requirements, so Career Intelligence can't calculate a reliable match yet.
                    </p>
                  </div>
                ) : matchResult ? (
                  <div style={styles.matchContainer}>
                    {/* Score Overview Row */}
                    <div style={styles.matchScoreRow}>
                      <div style={styles.scoreCircleBox}>
                        <span style={styles.scoreValue}>{matchResult.score}%</span>
                        <span style={styles.scoreLabel}>Match Score</span>
                      </div>
                      <div style={styles.scoreOverview}>
                        <h3 style={styles.matchHeadline}>
                          {matchResult.score === 100 
                            ? 'Perfect Skill Match' 
                            : matchResult.score && matchResult.score >= 75 
                            ? 'Strong Skill Alignment' 
                            : matchResult.score && matchResult.score >= 50 
                            ? 'Moderate Skill Match' 
                            : 'Skill Gap Identified'}
                        </h3>
                        <p style={styles.matchSubheadline}>
                          Based on your candidate profile and project evidence evaluated against role requirements.
                        </p>
                      </div>
                    </div>

                    {/* Required Skills Block */}
                    {(matchResult.requiredMatched.length > 0 || matchResult.requiredMissing.length > 0) && (
                      <div style={styles.skillBlock}>
                        <div style={styles.skillBlockHeader}>
                          <span style={styles.skillBlockTitle}>Required Skills</span>
                          <span style={styles.skillBlockCount}>
                            {matchResult.requiredMatched.length} of {matchResult.requiredMatched.length + matchResult.requiredMissing.length} matched
                          </span>
                        </div>
                        <div style={styles.skillBadgeGrid}>
                          {matchResult.requiredMatched.map(skill => {
                            const evList = matchResult.evidence[skill.skillId] || [];
                            const isDirect = evList.some(e => e.isDirect);
                            const projectEv = evList.find(e => !e.isDirect && e.projectName);
                            
                            let evLabel = 'Direct profile skill';
                            if (projectEv) {
                              evLabel = `Project: ${projectEv.projectName}`;
                            } else if (!isDirect && evList.length > 0) {
                              evLabel = 'Skill evidence found';
                            }

                            return (
                              <div key={skill.skillId} style={styles.skillCardMatched}>
                                <div style={styles.skillCardTop}>
                                  <span style={styles.skillNameMatched}>{skill.skillName}</span>
                                  <Badge variant="success">Matched</Badge>
                                </div>
                                <span style={styles.skillEvidenceLabel}>✓ {evLabel}</span>
                              </div>
                            );
                          })}

                          {matchResult.requiredMissing.map(skill => (
                            <div key={skill.skillId} style={styles.skillCardMissing}>
                              <div style={styles.skillCardTop}>
                                <span style={styles.skillNameMissing}>{skill.skillName}</span>
                                <Badge variant="error">Missing</Badge>
                              </div>
                              <span style={styles.skillMissingLabel}>Not found on profile</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preferred Skills Block */}
                    {(matchResult.preferredMatched.length > 0 || matchResult.preferredMissing.length > 0) && (
                      <div style={styles.skillBlock}>
                        <div style={styles.skillBlockHeader}>
                          <span style={styles.skillBlockTitle}>Preferred Skills</span>
                          <span style={styles.skillBlockCount}>
                            {matchResult.preferredMatched.length} of {matchResult.preferredMatched.length + matchResult.preferredMissing.length} matched
                          </span>
                        </div>
                        <div style={styles.skillBadgeGrid}>
                          {matchResult.preferredMatched.map(skill => {
                            const evList = matchResult.evidence[skill.skillId] || [];
                            const isDirect = evList.some(e => e.isDirect);
                            const projectEv = evList.find(e => !e.isDirect && e.projectName);
                            
                            let evLabel = 'Direct profile skill';
                            if (projectEv) {
                              evLabel = `Project: ${projectEv.projectName}`;
                            } else if (!isDirect && evList.length > 0) {
                              evLabel = 'Skill evidence found';
                            }

                            return (
                              <div key={skill.skillId} style={styles.skillCardMatched}>
                                <div style={styles.skillCardTop}>
                                  <span style={styles.skillNameMatched}>{skill.skillName}</span>
                                  <Badge variant="success">Matched</Badge>
                                </div>
                                <span style={styles.skillEvidenceLabel}>✓ {evLabel}</span>
                              </div>
                            );
                          })}

                          {matchResult.preferredMissing.map(skill => (
                            <div key={skill.skillId} style={styles.skillCardMissing}>
                              <div style={styles.skillCardTop}>
                                <span style={styles.skillNameMissing}>{skill.skillName}</span>
                                <Badge variant="neutral">Optional</Badge>
                              </div>
                              <span style={styles.skillMissingLabel}>Not found on profile</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>

          <h2 style={styles.sectionTitle}>About this opportunity</h2>
          <Card>
            <CardBody>
              {sanitizedDescription ? (
                <div 
                  style={styles.description} 
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }} 
                  className="opp-description"
                />
              ) : (
                <p style={styles.emptyDescription}>No description provided.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div style={styles.sidebar}>
          <Card>
            <CardBody style={styles.sidebarBody}>
              <h2 style={styles.sidebarTitle}>Opportunity Information</h2>
              
              <div style={styles.infoList}>
                {opportunity.organization && (
                  <div style={styles.infoGroup}>
                    <span style={styles.infoLabel}>Organization</span>
                    <span style={styles.infoValue}>{opportunity.organization}</span>
                  </div>
                )}
                {opportunity.location && (
                  <div style={styles.infoGroup}>
                    <span style={styles.infoLabel}>Location</span>
                    <span style={styles.infoValue}>{opportunity.location}</span>
                  </div>
                )}
                {opportunity.workMode && opportunity.workMode !== 'UNKNOWN' && (
                  <div style={styles.infoGroup}>
                    <span style={styles.infoLabel}>Work Mode</span>
                    <span style={styles.infoValue}>{fmtEnum(opportunity.workMode)}</span>
                  </div>
                )}
                {opportunity.employmentType && opportunity.employmentType !== 'UNKNOWN' && (
                  <div style={styles.infoGroup}>
                    <span style={styles.infoLabel}>Employment Type</span>
                    <span style={styles.infoValue}>{fmtEnum(opportunity.employmentType)}</span>
                  </div>
                )}
                {opportunity.experienceLevel && opportunity.experienceLevel !== 'UNKNOWN' && (
                  <div style={styles.infoGroup}>
                    <span style={styles.infoLabel}>Experience Level</span>
                    <span style={styles.infoValue}>{fmtEnum(opportunity.experienceLevel)}</span>
                  </div>
                )}
                {postedLabel && (
                  <div style={styles.infoGroup}>
                    <span style={styles.infoLabel}>Posted Date</span>
                    <span style={styles.infoValue}>{postedLabel}</span>
                  </div>
                )}
                {opportunity.source && (
                  <div style={styles.infoGroup}>
                    <span style={styles.infoLabel}>Source</span>
                    <span style={styles.infoValue}>{opportunity.source}</span>
                  </div>
                )}
              </div>

              <div style={styles.ctaContainer}>
                <Button 
                  fullWidth 
                  variant="primary" 
                  onClick={() => window.open(opportunity.applicationUrl, '_blank', 'noopener,noreferrer')}
                >
                  Apply on {opportunity.source} ↗
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .opp-description {
            font-size: 1rem;
            line-height: 1.6;
            color: var(--text-primary);
          }
          .opp-description h1, .opp-description h2, .opp-description h3, .opp-description h4 {
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            font-weight: 600;
          }
          .opp-description p {
            margin-bottom: 1rem;
          }
          .opp-description ul, .opp-description ol {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
          }
          .opp-description li {
            margin-bottom: 0.5rem;
          }
          .opp-description a {
            color: var(--accent-primary);
            text-decoration: underline;
          }
          .opp-description a:hover {
            color: var(--accent-hover);
          }
          @media (max-width: 768px) {
            .detail-layout {
              flex-direction: column !important;
            }
          }
        `
      }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '32px 24px 64px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    width: 'fit-content',
    transition: 'color var(--transition-fast)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingBottom: '24px',
    borderBottom: '1px solid var(--border-light)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    lineHeight: '1.2',
    margin: 0,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    fontSize: '1.0625rem',
  },
  company: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sep: {
    color: 'var(--text-tertiary)',
  },
  location: {
    color: 'var(--text-secondary)',
  },
  badgeRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  mainContent: {
    flex: '1 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  description: {
    // Styles applied via global css snippet above
  },
  emptyDescription: {
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  sidebar: {
    flex: '0 0 320px',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: '100px', // Header offset
  },
  sidebarBody: {
    gap: '24px',
  },
  sidebarTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  infoValue: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  ctaContainer: {
    paddingTop: '8px',
    borderTop: '1px solid var(--border-light)',
  },
  stateBox: {
    minHeight: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9375rem',
    border: '1px solid var(--error-border)',
    fontWeight: 500,
  },
  matchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '8px',
  },
  matchCard: {
    border: '1px solid var(--border-light)',
  },
  matchStateBox: {
    padding: '24px 16px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
  },
  matchErrorAlert: {
    padding: '16px',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-surface-hover)',
    borderRadius: 'var(--radius-md)',
  },
  matchUnavailableBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  matchHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchUnavailableTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  matchUnavailableSubtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
  },
  matchContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  matchScoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-light)',
  },
  scoreCircleBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '84px',
    height: '84px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    border: '1.5px solid var(--accent-primary)',
    flexShrink: 0,
  },
  scoreValue: {
    fontSize: '1.625rem',
    fontWeight: 800,
    color: 'var(--accent-primary)',
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '4px',
  },
  scoreOverview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  matchHeadline: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  matchSubheadline: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.4,
  },
  skillBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skillBlockHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skillBlockTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  skillBlockCount: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },
  skillBadgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  skillCardMatched: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-hover)',
    border: '1px solid var(--border-light)',
  },
  skillCardMissing: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    border: '1px dashed var(--border-light)',
    opacity: 0.85,
  },
  skillCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  skillNameMatched: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  skillNameMissing: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  skillEvidenceLabel: {
    fontSize: '0.75rem',
    color: 'var(--success-text)',
    fontWeight: 500,
  },
  skillMissingLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
};
