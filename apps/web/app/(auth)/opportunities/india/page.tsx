'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { fetchApi, ApiError } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { CompanyLogo } from '../../../../components/CompanyLogo';
import type { OpportunitiesResponse, Opportunity } from '../../../../lib/types';

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

function formatSourceName(source: string | null | undefined): string {
  if (!source) return 'Job Board';
  const s = source.trim().toLowerCase();
  if (s === 'jobicy') return 'Jobicy';
  if (s === 'greenhouse') return 'Greenhouse';
  if (s === 'lever') return 'Lever';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

// ─── Filter Constants ────────────────────────────────────────────────────────

const CITY_OPTIONS = [
  { label: 'All India', value: '' },
  { label: 'Bengaluru', value: 'Bengaluru' },
  { label: 'Hyderabad', value: 'Hyderabad' },
  { label: 'Pune', value: 'Pune' },
  { label: 'Delhi-NCR', value: 'Delhi-NCR' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Chennai', value: 'Chennai' },
];

const STAGE_OPTIONS = [
  { label: 'All Stages', value: '' },
  { label: 'Internships', value: 'INTERNSHIP' },
  { label: 'Entry-level', value: 'ENTRY' },
];

const WORK_MODE_OPTIONS = [
  { label: 'All Work Modes', value: '' },
  { label: 'Remote', value: 'REMOTE' },
  { label: 'Hybrid', value: 'HYBRID' },
  { label: 'Onsite', value: 'ONSITE' },
];

const MATCH_FILTER_OPTIONS = [
  { label: 'All Matches', value: '' },
  { label: '80%+ Match', value: '80_plus' },
  { label: '60%+ Match', value: '60_plus' },
  { label: '40%+ Match', value: '40_plus' },
  { label: 'Below 40%', value: 'below_40' },
  { label: 'Match Unavailable', value: 'unavailable' },
];

const SORT_OPTIONS = [
  { label: 'Balanced Discovery (Default)', value: '' },
  { label: 'Match: High to Low', value: 'match_desc' },
  { label: 'Match: Low to High', value: 'match_asc' },
  { label: 'Newest Posted', value: 'posted_desc' },
  { label: 'Oldest Posted', value: 'posted_asc' },
];

// ─── Opportunity Card Component ─────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const postedLabel = formatDate(opp.postedDate);

  const hasMatch = opp.match !== undefined && opp.match !== null;
  const isStructured = hasMatch && opp.match?.hasStructuredRequirements === true && typeof opp.match?.score === 'number';

  // Visual styling for match badge based on score
  const getMatchVariant = (score: number) => {
    if (score >= 80) {
      return {
        badgeBg: '#f0fdf4',
        badgeBorder: '#bbf7d0',
        scoreColor: '#15803d',
      };
    }
    if (score >= 60) {
      return {
        badgeBg: '#fff7ed',
        badgeBorder: '#ffedd5',
        scoreColor: '#c2410c',
      };
    }
    return {
      badgeBg: '#fafaf9',
      badgeBorder: '#fed7aa',
      scoreColor: '#9a3412',
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
    <article style={cardStyles.root} className="opp-card">
      <div style={cardStyles.headerRow}>
        <div style={cardStyles.identityGroup}>
          <CompanyLogo
            organization={opp.organization}
            logoUrl={opp.companyLogoUrl}
            size={46}
          />
          <div style={cardStyles.titleBlock}>
            <h2 style={cardStyles.title}>
              <Link href={`/opportunities/${opp.id}`} style={cardStyles.titleLink}>
                {opp.title}
              </Link>
            </h2>

            <div style={cardStyles.orgLine}>
              <span style={cardStyles.company}>{opp.organization}</span>
              {opp.location && (
                <>
                  <span style={cardStyles.dot}>·</span>
                  <span style={cardStyles.location}>{opp.location}</span>
                </>
              )}
              {opp.workMode && opp.workMode !== 'UNKNOWN' && (
                <>
                  <span style={cardStyles.dot}>·</span>
                  <span style={cardStyles.workMode}>{fmtEnum(opp.workMode)}</span>
                </>
              )}
              {opp.source && (
                <>
                  <span style={cardStyles.dot}>·</span>
                  <span style={cardStyles.sourceBadge}>via {formatSourceName(opp.source)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Match Intelligence Badge */}
        {hasMatch ? (
          isStructured && matchVariant ? (
            <div
              style={{
                ...cardStyles.matchBadge,
                backgroundColor: matchVariant.badgeBg,
                borderColor: matchVariant.badgeBorder,
              }}
              className="opp-match-badge"
            >
              <div style={cardStyles.matchBadgeTop}>
                <span style={{ ...cardStyles.matchScore, color: matchVariant.scoreColor }}>
                  {opp.match!.score}% Match
                </span>
              </div>
              <span style={cardStyles.matchStats}>
                {opp.match!.matchedCount} matched
                {opp.match!.missingCount > 0 ? ` · ${opp.match!.missingCount} missing` : ''}
              </span>
            </div>
          ) : opp.match?.hasStructuredRequirements ? (
            <div style={cardStyles.matchUnavailableBadge}>
              <span style={cardStyles.matchUnavailableTitle}>Match pending</span>
              <span style={cardStyles.matchUnavailableSub}>Add profile skills</span>
            </div>
          ) : (
            <div style={cardStyles.matchUnavailableBadge}>
              <span style={cardStyles.matchUnavailableTitle}>Match unavailable</span>
              <span style={cardStyles.matchUnavailableSub}>Sparse requirements</span>
            </div>
          )
        ) : null}
      </div>

      {/* Structured Key Requirement Skills */}
      {displaySkills.length > 0 && (
        <div style={cardStyles.skillsRow}>
          {displaySkills.map((os) => (
            <span key={os.skillId} style={cardStyles.skillChip}>
              {os.skill.name}
            </span>
          ))}
          {remainingSkillsCount > 0 && (
            <span style={cardStyles.moreSkillsText}>+{remainingSkillsCount} more</span>
          )}
        </div>
      )}

      {/* Footer Row: Metadata Chips, Posting Date, & Actions */}
      <div style={cardStyles.footerRow}>
        <div style={cardStyles.metaInfo}>
          {metaChips.length > 0 && (
            <div style={cardStyles.tagGroup}>
              {metaChips.map((chip, idx) => (
                <span key={idx} style={cardStyles.metaChip}>
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div style={cardStyles.provenance}>
            {postedLabel && <span>Posted {postedLabel}</span>}
            {postedLabel && <span style={cardStyles.dot}>·</span>}
            <span style={cardStyles.sourceProvenance}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: '4px' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Source: <strong>{formatSourceName(opp.source)}</strong>
            </span>
          </div>
        </div>

        <div style={cardStyles.actionsGroup}>
          <Link href={`/opportunities/${opp.id}`} style={cardStyles.detailsLink} className="opp-view-link">
            <span>View details</span>
            <span style={cardStyles.arrowIcon}>→</span>
          </Link>
          {opp.applicationUrl && (
            <a
              href={opp.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={cardStyles.applyBtn}
              className="opp-apply-btn"
            >
              <span>Apply</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Pagination Control ──────────────────────────────────────────────────────

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
    <div style={paginationStyles.row}>
      <button
        style={{ ...paginationStyles.btn, ...(page <= 1 ? paginationStyles.disabled : {}) }}
        disabled={page <= 1}
        onClick={onPrev}
        className="pg-btn"
      >
        ← Previous
      </button>
      <span style={paginationStyles.info}>
        Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
      </span>
      <button
        style={{ ...paginationStyles.btn, ...(page >= totalPages || totalPages === 0 ? paginationStyles.disabled : {}) }}
        disabled={page >= totalPages || totalPages === 0}
        onClick={onNext}
        className="pg-btn"
      >
        Next →
      </button>
    </div>
  );
}

// ─── Skeleton Card Component ────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={cardStyles.root} className="opp-skeleton">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', backgroundColor: 'var(--border-light)' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '20px', width: '65%', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
            <div style={{ height: '14px', width: '45%', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
          </div>
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

// ─── Main India Opportunities Content ───────────────────────────────────────

function IndiaOpportunitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageParam = searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const search = searchParams.get('search') || '';
  const city = searchParams.get('city') || '';
  const stage = searchParams.get('stage') || '';
  const workMode = searchParams.get('workMode') || '';
  const skill = searchParams.get('skill') || '';
  const matchFilter = searchParams.get('matchFilter') || '';
  const sort = searchParams.get('sort') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [skillInput, setSkillInput] = useState(skill);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    setSkillInput(skill);
  }, [skill]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authRequiredPrompt, setAuthRequiredPrompt] = useState(false);
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

  const handleSkillSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateQuery({ skill: skillInput, page: '1' });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSkillInput('');
    setAuthRequiredPrompt(false);
    updateQuery({
      search: null,
      city: null,
      stage: null,
      workMode: null,
      skill: null,
      matchFilter: null,
      sort: null,
      page: '1',
    });
  };

  const removeSingleFilter = (key: string) => {
    if (key === 'search') setSearchInput('');
    if (key === 'skill') setSkillInput('');
    updateQuery({ [key]: null, page: '1' });
  };

  const hasActiveFilters = Boolean(
    search || city || stage || workMode || skill || matchFilter || sort
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOpportunities() {
      setLoading(true);
      setError('');
      setAuthRequiredPrompt(false);

      try {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '20');
        if (search) params.set('search', search);
        if (city) params.set('city', city);
        if (stage) params.set('stage', stage);
        if (workMode) params.set('workMode', workMode);
        if (skill) params.set('skill', skill);
        if (matchFilter) params.set('matchFilter', matchFilter);
        if (sort) params.set('sort', sort);

        const result = await fetchApi<OpportunitiesResponse>(`/opportunities/india?${params.toString()}`);
        if (!cancelled) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            setAuthRequiredPrompt(true);
            setError('');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load India opportunities');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOpportunities();

    return () => {
      cancelled = true;
    };
  }, [page, search, city, stage, workMode, skill, matchFilter, sort]);

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
      {/* Page Header */}
      <header style={pageStyles.header}>
        <div style={pageStyles.headerTitleRow}>
          <div style={pageStyles.titleWithBadge}>
            <h1 style={pageStyles.title}>India Opportunities</h1>
            <span style={pageStyles.verifiedBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              India-Eligible Roles
            </span>
          </div>
          <span style={pageStyles.hubCountBadge}>Tech Hubs & Eligible Remote</span>
        </div>
        <p style={pageStyles.subtitle}>
          Curated tech roles and remote positions open to candidates residing in India, balanced across top Indian tech hubs including Bengaluru, Hyderabad, Pune, Delhi-NCR, Mumbai, and Chennai.
        </p>
      </header>

      {/* Auth-Required Notice for Unauthenticated Match Filtering/Sorting */}
      {authRequiredPrompt && (
        <div style={pageStyles.authBanner} role="alert">
          <div style={pageStyles.authBannerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div style={pageStyles.authBannerContent}>
            <h4 style={pageStyles.authBannerTitle}>Candidate Profile Required for Match Scoring</h4>
            <p style={pageStyles.authBannerText}>
              Match percentage filtering and match score sorting require an active candidate profile with verified skills and evidence. Reset match filters to explore all available India opportunities.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateQuery({ matchFilter: null, sort: null, page: '1' });
              setAuthRequiredPrompt(false);
            }}
            style={pageStyles.authBannerBtn}
          >
            Reset Match Filter
          </Button>
        </div>
      )}

      {/* Missing Candidate Skills Actionable Banner */}
      {data?.candidateContext?.isAuthenticated && !data?.candidateContext?.hasSkills && (
        <div style={pageStyles.noSkillsBanner} role="status">
          <div style={pageStyles.noSkillsBannerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div style={pageStyles.noSkillsBannerContent}>
            <h4 style={pageStyles.noSkillsBannerTitle}>Add Verified Skills to See Personalized Match Scores</h4>
            <p style={pageStyles.noSkillsBannerText}>
              Your candidate profile does not have verified technical skills or project evidence recorded yet. Add your skills in your profile to unlock explainable match percentages across India opportunities.
            </p>
          </div>
          <Link href="/profile" style={pageStyles.noSkillsBannerBtn}>
            Update Profile →
          </Link>
        </div>
      )}

      {/* Discovery Controls / Toolbar */}
      <div style={pageStyles.toolbar}>
        {/* Search & Skill Filter Row */}
        <div style={pageStyles.searchRow}>
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
                placeholder="Search roles or companies (e.g. Swiggy, SDE, Frontend)..."
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

          {/* Skill Filter Input */}
          <form onSubmit={handleSkillSubmit} style={pageStyles.skillForm}>
            <div style={pageStyles.searchFieldWrapper}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={pageStyles.searchIcon}
                aria-hidden="true"
              >
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <input
                type="text"
                placeholder="Filter by skill (e.g. Python, React, Go)..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                style={pageStyles.searchInput}
              />
              {skillInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSkillInput('');
                    updateQuery({ skill: null, page: '1' });
                  }}
                  style={pageStyles.clearSearchBtn}
                  title="Clear skill filter"
                >
                  ✕
                </button>
              )}
            </div>
            <Button type="submit" variant="outline" size="md" style={pageStyles.skillBtn}>
              Skill Filter
            </Button>
          </form>
        </div>

        {/* Filter Dropdowns Row */}
        <div style={pageStyles.filtersRow}>
          {/* City Filter */}
          <div style={pageStyles.selectWrap}>
            <select
              value={city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              style={pageStyles.select}
              aria-label="City Hub"
            >
              {CITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Career Stage Filter */}
          <div style={pageStyles.selectWrap}>
            <select
              value={stage}
              onChange={(e) => handleFilterChange('stage', e.target.value)}
              style={pageStyles.select}
              aria-label="Career Stage"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Work Mode Filter */}
          <div style={pageStyles.selectWrap}>
            <select
              value={workMode}
              onChange={(e) => handleFilterChange('workMode', e.target.value)}
              style={pageStyles.select}
              aria-label="Work Mode"
            >
              {WORK_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Match Quality Filter */}
          <div style={pageStyles.selectWrap}>
            <select
              value={matchFilter}
              onChange={(e) => handleFilterChange('matchFilter', e.target.value)}
              style={pageStyles.select}
              aria-label="Match Quality"
            >
              {MATCH_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div style={pageStyles.selectWrap}>
            <select
              value={sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              style={pageStyles.select}
              aria-label="Sort Order"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div style={pageStyles.activeChipsRow}>
            <span style={pageStyles.activeChipsLabel}>Active filters:</span>
            {search && (
              <span style={pageStyles.filterChip}>
                Search: &ldquo;{search}&rdquo;
                <button
                  type="button"
                  onClick={() => removeSingleFilter('search')}
                  style={pageStyles.chipRemoveBtn}
                  aria-label="Remove search filter"
                >
                  ✕
                </button>
              </span>
            )}
            {city && (
              <span style={pageStyles.filterChip}>
                City: {city}
                <button
                  type="button"
                  onClick={() => removeSingleFilter('city')}
                  style={pageStyles.chipRemoveBtn}
                  aria-label="Remove city filter"
                >
                  ✕
                </button>
              </span>
            )}
            {stage && (
              <span style={pageStyles.filterChip}>
                Stage: {stage === 'INTERNSHIP' ? 'Internship' : 'Entry-level'}
                <button
                  type="button"
                  onClick={() => removeSingleFilter('stage')}
                  style={pageStyles.chipRemoveBtn}
                  aria-label="Remove stage filter"
                >
                  ✕
                </button>
              </span>
            )}
            {workMode && (
              <span style={pageStyles.filterChip}>
                Mode: {fmtEnum(workMode)}
                <button
                  type="button"
                  onClick={() => removeSingleFilter('workMode')}
                  style={pageStyles.chipRemoveBtn}
                  aria-label="Remove work mode filter"
                >
                  ✕
                </button>
              </span>
            )}
            {skill && (
              <span style={pageStyles.filterChip}>
                Skill: {skill}
                <button
                  type="button"
                  onClick={() => removeSingleFilter('skill')}
                  style={pageStyles.chipRemoveBtn}
                  aria-label="Remove skill filter"
                >
                  ✕
                </button>
              </span>
            )}
            {matchFilter && (
              <span style={pageStyles.filterChip}>
                Match: {MATCH_FILTER_OPTIONS.find((m) => m.value === matchFilter)?.label || matchFilter}
                <button
                  type="button"
                  onClick={() => removeSingleFilter('matchFilter')}
                  style={pageStyles.chipRemoveBtn}
                  aria-label="Remove match filter"
                >
                  ✕
                </button>
              </span>
            )}
            {sort && (
              <span style={pageStyles.filterChip}>
                Sort: {SORT_OPTIONS.find((s) => s.value === sort)?.label || sort}
                <button
                  type="button"
                  onClick={() => removeSingleFilter('sort')}
                  style={pageStyles.chipRemoveBtn}
                  aria-label="Remove sort filter"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              style={pageStyles.clearAllBtn}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Toolbar Footer: Results Count */}
        <div style={pageStyles.toolbarFooter}>
          {loading ? (
            <span style={pageStyles.resultsCount}>Loading India opportunities...</span>
          ) : data ? (
            <span style={pageStyles.resultsCount}>
              <strong>{data.pagination.total}</strong> India-eligible opportunities found
            </span>
          ) : (
            <span style={pageStyles.resultsCount}>&nbsp;</span>
          )}

          {hasActiveFilters && (
            <button onClick={clearFilters} style={pageStyles.clearFiltersBtn}>
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div style={pageStyles.errorAlert}>
          <div style={pageStyles.errorContent}>
            <strong>Unable to load opportunities:</strong> {error}
          </div>
          <Button variant="outline" size="sm" onClick={() => updateQuery({ page: page.toString() })}>
            Retry
          </Button>
        </div>
      ) : loading && !data ? (
        <div style={pageStyles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !data || data.opportunities.length === 0 ? (
        <div style={pageStyles.emptyState}>
          <div style={pageStyles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3 style={pageStyles.emptyTitle}>No India opportunities found</h3>
          <p style={pageStyles.emptySubtitle}>
            No listings matched your active criteria. Try clearing specific city hubs, expanding your work mode filter, or broadening your search terms.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} style={{ marginTop: '12px' }}>
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

      {/* Scoped Styling for Hover, Mobile Layout, and Interactive Polish */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .opp-card:hover {
              border-color: #dcd9d2 !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
              transform: translateY(-1px);
            }
            .opp-card:hover .opp-view-link {
              color: var(--accent-primary) !important;
            }
            .opp-card:hover .opp-view-link span:last-child {
              transform: translateX(3px);
            }
            .opp-apply-btn:hover {
              background-color: var(--accent-primary) !important;
              color: #ffffff !important;
              border-color: var(--accent-primary) !important;
            }
            .pg-btn:not(:disabled):hover {
              background-color: var(--bg-surface-hover) !important;
              border-color: var(--border-medium) !important;
            }
            @media (max-width: 768px) {
              .opp-card {
                padding: 16px 14px !important;
              }
              .discovery-india-filters {
                grid-template-columns: 1fr !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}

// ─── Exported Default Page with Suspense Boundary ───────────────────────────

export default function IndiaOpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <div style={pageStyles.wrap}>
          <div style={pageStyles.header}>
            <h1 style={pageStyles.title}>India Opportunities</h1>
            <p style={pageStyles.subtitle}>Loading India opportunities feed...</p>
          </div>
          <div style={pageStyles.list}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      }
    >
      <IndiaOpportunitiesContent />
    </Suspense>
  );
}

// ─── Component Styles ────────────────────────────────────────────────────────

const cardStyles: Record<string, React.CSSProperties> = {
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
    flexWrap: 'wrap',
  },
  identityGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    flex: '1 1 auto',
    minWidth: 0,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: '1 1 auto',
    minWidth: 0,
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
  sourceBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.01em',
  },
  matchBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  matchBadgeTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  matchScore: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  matchStats: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    marginTop: '1px',
  },
  matchUnavailableBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  matchUnavailableTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  matchUnavailableSub: {
    fontSize: '0.6875rem',
    color: 'var(--text-tertiary)',
    opacity: 0.8,
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
    paddingTop: '10px',
    borderTop: '1px solid var(--border-light)',
    marginTop: '2px',
    gap: '16px',
    flexWrap: 'wrap',
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
  sourceProvenance: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginLeft: 'auto',
  },
  detailsLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'color var(--transition-fast)',
  },
  arrowIcon: {
    fontSize: '0.9375rem',
    lineHeight: 1,
    transition: 'transform var(--transition-fast)',
  },
  applyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    backgroundColor: 'transparent',
    border: '1px solid var(--accent-primary)',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap',
  },
};

const paginationStyles: Record<string, React.CSSProperties> = {
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

const pageStyles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px 64px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  titleWithBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: 'var(--text-primary)',
    margin: 0,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 9px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: '#fff7ed',
    border: '1px solid #ffedd5',
    color: 'var(--accent-primary)',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.01em',
  },
  hubCountBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.5,
    maxWidth: '860px',
  },
  authBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: 'var(--radius-md)',
    color: '#92400e',
    flexWrap: 'wrap',
  },
  authBannerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#d97706',
  },
  authBannerContent: {
    flex: '1 1 300px',
  },
  authBannerTitle: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#92400e',
  },
  authBannerText: {
    margin: '3px 0 0',
    fontSize: '0.8125rem',
    color: '#b45309',
    lineHeight: 1.4,
  },
  authBannerBtn: {
    flexShrink: 0,
    backgroundColor: '#ffffff',
  },
  noSkillsBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: 'var(--radius-md)',
    color: '#1e40af',
    flexWrap: 'wrap',
  },
  noSkillsBannerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#2563eb',
  },
  noSkillsBannerContent: {
    flex: '1 1 300px',
  },
  noSkillsBannerTitle: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#1e40af',
  },
  noSkillsBannerText: {
    margin: '3px 0 0',
    fontSize: '0.8125rem',
    color: '#3b82f6',
    lineHeight: 1.4,
  },
  noSkillsBannerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: 'var(--accent-primary)',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
  },
  searchRow: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: '12px',
  },
  searchForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  skillForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchFieldWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-tertiary)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    height: '38px',
    padding: '0 32px 0 36px',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
    fontFamily: 'inherit',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    height: '38px',
    flexShrink: 0,
  },
  skillBtn: {
    height: '38px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  filtersRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '10px',
  },
  selectWrap: {
    position: 'relative',
    width: '100%',
  },
  select: {
    width: '100%',
    height: '36px',
    padding: '0 28px 0 10px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    fontFamily: 'inherit',
    transition: 'border-color var(--transition-fast)',
  },
  activeChipsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    paddingTop: '6px',
    borderTop: '1px dashed var(--border-light)',
  },
  activeChipsLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  filterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 8px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface-hover)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-full)',
  },
  chipRemoveBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '0.6875rem',
    padding: '0 2px',
    lineHeight: 1,
  },
  clearAllBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 6px',
  },
  toolbarFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-light)',
  },
  resultsCount: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },
  clearFiltersBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: 'var(--radius-md)',
    color: '#991b1b',
    fontSize: '0.875rem',
  },
  errorContent: {
    flex: 1,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 20px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px dashed var(--border-light)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  },
  emptyIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-tertiary)',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '0 0 6px',
  },
  emptySubtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    maxWidth: '460px',
    margin: 0,
    lineHeight: 1.5,
  },
};
