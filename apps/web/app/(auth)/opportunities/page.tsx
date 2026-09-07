'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '../../../lib/api';
import type { OpportunitiesResponse, Opportunity } from '../../../lib/types';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadOpportunities();
  }, [page]);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const data = await fetchApi<OpportunitiesResponse>(`/opportunities?page=${page}&limit=10`);
      setOpportunities(data.opportunities || []);
      setTotalPages(data.pagination?.totalPages || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading opportunities...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{
          backgroundColor: 'var(--error-bg)',
          color: 'var(--error-text)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--error-border)',
        }}>
          {error}
        </div>
        <Button variant="outline" onClick={loadOpportunities} style={{ marginTop: '1rem' }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Opportunities
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Browse available opportunities from the intelligence engine.
        </p>
      </header>

      {opportunities.length === 0 ? (
        <Card>
          <CardBody style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--text-tertiary)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No opportunities available
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Opportunities will appear here once they are ingested into the system.
            </p>
            <Button variant="outline" onClick={loadOpportunities}>Refresh</Button>
          </CardBody>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {opportunities.map((opp) => (
              <Card key={opp.id}>
                <CardBody style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {opp.title}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                        {opp.organization}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Badge variant="neutral">{opp.type}</Badge>
                      {opp.workMode !== 'UNKNOWN' && <Badge variant="neutral">{opp.workMode}</Badge>}
                      {opp.employmentType !== 'UNKNOWN' && <Badge variant="neutral">{opp.employmentType}</Badge>}
                      {opp.experienceLevel !== 'UNKNOWN' && <Badge variant="neutral">{opp.experienceLevel}</Badge>}
                    </div>
                  </div>

                  {opp.location && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      📍 {opp.location}
                    </p>
                  )}

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {opp.description}
                  </p>

                  {opp.opportunitySkills && opp.opportunitySkills.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {opp.opportunitySkills.map((os) => (
                          <Badge
                            key={os.skillId}
                            variant={os.requirementType === 'REQUIRED' ? 'success' : 'warning'}
                          >
                            {os.skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Source: {opp.source}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.open(opp.applicationUrl, '_blank')}
                    >
                      Apply
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
