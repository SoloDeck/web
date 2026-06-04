# Architecture Rules

## Pattern: Feature-Driven + Layered UI

SoloDesk Web follows a feature-driven architecture. Code is organized around business features rather than technical concerns, except for highly reusable UI primitives.

```text
src/
├── components/
│   ├── ui/          ← Design system (Shadcn primitives, stateless)
│   └── solodesk/    ← Domain-specific shared components
├── features/        ← Business domains (deals, clients, auth, etc.)
│   └── [feature]/
│       ├── components/  ← Feature-specific UI
│       ├── hooks/       ← Feature-specific React Query & logic hooks
│       └── store/       ← Feature-specific Zustand stores
├── routes/          ← TanStack Router configuration and page orchestration
├── services/        ← Axios API wrappers (grouped by domain)
└── configs/         ← Global configuration (Axios client, QueryClient)
```

## Dependency Direction

Dependencies should flow from generic to specific:

```text
routes/
   ↓
features/ (components, hooks, store)
   ↓
services/ & configs/
   ↓
components/ (ui, solodesk)
   ↓
lib/ & utils/
```

### Strictly Forbidden

| Violation | Why |
|-----------|-----|
| `features/X → features/Y` (Deep imports) | Creates tight coupling between features. Use shared components or route state instead. |
| `components/ui → features/` | UI primitives must remain stateless and domain-agnostic. |
| API calls inside components | Components should use TanStack Query hooks, not call `axios` directly. |
| Server data in Zustand | Server state (API data) belongs in React Query cache. Client state (UI) belongs in Zustand. |

## Module Internal Layers (Features)

A typical feature module looks like this:

```text
src/features/deals/
├── components/
│   ├── KanbanBoard.tsx
│   ├── DealCard.tsx
│   └── AIPanel.tsx
├── hooks/
│   ├── useDealQueries.ts    ← React Query hooks
│   └── useKanbanDnd.ts      ← Logic hooks
└── store/
    └── useDealStore.ts      ← Zustand client state
```

## Cross-Feature Communication

If two features must interact:
1. Lift the state to the URL/Router (e.g., query params).
2. Lift the state to a shared parent route component.
3. Use a shared Zustand store (sparingly).
4. Rely on React Query's cache invalidation (e.g., a mutation in feature A invalidates feature B's query).
