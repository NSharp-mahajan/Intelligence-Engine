'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';
import type { OpportunitiesResponse, Opportunity } from '../../../lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtEnum(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Card ────────────────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const postedLabel = formatDate(opp.postedDate);

  return (
    <article style={card.root} className="opp-card">
      {/* Row 1: title + CTA */}
      <div style={card.topRow}>
        <h2 style={card.title}>{opp.title}</h2>
        <a
          href={opp.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={card.viewLink}
          className="opp-view-link"
        >
          View opportunity&nbsp;↗
        </a>
      </div>

      {/* Row 2: company · location */}
      <div style={card.metaRow}>
        <span style={card.company}>{opp.organization}</span>
        {opp.location && (
          <>
            <span style={card.sep}>·</span>
            <span style={card.location}>{opp.location}</span>
          </>
        )}
      </div>

      {/* Row 3: badges */}
      {(opp.workMode !== 'UNKNOWN' || opp.employmentType !== 'UNKNOWN' || opp.experienceLevel !== 'UNKNOWN') && (
        <div style={card.badgeRow}>
          {opp.workMode !== 'UNKNOWN' && (
            <Badge variant="neutral">{fmtEnum(opp.workMode)}</Badge>
          )}
          {opp.employmentType !== 'UNKNOWN' && (
            <Badge variant="neutral">{fmtEnum(opp.employmentType)}</Badge>
          )}
          {opp.experienceLevel !== 'UNKNOWN' && (
            <Badge variant="neutral">{fmtEnum(opp.experienceLevel)}</Badge>
          )}
        </div>
      )}

      {/* Row 4: posted + source */}
      <div style={card.footerRow}>
        {postedLabel && <span>Posted {postedLabel}</span>}
        {postedLabel && <span style={card.sep}>·</span>}
        <span>{opp.source}</span>
      </div>
    </article>
  );
}

const card: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: '1.4',
    letterSpacing: '-0.01em',
    margin: 0,
    flex: '1 1 auto',
  },
  viewLink: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    paddingTop: '2px',
    textDecoration: 'none',
    letterSpacing: '0.01em',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    fontSize: '0.9375rem',
  },
  company: {
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  sep: {
    color: 'var(--text-tertiary)',
    fontSize: '0.8125rem',
  },
  location: {
    color: 'var(--text-secondary)',
  },
  badgeRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    paddingTop: '2px',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8125rem',
    color: 'var(--text-tertiary)',
    paddingTop: '4px',
  },
};

// ─── Pagination ──────────────────────────────────────────────────────────────

function PaginationControl({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={pg.row}>
      <button
        style={{ ...pg.btn, ...(page <= 1 ? pg.disabled : {}) }}
        disabled={page <= 1}
        onClick={onPrev}
        className="pg-btn"
      >
        ← Previous
      </button>
      <span style={pg.info}>
        Page {page} of {totalPages}
      </span>
      <button
        style={{ ...pg.btn, ...(page >= totalPages ? pg.disabled : {}) }}
        disabled={page >= totalPages}
        onClick={onNext}
        className="pg-btn"
      >
        Next →
      </button>
    </div>
  );
}

const pg: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    paddingTop: '24px',
    borderTop: '1px solid var(--border-light)',
    marginTop: '8px',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    fontFamily: 'inherit',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  info: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    minWidth: '120px',
    textAlign: 'center',
  },
};

// ─── Main content ─────────────────────────────────────────────────────────────

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

  if (loading && !data) {
    return <div style={pageStyles.stateBox}>Loading opportunities…</div>;
  }

  if (error) {
    return (
      <div style={pageStyles.wrap}>
        <div style={pageStyles.errorAlert}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return <div style={pageStyles.stateBox}>No data available.</div>;
  }

  return (
    <div style={pageStyles.wrap} className="animate-fade-in">
      {/* Page header */}
      <header style={pageStyles.header}>
        <h1 style={pageStyles.title}>Opportunity Discovery</h1>
        <p style={pageStyles.subtitle}>
          Explore roles, internships, and programs from curated sources.
          {data && (
            <span style={pageStyles.count}>&nbsp;{data.pagination.total} opportunities</span>
          )}
        </p>
      </header>

      {/* Listing */}
      {data.opportunities.length === 0 ? (
        <div style={pageStyles.emptyState}>
          <p>No opportunities found.</p>
        </div>
      ) : (
        <div style={pageStyles.list}>
          {data.opportunities.map((opp: Opportunity) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <PaginationControl
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      {/* Scoped hover styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .opp-card:hover {
            border-color: var(--border-dark);
            box-shadow: var(--shadow-md);
          }
          .opp-view-link:hover {
            color: var(--accent-hover);
            text-decoration: underline;
          }
          .pg-btn:not(:disabled):hover {
            background-color: var(--bg-surface-hover);
          }
          @media (max-width: 640px) {
            .opp-card {
              padding: 16px !important;
            }
          }
        `
      }} />
    </div>
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '40px 24px 64px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  header: {
    marginBottom: '28px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.025em',
    margin: 0,
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  count: {
    color: 'var(--text-tertiary)',
    fontSize: '0.875rem',
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
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
    fontWeight: 500,
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center',
    border: '1px dashed var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-tertiary)',
    fontSize: '0.9375rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div style={pageStyles.stateBox}>Loading opportunities…</div>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
