# Commit Rules

The canonical commit and branch convention for this repository. Read before every commit.

## Commit Scope

One logical change per commit. Never bundle unrelated changes.

## Branch Per Purpose (REQUIRED)

Before committing, check the current branch. If on `main`/default, you **MUST** create a new
branch named `<type>/<scope-or-purpose>` and commit there. Never commit directly to `main`.

```
feat/deals-kanban
test/setup-vitest-playwright
fix/ui-modal-overflow
```

## Message Format

`<type>(<scope>): <short summary>`

```
feat(deals): add kanban board
fix(ui): correct modal overflow
```

- **Allowed types:** `feat` · `fix` · `docs` · `refactor` · `test` · `chore`
- **Scope:** the feature name (`deals`, `clients`, `ui`, `core`, `router`).

## Never Commit

- Secrets, `.env` files.
- `node_modules/`.
