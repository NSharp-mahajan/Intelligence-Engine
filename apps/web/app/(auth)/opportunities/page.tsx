'use client';

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
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
      <div style={card.topRow}>
        <h2 style={card.title}>{opp.title}</h2>
        <Link
          href={`/opportunities/${opp.id}`}
          style={card.viewLink}
          className="opp-view-link"
        >
          View opportunity&nbsp;↗
        </Link>
      </div>

      <div style={card.metaRow}>
        <span style={card.company}>{opp.organization}</span>
        {opp.location && (
          <>
            <span style={card.sep}>·</span>
            <span style={card.location}>{opp.location}</span>
          </>
        )}
      </div>

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
        style={{ ...pg.btn, ...(page >= totalPages || totalPages === 0 ? pg.disabled : {}) }}
        disabled={page >= totalPages || totalPages === 0}
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

// ─── Filters ─────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = {
  type: ['INTERNSHIP', 'JOB', 'HACKATHON', 'WORKSHOP', 'OPEN_SOURCE', 'MICRO_INTERNSHIP'],
  workMode: ['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'],
  employmentType: ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'UNKNOWN'],
  experienceLevel: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'UNKNOWN'],
};

// ─── Main content ─────────────────────────────────────────────────────────────

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Extract query parameters
  const pageParam = searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const workMode = searchParams.get('workMode') || '';
  const employmentType = searchParams.get('employmentType') || '';
  const experienceLevel = searchParams.get('experienceLevel') || '';

  // Local state for the search input so it can be typed into without triggering a fetch on every keystroke
  const [searchInput, setSearchInput] = useState(search);

  // Update local search input if URL changes (e.g. back button)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OpportunitiesResponse | null>(null);

  // Update URL helper
  const updateQuery = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        if (params.has(key)) {
          params.delete(key);
          hasChanges = true;
        }
      } else {
        if (params.get(key) !== value) {
          params.set(key, value);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, pathname, router]);

  const handleFilterChange = (key: string, value: string) => {
    updateQuery({ [key]: value, page: '1' });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateQuery({ search: searchInput, page: '1' });
  };

  const clearFilters = () => {
    setSearchInput('');
    updateQuery({
      search: null,
      type: null,
      workMode: null,
      employmentType: null,
      experienceLevel: null,
      page: '1',
    });
  };

  const hasActiveFilters = Boolean(search || type || workMode || employmentType || experienceLevel);

  useEffect(() => {
    let cancelled = false;

    async function loadOpportunities() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '20');
        if (search) params.set('search', search);
        if (type) params.set('type', type);
        if (workMode) params.set('workMode', workMode);
        if (employmentType) params.set('employmentType', employmentType);
        if (experienceLevel) params.set('experienceLevel', experienceLevel);

        const result = await fetchApi<OpportunitiesResponse>(`/opportunities?${params.toString()}`);
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
  }, [page, search, type, workMode, employmentType, experienceLevel]);

  const handleNext = () => {
    if (data && page < data.pagination.totalPages) {
      updateQuery({ page: (page + 1).toString() });
    }
  };

  const handlePrev = () => {
    if (page > 1) {
      updateQuery({ page: (page - 1).toString() });
    }
  };

  return (
    <div style={pageStyles.wrap} className="animate-fade-in">
      {/* Page header */}
      <header style={pageStyles.header}>
        <h1 style={pageStyles.title}>Opportunity Discovery</h1>
        <p style={pageStyles.subtitle}>
          Explore roles, internships, and programs from curated sources.
        </p>
      </header>

      {/* Toolbar */}
      <div style={pageStyles.toolbar}>
        <form onSubmit={handleSearchSubmit} style={pageStyles.searchForm}>
          <input
            type="text"
            placeholder="Search by role or company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={pageStyles.searchInput}
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        <div style={pageStyles.filtersRow}>
          <select 
            value={type} 
            onChange={(e) => handleFilterChange('type', e.target.value)}
            style={pageStyles.select}
          >
            <option value="">All Types</option>
            {FILTER_OPTIONS.type.map(opt => <option key={opt} value={opt}>{fmtEnum(opt)}</option>)}
          </select>

          <select 
            value={workMode} 
            onChange={(e) => handleFilterChange('workMode', e.target.value)}
            style={pageStyles.select}
          >
            <option value="">All Work Modes</option>
            {FILTER_OPTIONS.workMode.map(opt => <option key={opt} value={opt}>{fmtEnum(opt)}</option>)}
          </select>

          <select 
            value={employmentType} 
            onChange={(e) => handleFilterChange('employmentType', e.target.value)}
            style={pageStyles.select}
          >
            <option value="">All Employment</option>
            {FILTER_OPTIONS.employmentType.map(opt => <option key={opt} value={opt}>{fmtEnum(opt)}</option>)}
          </select>

          <select 
            value={experienceLevel} 
            onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
            style={pageStyles.select}
          >
            <option value="">All Experience</option>
            {FILTER_OPTIONS.experienceLevel.map(opt => <option key={opt} value={opt}>{fmtEnum(opt)}</option>)}
          </select>
        </div>

        <div style={pageStyles.toolbarFooter}>
          {loading ? (
            <span style={pageStyles.resultsCount}>Loading...</span>
          ) : data ? (
            <span style={pageStyles.resultsCount}>{data.pagination.total} opportunities found</span>
          ) : (
            <span style={pageStyles.resultsCount}>&nbsp;</span>
          )}

          {hasActiveFilters && (
            <button onClick={clearFilters} style={pageStyles.clearFiltersBtn}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div style={pageStyles.errorAlert}>{error}</div>
      ) : loading && !data ? (
        <div style={pageStyles.stateBox}>Loading opportunities…</div>
      ) : !data || data.opportunities.length === 0 ? (
        <div style={pageStyles.emptyState}>
          <p>No opportunities found matching your filters.</p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} style={{ marginTop: '16px' }}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div style={pageStyles.list}>
            {data.opportunities.map((opp: Opportunity) => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>

          <PaginationControl
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </>
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
    marginBottom: '24px',
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
  toolbar: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  select: {
    padding: '6px 10px',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  },
  toolbarFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '4px',
  },
  resultsCount: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  clearFiltersBtn: {
    background: 'none',
    border: 'none',
    padding: '4px 8px',
    fontSize: '0.8125rem',
    color: 'var(--accent-primary)',
    fontWeight: 500,
    cursor: 'pointer',
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
