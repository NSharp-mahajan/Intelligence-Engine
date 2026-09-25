'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '../../../../lib/api';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody } from '../../../../components/ui/Card';
import type { OpportunityResponse, Opportunity } from '../../../../lib/types';

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

    loadOpportunity();

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
};
