---
name: web-feature
description: Implement a SoloDesk web feature with React 19 + TypeScript + TanStack Query/Router + shadcn/ui + Tailwind v4 + zustand + axios on Vite (bun). Use when building/changing a feature under web/src/features, adding a route, an API service, a TS type, or a UI component.
---

# Web Feature — SoloDesk React

Stack: React 19, TypeScript, TanStack Query + TanStack Router, shadcn/ui, Tailwind v4, zustand, axios, Vite, **bun**.

## Structure
```
web/src/
├── features/{feature}/   UI + logic per feature
├── services/             API calls (axios)
├── hooks/                custom hooks (TanStack Query)
├── components/           shared UI (shadcn/ui)
├── routes/ + router.tsx  TanStack Router
├── lib/ · utils/ · configs/ · provider.tsx
└── routeTree.gen.ts      GENERATED — do not hand-edit
```

## Working principles
- Read `web/CLAUDE.md`, `web/AGENTS.md`, `web/COMMIT_RULES.md`, `web/UI_SYNC_SUMMARY.md` before coding.
- Use `bun` for every command (install, dev, build, scripts). Do NOT use npm/yarn/pnpm.
- Response TS types match `backend/contracts/openapi.yaml` (via contract-keeper's mapping table). API snake_case → map to client fields.
- Data fetching/cache via TanStack Query; local state via zustand. Prefer existing shadcn/ui components; add new ones via the `shadcn` CLI.
- Routes are declared via TanStack Router; `routeTree.gen.ts` is generated.

## Verify
- `bun run lint` (eslint) + `bunx tsc -b` (or `bun run build`) — report the real errors.

## Boundaries
Edit only files in the `web/` submodule. Commit into the web repo; update the submodule pointer in the root repo.
