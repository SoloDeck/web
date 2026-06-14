import { create } from "zustand";
import { getClientConfig, type ClientConfig } from "@/services/authService";

interface ConfigState {
  config: ClientConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: true,
  error: null,
  fetchConfig: async () => {
    try {
      const config = await getClientConfig();
      set({ config, isLoading: false, error: null });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Không thể tải cấu hình hệ thống.",
      });
    }
  },
}));
