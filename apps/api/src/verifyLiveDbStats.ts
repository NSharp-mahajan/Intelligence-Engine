import { prisma } from './lib/prisma';
import { isValidHttpUrl } from './lib/opportunityProvider';

async function main() {
  const totalOpp = await prisma.opportunity.count();
  const totalElig = await prisma.opportunityEligibility.count();
  const totalEv = await prisma.opportunityEligibilityEvidence.count();

  const categories = await prisma.opportunityEligibility.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
  });

  const verifications = await prisma.opportunityEligibility.groupBy({
    by: ['overallVerificationLevel'],
    _count: { overallVerificationLevel: true },
    orderBy: { _count: { overallVerificationLevel: 'desc' } },
  });

  const conflicts = await prisma.opportunityEligibility.count({
    where: { hasConflict: true },
  });

  // Early career categories included in feed
  const earlyFeedOpps = await prisma.opportunity.findMany({
    where: {
      eligibility: {
        category: {
          in: ['INTERNSHIP', 'FRESHER', 'GRADUATE_TRAINEE', 'ENTRY_LEVEL', 'JUNIOR'],
        },
      },
    },
    select: {
      id: true,
      title: true,
      organization: true,
      applicationUrl: true,
      sourceUrl: true,
      eligibility: {
        select: {
          category: true,
          confidence: true,
          overallVerificationLevel: true,
          eligibleBatches: true,
          minCgpa: true,
        },
      },
    },
  });

  const validAppUrls = earlyFeedOpps.filter((o) => isValidHttpUrl(o.applicationUrl)).length;
  const invalidOrMissingAppUrls = earlyFeedOpps.length - validAppUrls;

  console.log(JSON.stringify({
    totalOpp,
    totalElig,
    totalEv,
    categories,
    verifications,
    conflicts,
    earlyFeedCount: earlyFeedOpps.length,
    validAppUrls,
    invalidOrMissingAppUrls,
    sampleEarlyFeedOpps: earlyFeedOpps.slice(0, 5),
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
