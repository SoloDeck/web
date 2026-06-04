# SoloDesk Web — Claude Code Context

## Commit Rules

- **Commit scope:** one logical change per commit. Never bundle unrelated changes.
- **Message format:** `<type>(<scope>): <short summary>` — e.g. `feat(deals): add kanban board`, `fix(ui): correct modal overflow`.
- **Allowed types:** `feat` · `fix` · `docs` · `refactor` · `test` · `chore`
- **Scope:** use the feature name (`deals`, `clients`, `ui`, `core`, `router`).
- **Never commit:** `.env` files, secrets.

---

## Project Overview

**SoloDesk Web** is the frontend application for the SoloDesk AI-powered CRM platform. It provides a visual Kanban board, lead qualification panels, and proposal generation workflows designed for Vietnamese freelancers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Bundler | Vite 8 + Bun |
| Language | TypeScript |
| Routing | TanStack Router |
| Server State | TanStack Query |
| Local/Shared State| Zustand + React `useState` |
| Data Fetching | Axios |
| Styling | TailwindCSS v4 |
| UI Components | Shadcn/ui + Radix UI |
| Drag and Drop | dnd-kit |

---

## Architecture

**Pattern: Feature-driven UI.**

Code is organized primarily by feature, with shared primitives separated from business logic.

```text
src/
├── assets/          # Static assets (images, svg)
├── components/      # Shared components
│   ├── ui/          # Generic design system (Shadcn primitives)
│   └── solodesk/    # Shared domain-specific UI
├── configs/         # Axios, QueryClient, global config
├── features/        # Feature modules (deals, clients, etc.)
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       └── store/
├── hooks/           # Shared general-purpose hooks
├── lib/             # Utility functions, helpers
├── routes/          # TanStack Router route definitions
├── services/        # API service clients
└── utils/           # Helper functions
```

### Dependency Rules

- `routes/` orchestrates components and passes down params. It should not contain complex business logic.
- `features/` should be self-contained. Feature A should rarely import directly from Feature B's internal components.
- Server state must always be managed by TanStack Query (`useQuery`, `useMutation`).
- Do not bypass Axios configs for data fetching (always use the configured `axiosClient`).

---

## Coding Rules

### React & Hooks

- Use functional components and React Hooks.
- Do not use Class components.
- Use `useState` for strictly local UI state (e.g., modal open/close, input values).
- Use `Zustand` for complex client-side state shared across components.
- Use `TanStack Query` for all asynchronous data fetching, caching, and synchronization.

### TypeScript

- Strict mode is enabled. No `any` without explicit justification.
- Define proper `type` or `interface` for all component props, API payloads, and state objects.
- Prefer `type` over `interface` for simple DTOs.

### TailwindCSS & UI

- Use TailwindCSS utility classes for styling.
- Use `cn` (clsx + tailwind-merge) for conditional class names.
- Extract repeated UI patterns into `src/components/ui` or `src/components/solodesk`.
- User-facing text must be in **Vietnamese**.

### Data Fetching & Mutations

- All API calls must use `axiosClient` from `src/configs/axios.ts`.
- Mutations should have `onMutate` for optimistic updates when applicable (especially for Kanban drag-and-drop).
- Always handle `onError` to show a toast notification.

---

## Error Handling

- API errors should be caught and displayed to the user via toast notifications (in Vietnamese).
- Form validation should be done using a schema validator (like Zod) if available, or strict TS checks.

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Using `useEffect` to fetch data | Use `useQuery` from TanStack Query. |
| Global state for server data | Cache server data in TanStack Query; use Zustand only for client UI state. |
| Hardcoding English text | Use Vietnamese text for all UI elements. |
| Direct Axios calls in components | Abstract API calls into `src/services/` and wrap with Query hooks in `src/features/<name>/hooks/`. |
| Inline styles | Use Tailwind classes (`className="..."`). |
