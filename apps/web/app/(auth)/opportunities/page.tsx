'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import type { OpportunitiesResponse, Opportunity } from '../../../lib/types';

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const pageParam = searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OpportunitiesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function loadOpportunities() {
      setLoading(true);
      setError('');
      try {
        const result = await fetchApi<OpportunitiesResponse>(`/opportunities?page=${page}&limit=20`);
        if (!cancelled) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load opportunities');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOpportunities();

    return () => { cancelled = true; };
  }, [page]);

  const handleNext = () => {
    if (data && page < data.pagination.totalPages) {
      router.push(`/opportunities?page=${page + 1}`);
    }
  };

  const handlePrev = () => {
    if (page > 1) {
      router.push(`/opportunities?page=${page - 1}`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !data) return <div style={styles.stateContainer}>Loading opportunities...</div>;
  if (error) return <div style={styles.errorAlert}>{error}</div>;
  if (!data) return <div style={styles.stateContainer}>No data available.</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Opportunity Discovery</h1>
          <p style={styles.subtitle}>Explore roles, internships, and programs sourced for you.</p>
        </div>
      </header>

      {data.opportunities.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No opportunities found.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {data.opportunities.map((opp: Opportunity) => (
            <Card key={opp.id} style={styles.card}>
              <CardBody style={styles.cardBody}>
                <div style={styles.mainInfo}>
                  <div style={styles.headerRow}>
                    <h2 style={styles.jobTitle}>{opp.title}</h2>
                  </div>
                  <div style={styles.orgRow}>
                    <span style={styles.organization}>{opp.organization}</span>
                    {opp.location && (
                      <>
                        <span style={styles.dot}>•</span>
                        <span style={styles.location}>{opp.location}</span>
                      </>
                    )}
                  </div>

                  <div style={styles.badgeRow}>
                    {opp.workMode !== 'UNKNOWN' && (
                      <Badge variant="neutral">{opp.workMode}</Badge>
                    )}
                    {opp.employmentType !== 'UNKNOWN' && (
                      <Badge variant="neutral">{opp.employmentType.replace('_', ' ')}</Badge>
                    )}
                    {opp.experienceLevel !== 'UNKNOWN' && (
                      <Badge variant="neutral">{opp.experienceLevel}</Badge>
                    )}
                  </div>
                </div>

                <div style={styles.actionArea}>
                  <div style={styles.metaRow}>
                    <span style={styles.metaText}>Posted: {formatDate(opp.postedDate)}</span>
                    <span style={styles.dot}>•</span>
                    <span style={styles.metaText}>Source: {opp.source}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(opp.applicationUrl, '_blank', 'noopener,noreferrer')}
                  >
                    View Opportunity
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {data.pagination.totalPages > 1 && (
        <div style={styles.pagination}>
          <Button 
            variant="ghost" 
            disabled={page <= 1} 
            onClick={handlePrev}
          >
            Previous
          </Button>
          <span style={styles.pageInfo}>
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button 
            variant="ghost" 
            disabled={page >= data.pagination.totalPages} 
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div style={styles.stateContainer}>Loading opportunities...</div>}>
      <OpportunitiesContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '1000px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
  },
  stateContainer: {
    minHeight: '240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
    fontWeight: 500,
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center',
    backgroundColor: 'var(--bg-surface)',
    border: '1px dashed var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-tertiary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    width: '100%',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  mainInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: '1 1 300px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  jobTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  orgRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9375rem',
  },
  organization: {
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  location: {
    color: 'var(--text-secondary)',
  },
  dot: {
    color: 'var(--border-light)',
    fontSize: '0.875rem',
  },
  badgeRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginTop: '0.25rem',
  },
  actionArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '1rem',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    color: 'var(--text-tertiary)',
  },
  metaText: {
    whiteSpace: 'nowrap',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '1rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--border-light)',
  },
  pageInfo: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  }
};
