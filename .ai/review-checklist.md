# Review Checklist

Use this checklist before submitting any code for SoloDesk Web.

---

## Architecture Compliance

- [ ] UI components are separated from complex business logic.
- [ ] Logic is extracted into custom hooks (`src/features/.../hooks/`).
- [ ] No deeply nested cross-feature imports (`feature A` importing internal components of `feature B`).
- [ ] Shared generic UI components are placed in `src/components/ui/` or `src/components/solodesk/`.

## State & Data Fetching Compliance

- [ ] All data fetching uses TanStack Query (`useQuery`, `useMutation`).
- [ ] No `useEffect` is used for fetching API data.
- [ ] Server state is not duplicated into local state (`useState` or `Zustand`) unless strictly necessary for UI manipulation.
- [ ] API calls are abstracted into `src/services/` and use the centralized `axiosClient`.
- [ ] Optimistic updates are implemented for latency-sensitive actions (like drag-and-drop Kanban).

## TypeScript Compliance

- [ ] No `any` types used without strict justification.
- [ ] Component props are fully typed.
- [ ] API Request/Response DTOs are correctly mapped to TypeScript types/interfaces.
- [ ] `strict` mode constraints are respected.

## UI / UX Compliance

- [ ] Tailwind CSS utility classes are used for styling. No inline styles unless dynamically calculated.
- [ ] The `cn()` utility is used for combining conditional class names.
- [ ] User-facing text is in **Vietnamese**.
- [ ] Loading states (skeletons/spinners) are implemented for async operations.
- [ ] Error states and API failures are handled gracefully (e.g., showing a Toast notification in Vietnamese).
- [ ] Mobile responsiveness is maintained (if applicable to the specific component).

## General Code Quality

- [ ] No leftover `console.log()` or debugger statements.
- [ ] Variables and functions follow the naming conventions (`camelCase`, `PascalCase`).
- [ ] File names follow the established project conventions.
- [ ] One logical change per commit.
