import { Prisma } from '@prisma/client';

/**
 * Shared constants and query filters to exclude internal test fixtures
 * and mock sources from user-facing feeds and recommendations.
 *
 * Legitimate sources (Greenhouse, Lever, Jobicy, Ashby, SmartRecruiters)
 * are never excluded.
 */

export const EXCLUDED_TEST_SOURCES = [
  'test-fix-source',
  'mock',
  'test',
  'TestProvider',
  'StaticMockProvider',
] as const;

export const EXCLUDED_TEST_ORGS = [
  'Test Org',
] as const;

/**
 * Returns Prisma `where` filter conditions to exclude test/mock sources and organizations.
 */
export function getNonTestOpportunityWhere(): Prisma.OpportunityWhereInput {
  return {
    source: {
      notIn: [...EXCLUDED_TEST_SOURCES],
    },
    organization: {
      notIn: [...EXCLUDED_TEST_ORGS],
    },
  };
}

/**
 * Returns Prisma SQL fragments for raw SQL queries (e.g. round-robin feeds)
 * to strictly exclude test/mock sources.
 */
export function getNonTestOpportunitySqlCondition(): Prisma.Sql {
  return Prisma.sql`"source" NOT IN ('test-fix-source', 'mock', 'test', 'TestProvider', 'StaticMockProvider') AND "organization" NOT IN ('Test Org')`;
}
