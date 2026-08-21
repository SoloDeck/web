/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Mã đo GA4 dạng `G-XXXXXXXXXX`. Trống = không nạp analytics (xem `src/analytics/ga.ts`). */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
