import {
  DEFAULT_PROFILE,
  type Profile,
} from "@/features/profile/types";

// ---------------------------------------------------------------------------
// Profile service
//
// The freelancer's profile is local workspace config, so it persists to
// localStorage. This module is the single place that touches storage; when a
// backend `GET/PUT /profile` exists, only these bodies change.
// ---------------------------------------------------------------------------

const PROFILE_KEY = "solodesk.profile.v1";

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
