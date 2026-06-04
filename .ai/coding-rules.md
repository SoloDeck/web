# Coding Rules

## TypeScript

Type hints are mandatory for all component props, API payloads, state objects, and custom hooks.

```typescript
// CORRECT
type DealProps = {
  id: string;
  title: string;
  value: number;
};
export function DealCard({ id, title, value }: DealProps) { ... }

// WRONG
export function DealCard({ id, title, value }: any) { ... }
```

- Strict mode is enabled.
- Avoid `any`. Use `unknown` if absolutely necessary and assert later.
- Use `type` for simple combinations and DTOs; `interface` for extensible object structures.

## React & Hooks

- Use **React 19** functional components.
- Keep components small and focused.
- Prefix custom hooks with `use`.
- Avoid `useEffect` for data fetching; use **TanStack Query**.

```typescript
// CORRECT
const { data, isLoading } = useDealsQuery();

// WRONG
const [data, setData] = useState([]);
useEffect(() => { axios.get('/deals').then(setData); }, []);
```

## State Management

1. **Local State:** Use `useState` for ephemeral UI state (dropdowns, inputs).
2. **Server State:** Use `useQuery` / `useMutation` from TanStack Query for all API data.
3. **Global Client State:** Use `Zustand` for cross-component UI state (e.g., current active deal modal).
4. **URL State:** Use TanStack Router query params for shareable/bookmarkable state (e.g., filters, search).

## TailwindCSS & UI

- Use TailwindCSS utility classes.
- Use the `cn()` utility (`clsx` + `tailwind-merge`) to conditionally combine classes.

```typescript
// CORRECT
<div className={cn("p-4 bg-white rounded", isActive && "bg-blue-50")}>

// WRONG
<div className={`p-4 bg-white rounded ${isActive ? "bg-blue-50" : ""}`}>
```

- User-facing strings must be in **Vietnamese**.

## Data Fetching (Axios + TanStack Query)

- Define API calls in `src/services/`.
- Wrap API calls in custom hooks under `src/features/<feature>/hooks/`.
- Always use the predefined `axiosClient`.

```typescript
// src/services/dealService.ts
export async function getDeals(): Promise<DealDto[]> {
  const { data } = await axiosClient.get("/api/deals");
  return data;
}

// src/features/deals/hooks/useDealQueries.ts
export function useDealsQuery() {
  return useQuery({ queryKey: ["deals"], queryFn: getDeals });
}
```

## Optimistic Updates

For interactions like Drag-and-Drop (Kanban), implement optimistic updates via TanStack Query's `onMutate`.

- Cancel outgoing refetches.
- Snapshot previous value.
- Optimistically update the cache.
- Rollback on `onError`.
- Invalidate queries on `onSettled`.

## Comments

- Write comments only for non-obvious logic, complex workarounds, or 'Why' explanations.
- Do not write redundant comments explaining 'What' the code does.
