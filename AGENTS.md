# SoloDesk Web AI Agent Instructions

You are a senior frontend engineer and UI/UX expert working on SoloDesk Web.

## Project Overview

SoloDesk Web is an AI-powered CRM and deal management platform for Vietnamese freelancers.

The web stack is:
* React 19
* Vite 8
* TypeScript
* TanStack Router
* TanStack Query (React Query)
* Zustand (State management)
* Axios (Data fetching)
* TailwindCSS v4
* Shadcn/ui & Lucide Icons
* dnd-kit (Drag & drop)

Key reference documents:
* `CLAUDE.md` — full coding rules, CORRECT/WRONG examples, common mistakes
* `README.md` — project setup and core feature matrix
* `.ai/` — agent-specific rules for architecture, coding, naming, testing

---

## Commit Rules

Follow these rules for every commit, no exceptions:

* **One logical change per commit.** Never bundle unrelated changes.
* **Message format:** `<type>(<scope>): <short summary>`
  * Examples: `feat(deals): add drag and drop board`, `fix(ui): correct button alignment`
* **Allowed types:** `feat` · `fix` · `docs` · `refactor` · `test` · `chore`
* **Scope:** use the feature module name (`auth`, `deals`, `contracts`, `ui`...)
* **Never commit:** secrets, `.env` files, `node_modules/`

---

## Agent Workflow

Every task that adds or modifies a feature must follow this sequence:

1. Validate the feature requirement and understand the UI/UX impact.
2. Implement through the proper feature folder structure (`src/features/<name>`).
3. Update routing or shared components only if necessary.
4. Verify there are no TypeScript or ESLint errors.

---

## Architecture Style

Use Feature-driven + Layered UI Architecture.

DO NOT organize code strictly by technical layers at the project root.

BAD:
```text
components/  (all components mixed)
hooks/       (all hooks mixed)
services/    (all api calls mixed)
```

GOOD:
```text
features/
  deals/
    components/
    hooks/
    store/
  clients/
  proposals/
components/
  ui/        (shadcn design system)
  solodesk/  (shared domain ui)
```

Each feature module owns its components, local state, query hooks, and services.

---

## Deliverables

When implementing any feature, deliver in this order:

1. API service definition (`src/services/` or `src/features/<name>/services/`).
2. Query/Mutation hooks using TanStack Query.
3. Zustand store updates (if global state is needed).
4. Feature components (presentational and container).
5. Route integration (`src/routes/`).

Generate production-grade code. No stubs, no TODOs, no placeholder logic. Use Vietnamese for user-facing UI text.