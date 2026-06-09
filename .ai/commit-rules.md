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

## Version Bump (REQUIRED before a deployable change is done)

Once tests pass and the change is deployable, you **MUST** bump the application version in
`package.json` (`"version": "X.Y.Z"`, semver) as part of the same change:

- `fix` → patch (`0.0.0` → `0.0.1`)
- `feat` → minor (`0.0.0` → `0.1.0`)
- breaking change → major (`0.0.0` → `1.0.0`)

Pure `docs`/`test`/`chore`/`refactor` changes that are not independently deployable do not require a
bump. Commit the bump as `chore(version): bump to X.Y.Z` (or fold it into the deployable commit).
