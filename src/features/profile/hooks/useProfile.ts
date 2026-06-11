import { useEffect, useRef, useState } from "react";
import type { ContractClause, Profile } from "@/features/profile/types";
import {
  loadClauses,
  loadProfile,
  saveClauses,
  saveProfile,
} from "@/services/profileService";
import { getMe } from "@/services/usersService";

/** Profile state, seeded from localStorage then enriched from GET /users/me. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const mounted = useRef(false);

  // Hydrate identity fields from the backend on mount
  useEffect(() => {
    getMe()
      .then((me) => {
        setProfile((prev) => ({
          ...prev,
          fullName: me.full_name,
          email: me.email,
          phone: me.phone ?? prev.phone,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveProfile(profile);
  }, [profile]);

  return { profile, setProfile };
}

/** Contract clause library, hydrated from and persisted to the profile service. */
export function useClauses() {
  const [clauses, setClauses] = useState<ContractClause[]>(loadClauses);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveClauses(clauses);
  }, [clauses]);

  return { clauses, setClauses };
}
