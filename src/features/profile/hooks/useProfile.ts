import { useEffect, useRef, useState } from "react";
import type { ContractClause, Profile } from "@/features/profile/types";
import {
  loadClauses,
  loadProfile,
  saveClauses,
  saveProfile,
} from "@/services/profileService";

/** Profile state, hydrated from and persisted to the profile service. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const mounted = useRef(false);

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
