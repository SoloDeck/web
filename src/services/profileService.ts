import {
  DEFAULT_CLAUSES,
  DEFAULT_PROFILE,
  type ContractClause,
  type Profile,
} from "@/features/profile/types";

// ---------------------------------------------------------------------------
// Profile service
//
// The freelancer's profile and contract clauses are local workspace config, so
// they persist to localStorage. This module is the single place that touches
// storage; when a backend `GET/PUT /profile` exists, only these bodies change.
// ---------------------------------------------------------------------------

const PROFILE_KEY = "solodesk.profile.v1";
const CLAUSES_KEY = "solodesk.clauses.v1";

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_PROFILE;
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadClauses(): ContractClause[] {
  try {
    const raw = localStorage.getItem(CLAUSES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_CLAUSES;
}

export function saveClauses(clauses: ContractClause[]): void {
  localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
}
