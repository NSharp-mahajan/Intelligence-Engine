export interface ProfileCompletenessInput {
  fullName: string | null;
  university: string | null;
  targetRole: string | null;
  graduationYear?: number | null;
  candidateSkills?: unknown[] | null;
  projects?: unknown[] | null;
}

/**
 * Completion criteria:
 *   1. Full name         — required
 *   2. University        — required
 *   3. Target role       — required
 *   4. Graduation year   — required
 *   5. At least 1 skill  — required
 *   6. At least 1 project/evidence — required
 *
 * Returns a detailed result so the dashboard can show which sections are missing.
 */
export interface ProfileCompletenessResult {
  isComplete: boolean;
  percentage: number;
  completedSections: string[];
  missingSections: string[];
}

export interface ProfileCompletenessSection {
  key: string;
  label: string;
  complete: boolean;
}

export function getProfileCompleteness(profile: ProfileCompletenessInput | null): ProfileCompletenessResult {
  const sections: ProfileCompletenessSection[] = [
    {
      key: 'name',
      label: 'Full name',
      complete: Boolean(profile?.fullName?.trim()),
    },
    {
      key: 'university',
      label: 'University',
      complete: Boolean(profile?.university?.trim()),
    },
    {
      key: 'targetRole',
      label: 'Target role',
      complete: Boolean(profile?.targetRole?.trim()),
    },
    {
      key: 'graduationYear',
      label: 'Graduation year',
      complete: Boolean(profile?.graduationYear),
    },
    {
      key: 'skills',
      label: 'At least one skill',
      complete: Array.isArray(profile?.candidateSkills) && (profile?.candidateSkills?.length ?? 0) > 0,
    },
    {
      key: 'projects',
      label: 'At least one project',
      complete: Array.isArray(profile?.projects) && (profile?.projects?.length ?? 0) > 0,
    },
  ];

  const completedSections = sections.filter(s => s.complete).map(s => s.label);
  const missingSections = sections.filter(s => !s.complete).map(s => s.label);
  const percentage = Math.round((completedSections.length / sections.length) * 100);
  const isComplete = missingSections.length === 0;

  return { isComplete, percentage, completedSections, missingSections };
}

/**
 * Core onboarding profile completeness check.
 * Follows the essential fields required to exit onboarding: name, university, and target role.
 * When this returns true, the candidate has completed initial onboarding and can access
 * the application workspace (/portal, /opportunities, /evidence).
 */
export function isProfileComplete(profile: ProfileCompletenessInput | null): boolean {
  return Boolean(
    profile?.fullName?.trim() &&
    profile?.university?.trim() &&
    profile?.targetRole?.trim()
  );
}
