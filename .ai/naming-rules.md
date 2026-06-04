# Naming Rules

## General Conventions

| Convention | Applies To |
|-----------|-----------|
| `PascalCase` | React Components, Types, Interfaces |
| `camelCase` | Functions, variables, hooks, store instances |
| `UPPER_SNAKE_CASE` | Constants, Action types (if any) |
| `kebab-case` | File names, directory names, URLs |

---

## File Naming

React component files must use `.tsx` extension and `PascalCase` or `kebab-case` based on team preference. For SoloDesk, use `PascalCase` for component files if not otherwise defined, or `kebab-case` for utility files.
**Standardization:**
- Component files: `PascalCase.tsx` (e.g., `DealCard.tsx`, `KanbanBoard.tsx`)
- Logic/Hooks/Utils: `camelCase.ts` (e.g., `useDealQueries.ts`, `dealService.ts`)
- Route files: follow TanStack Router conventions (e.g., `index.tsx`, `routeTree.gen.ts`)

---

## React Components

Components are nouns or noun phrases:

```tsx
// CORRECT
export function DealCard() { ... }
export function ProposalModal() { ... }
export function AIPanel() { ... }

// WRONG
export function RenderDeal() { ... }
```

Props types are named `<ComponentName>Props`:

```tsx
type DealCardProps = { ... }
export function DealCard(props: DealCardProps) { ... }
```

---

## Hooks

Custom hooks always start with `use`:

```ts
// CORRECT
export function useDealsQuery() { ... }
export function useMoveDealMutation() { ... }
export function useKanbanDnd() { ... }

// WRONG
export function fetchDealsHook() { ... }
```

---

## Services & API

Service files: `<domain>Service.ts`
Functions: `<verb><Entity>`

```ts
// CORRECT
export async function getDeals() { ... }
export async function updateDealStage() { ... }

// WRONG
export async function dealUpdate() { ... }
```

## Types and Interfaces

Data Transfer Objects (DTOs) from the backend: `<Entity>Dto`
Internal models/types: `<Entity>`

```ts
export type DealDto = { ... }
export type Stage = "new_lead" | "qualified" | "active";
```
