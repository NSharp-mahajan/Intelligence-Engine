export interface ProfileCompletenessInput {
  fullName: string | null;
  university: string | null;
  targetRole: string | null;
}

/**
 * Profile completeness currently follows the fields already used by the
 * dashboard: name, university, and target role. Optional links and graduation
 * year do not determine completeness.
 */
export function isProfileComplete(profile: ProfileCompletenessInput | null): boolean {
  return Boolean(
    profile?.fullName?.trim() &&
    profile.university?.trim() &&
    profile.targetRole?.trim()
  );
}
