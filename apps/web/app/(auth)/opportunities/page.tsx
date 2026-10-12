'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
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

// ─── Opportunity Card ────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const postedLabel = formatDate(opp.postedDate);

  const hasMatch = opp.match !== undefined && opp.match !== null;
  const isStructured = hasMatch && opp.match?.hasStructuredRequirements === true && opp.match?.score !== null;

  // Visual styling for match badge based on score
  const getMatchVariant = (score: number) => {
    if (score >= 80) {
      return {
        badgeBg: '#f0fdf4',
        badgeBorder: '#bbf7d0',
        scoreColor: '#15803d',
        dotColor: '#86efac',
      };
    }
    if (score >= 60) {
      return {
        badgeBg: '#fff7ed',
        badgeBorder: '#ffedd5',
        scoreColor: '#c2410c',
        dotColor: '#fdba74',
      };
    }
    return {
      badgeBg: '#fafaf9',
      badgeBorder: '#fed7aa',
      scoreColor: '#9a3412',
      dotColor: '#fed7aa',
    };
  };

  const matchVariant = isStructured && opp.match && typeof opp.match.score === 'number' ? getMatchVariant(opp.match.score) : null;

  // Metadata items omitting UNKNOWN and empty values
  const metaChips: string[] = [];
  if (opp.workMode && opp.workMode !== 'UNKNOWN') metaChips.push(fmtEnum(opp.workMode));
  if (opp.employmentType && opp.employmentType !== 'UNKNOWN') metaChips.push(fmtEnum(opp.employmentType));
  if (opp.experienceLevel && opp.experienceLevel !== 'UNKNOWN') metaChips.push(fmtEnum(opp.experienceLevel));

  const skills = opp.opportunitySkills || [];
  const displaySkills = skills.slice(0, 5);
  const remainingSkillsCount = skills.length - 5;

  return (
    <article style={card.root} className="opp-card">
      <div style={card.headerRow}>
        <div style={card.titleBlock}>
          <h2 style={card.title}>
            <Link href={`/opportunities/${opp.id}`} style={card.titleLink}>
              {opp.title}
            </Link>
          </h2>

          <div style={card.orgLine}>
            <span style={card.company}>{opp.organization}</span>
            {opp.location && (
              <>
                <span style={card.dot}>·</span>
                <span style={card.location}>{opp.location}</span>
              </>
            )}
            {opp.workMode && opp.workMode !== 'UNKNOWN' && (
              <>
                <span style={card.dot}>·</span>
                <span style={card.workMode}>{fmtEnum(opp.workMode)}</span>
              </>
            )}
          </div>
        </div>

        {/* Match Intelligence Badge */}
        {hasMatch ? (
          isStructured && matchVariant ? (
            <div
              style={{
                ...card.matchBadge,
                backgroundColor: matchVariant.badgeBg,
                borderColor: matchVariant.badgeBorder,
              }}
              className="opp-match-badge"
            >
              <div style={card.matchBadgeTop}>
                <span style={{ ...card.matchScore, color: matchVariant.scoreColor }}>
                  {opp.match!.score}% Match
                </span>
              </div>
              <span style={card.matchStats}>
                {opp.match!.matchedCount} matched
                {opp.match!.missingCount > 0 ? ` · ${opp.match!.missingCount} missing` : ''}
              </span>
            </div>
          ) : (
            <div style={card.matchUnavailableBadge}>
              <span style={card.matchUnavailableTitle}>Match unavailable</span>
              <span style={card.matchUnavailableSub}>Sparse requirements</span>
            </div>
          )
        ) : null}
      </div>

      {/* Key Requirement Skills */}
      {displaySkills.length > 0 && (
        <div style={card.skillsRow}>
          {displaySkills.map((os) => (
            <span key={os.skillId} style={card.skillChip}>
              {os.skill.name}
            </span>
          ))}
          {remainingSkillsCount > 0 && (
            <span style={card.moreSkillsText}>+{remainingSkillsCount} more</span>
          )}
        </div>
      )}

      {/* Footer Row: Metadata Chips, Provenance, & Action Link */}
      <div style={card.footerRow}>
        <div style={card.metaInfo}>
          {metaChips.length > 0 && (
            <div style={card.tagGroup}>
              {metaChips.map((chip, idx) => (
                <span key={idx} style={card.metaChip}>
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div style={card.provenance}>
            {postedLabel && <span>Posted {postedLabel}</span>}
            {postedLabel && <span style={card.dot}>·</span>}
            <span>{opp.source}</span>
          </div>
        </div>

        <Link href={`/opportunities/${opp.id}`} style={card.viewAction} className="opp-view-link">
          <span>View opportunity</span>
          <span style={card.arrowIcon}>→</span>
        </Link>
      </div>
    </article>
  );
}

const card: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
    padding: '18px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '18px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 auto',
  },
  title: {
    fontSize: '1.1875rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.35,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  titleLink: {
    color: 'inherit',
    textDecoration: 'none',
  },
  orgLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    fontSize: '0.875rem',
    marginTop: '1px',
  },
  company: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dot: {
    color: 'var(--text-tertiary)',
    fontSize: '0.75rem',
  },
  location: {
    color: 'var(--text-secondary)',
  },
  workMode: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  matchBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    flexShrink: 0,
    minWidth: '128px',
    textAlign: 'right',
  },
  matchBadgeTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  matchScore: {
    fontSize: '0.9375rem',
    fontWeight: 750,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  matchStats: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    marginTop: '2px',
    whiteSpace: 'nowrap',
  },
  matchUnavailableBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    flexShrink: 0,
    minWidth: '128px',
    textAlign: 'right',
  },
  matchUnavailableTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    lineHeight: 1.2,
  },
  matchUnavailableSub: {
    fontSize: '0.6875rem',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
    whiteSpace: 'nowrap',
  },
  skillsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  skillChip: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    lineHeight: 1.4,
  },
  moreSkillsText: {
    fontSize: '0.6875rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-light)',
    marginTop: '2px',
    gap: '16px',
  },
  metaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tagGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  metaChip: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-surface-hover)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  provenance: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  viewAction: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'color var(--transition-fast)',
  },
  arrowIcon: {
    fontSize: '0.9375rem',
    lineHeight: 1,
    transition: 'transform var(--transition-fast)',
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
        Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
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
    gap: '16px',
    paddingTop: '28px',
    borderTop: '1px solid var(--border-light)',
    marginTop: '12px',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 16px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'inherit',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  info: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    minWidth: '130px',
    textAlign: 'center',
  },
};

// ─── Filter Constants ────────────────────────────────────────────────────────

const FILTER_OPTIONS = {
  type: ['INTERNSHIP', 'JOB', 'HACKATHON', 'WORKSHOP', 'OPEN_SOURCE', 'MICRO_INTERNSHIP'],
  workMode: ['REMOTE', 'HYBRID', 'ONSITE'],
  employmentType: ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'],
  experienceLevel: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR'],
};

const MATCH_FILTER_OPTIONS = [
  { label: '80%+ Match', value: '80_plus' },
  { label: '60%+ Match', value: '60_plus' },
  { label: '40%+ Match', value: '40_plus' },
  { label: 'Below 40%', value: 'below_40' },
  { label: 'Match Unavailable', value: 'unavailable' },
];

const SORT_OPTIONS = [
  { label: 'Match: High to Low', value: 'match_desc' },
  { label: 'Match: Low to High', value: 'match_asc' },
];

// ─── Skeletons ───────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={card.root} className="opp-skeleton">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ height: '20px', width: '60%', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
          <div style={{ height: '14px', width: '40%', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
        </div>
        <div style={{ height: '44px', width: '120px', backgroundColor: 'var(--border-light)', borderRadius: '6px' }} />
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <div style={{ height: '22px', width: '70px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
        <div style={{ height: '22px', width: '85px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
        <div style={{ height: '22px', width: '60px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

// ─── Opportunities Content ────────────────────────────────────────────────────

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageParam = searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const workMode = searchParams.get('workMode') || '';
  const employmentType = searchParams.get('employmentType') || '';
  const experienceLevel = searchParams.get('experienceLevel') || '';
  const matchFilter = searchParams.get('matchFilter') || '';
  const sort = searchParams.get('sort') || '';

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OpportunitiesResponse | null>(null);

  const hasMatchData = Boolean(
    data?.opportunities && data.opportunities.length > 0 && data.opportunities.some((opp: Opportunity) => opp.match !== null)
  );

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
      matchFilter: null,
      sort: null,
      page: '1',
    });
  };

  const hasActiveFilters = Boolean(
    search || type || workMode || employmentType || experienceLevel || matchFilter || sort
  );

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
        if (matchFilter) params.set('matchFilter', matchFilter);
        if (sort) params.set('sort', sort);

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
  }, [page, search, type, workMode, employmentType, experienceLevel, matchFilter, sort]);

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

  const isMatchControlDisabled = data !== null && !hasMatchData && !matchFilter && !sort;

  return (
    <div style={pageStyles.wrap} className="animate-fade-in">
      {/* Page Header */}
      <header style={pageStyles.header}>
        <h1 style={pageStyles.title}>Opportunity Discovery</h1>
        <p style={pageStyles.subtitle}>
          Find roles that match your skills, projects, and career direction.
        </p>
      </header>

      {/* Discovery Controls / Toolbar */}
      <div style={pageStyles.toolbar}>
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={pageStyles.searchForm}>
          <div style={pageStyles.searchFieldWrapper}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={pageStyles.searchIcon}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search roles, companies, or skills..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={pageStyles.searchInput}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateQuery({ search: null, page: '1' });
                }}
                style={pageStyles.clearSearchBtn}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary" size="md" style={pageStyles.searchBtn}>
            Search
          </Button>
        </form>

        {/* Filter Controls Row */}
        <div style={pageStyles.filtersRow}>
          <div style={pageStyles.selectWrap}>
            <select
              value={type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              style={pageStyles.select}
              aria-label="Opportunity Type"
            >
              <option value="">All Types</option>
              {FILTER_OPTIONS.type.map((opt) => (
                <option key={opt} value={opt}>
                  {fmtEnum(opt)}
                </option>
              ))}
            </select>
          </div>

          <div style={pageStyles.selectWrap}>
            <select
              value={workMode}
              onChange={(e) => handleFilterChange('workMode', e.target.value)}
              style={pageStyles.select}
              aria-label="Work Mode"
            >
              <option value="">All Work Modes</option>
              {FILTER_OPTIONS.workMode.map((opt) => (
                <option key={opt} value={opt}>
                  {fmtEnum(opt)}
                </option>
              ))}
            </select>
          </div>

          <div style={pageStyles.selectWrap}>
            <select
              value={employmentType}
              onChange={(e) => handleFilterChange('employmentType', e.target.value)}
              style={pageStyles.select}
              aria-label="Employment Type"
            >
              <option value="">All Employment</option>
              {FILTER_OPTIONS.employmentType.map((opt) => (
                <option key={opt} value={opt}>
                  {fmtEnum(opt)}
                </option>
              ))}
            </select>
          </div>

          <div style={pageStyles.selectWrap}>
            <select
              value={experienceLevel}
              onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
              style={pageStyles.select}
              aria-label="Experience Level"
            >
              <option value="">All Experience</option>
              {FILTER_OPTIONS.experienceLevel.map((opt) => (
                <option key={opt} value={opt}>
                  {fmtEnum(opt)}
                </option>
              ))}
            </select>
          </div>

          <div style={pageStyles.selectWrap}>
            <select
              value={matchFilter}
              onChange={(e) => handleFilterChange('matchFilter', e.target.value)}
              disabled={isMatchControlDisabled}
              style={{
                ...pageStyles.select,
                ...(isMatchControlDisabled ? pageStyles.selectDisabled : {}),
              }}
              title={data !== null && !hasMatchData ? 'Match filter requires candidate profile' : undefined}
              aria-label="Match Quality"
            >
              <option value="">All Matches</option>
              {MATCH_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={pageStyles.selectWrap}>
            <select
              value={sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              disabled={isMatchControlDisabled}
              style={{
                ...pageStyles.select,
                ...(isMatchControlDisabled ? pageStyles.selectDisabled : {}),
              }}
              title={data !== null && !hasMatchData ? 'Match sorting requires candidate profile' : undefined}
              aria-label="Sort Order"
            >
              <option value="">Newest First</option>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolbar Footer: Results Count & Clear Action */}
        <div style={pageStyles.toolbarFooter}>
          {loading ? (
            <span style={pageStyles.resultsCount}>Loading opportunities...</span>
          ) : data ? (
            <span style={pageStyles.resultsCount}>
              <strong>{data.pagination.total}</strong> opportunities found
            </span>
          ) : (
            <span style={pageStyles.resultsCount}>&nbsp;</span>
          )}

          {hasActiveFilters && (
            <button onClick={clearFilters} style={pageStyles.clearFiltersBtn}>
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div style={pageStyles.errorAlert}>{error}</div>
      ) : loading && !data ? (
        <div style={pageStyles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !data || data.opportunities.length === 0 ? (
        <div style={pageStyles.emptyState}>
          <div style={pageStyles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3 style={pageStyles.emptyTitle}>No opportunities found</h3>
          <p style={pageStyles.emptySubtitle}>
            Try adjusting your search query or loosening your filter criteria.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} style={{ marginTop: '8px' }}>
              Clear all filters
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

      {/* Scoped CSS for hover effects and responsive layouts */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .opp-card:hover {
              border-color: #dcd9d2 !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
              transform: translateY(-1px);
            }
            .opp-card:hover .opp-view-link {
              color: var(--accent-hover) !important;
            }
            .opp-card:hover .opp-view-link span:last-child {
              transform: translateX(3px);
            }
            .pg-btn:not(:disabled):hover {
              background-color: var(--bg-surface-hover) !important;
              border-color: #dcd9d2 !important;
            }
            @keyframes shimmer {
              0% { opacity: 0.5; }
              50% { opacity: 0.85; }
              100% { opacity: 0.5; }
            }
            .opp-skeleton {
              animation: shimmer 1.5s infinite ease-in-out;
            }
            @media (max-width: 768px) {
              .opp-card {
                padding: 16px !important;
              }
              .opp-card .opp-match-badge,
              .opp-card .opp-unavailable-badge {
                min-width: unset !important;
              }
            }
            @media (max-width: 640px) {
              .opp-card > div:first-child {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 10px !important;
              }
              .opp-card .opp-match-badge {
                align-self: flex-start !important;
                text-align: left !important;
                align-items: flex-start !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: '1060px',
    margin: '0 auto',
    padding: '36px 24px 64px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 750,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    margin: 0,
    marginBottom: '4px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    margin: 0,
    fontWeight: 450,
  },
  toolbar: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
  },
  searchFieldWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-tertiary)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '9px 36px 9px 38px',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '4px',
  },
  searchBtn: {
    flexShrink: 0,
    paddingLeft: '1.25rem',
    paddingRight: '1.25rem',
    fontWeight: 600,
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  selectWrap: {
    flex: '1 1 auto',
    minWidth: '130px',
  },
  select: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color var(--transition-fast)',
  },
  selectDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toolbarFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '2px',
  },
  resultsCount: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  clearFiltersBtn: {
    background: 'none',
    border: 'none',
    padding: '2px 6px',
    fontSize: '0.8125rem',
    color: 'var(--accent-primary)',
    fontWeight: 600,
    cursor: 'pointer',
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
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  emptyIcon: {
    color: 'var(--text-tertiary)',
    marginBottom: '4px',
  },
  emptyTitle: {
    fontSize: '1.0625rem',
    fontWeight: 650,
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0,
    maxWidth: '380px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading discovery workspace…</div>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
