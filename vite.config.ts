/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import path from 'path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const envAllowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') || []
const allowedHosts = [...envAllowedHosts, '.solodesk.space', 'localhost']

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Khung xem trước dựng CẢ trang công khai thật (hồ sơ + biểu mẫu) trong mỗi bài test của
    // màn cấu hình, nên vài bài vượt mốc 5s mặc định khi 34 file chạy song song — chạy riêng
    // thì xanh. Nới mốc thay vì làm bản xem trước nhẹ đi, vì "dùng chính component trang
    // thật" mới là thứ đang được kiểm.
    testTimeout: 20_000,
    css: true,
    // Playwright owns e2e/; keep Vitest scoped to unit/component tests.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/routeTree.gen.ts',
      ],
    },
  },
})
