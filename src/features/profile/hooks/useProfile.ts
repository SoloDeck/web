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

  // Hydrate identity fields from the backend on mount. Các trường server đã lưu
  // (bio, mức giá, portfolio) ưu tiên lấy từ BE; chỉ giữ giá trị localStorage khi
  // BE chưa có gì — tránh bản nháp cũ ở máy đè lên dữ liệu thật.
  useEffect(() => {
    getMe()
      .then((me) => {
        const rate = Number(me.professional_profile?.default_hourly_rate ?? NaN);

        setProfile((prev) => ({
          ...prev,
          fullName: me.full_name,
          email: me.email,
          phone: me.phone ?? prev.phone,
          avatarUrl: me.avatar_url ?? prev.avatarUrl,
          bio: me.bio ?? prev.bio,
          profession: me.profession ?? prev.profession,
          hourlyRate: Number.isFinite(rate) && rate > 0 ? rate : prev.hourlyRate,
          portfolioUrl: me.professional_profile?.portfolio_url ?? prev.portfolioUrl,
          skills: me.professional_profile?.skills?.length
            ? me.professional_profile.skills
            : prev.skills,
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
