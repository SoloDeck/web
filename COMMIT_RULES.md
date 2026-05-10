# Commit Message Guidelines

## Purpose

This document outlines the commit message conventions for the Rebox project. Following these guidelines ensures a consistent and meaningful commit history that is easy to read and understand.

## Commit Message Format

Each commit message consists of a **header**, a **body**, and a **footer**. The header has a special format that includes a **type**, an optional **scope**, and a **subject**:

``` bash
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

## Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Other changes that don't modify src or test files
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **revert**: Reverts a previous commit

## Scope

The scope is optional and provides additional contextual information. It should be a single word that describes the module or component affected:

Examples:

- `auth` - Authentication related changes
- `api` - API service changes
- `ui` - User interface changes
- `admin` - Admin dashboard changes
- `config` - Configuration changes

## Subject

The subject contains a succinct description of the change. It should:

- Use imperative, present tense: "change" not "changed" nor "changes"
- Not capitalize the first letter
- Not end with a period

## Body

The body should include the motivation for the change and contrast this with previous behavior. It should:

- Use imperative, present tense
- Be at most 100 characters per line
- Explain the "what" and "why", not the "how"

## Footer

The footer should contain any information about Breaking Changes and is also the place to reference GitHub issues that this commit closes.

Breaking Changes should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## Examples

### Simple feature addition

``` bash
feat(auth): add user registration functionality

- Implement registration form with validation
- Add API call for user registration
- Handle success and error responses
```

### Bug fix

``` bash
fix(api): resolve token refresh issue

The token refresh mechanism was not properly handling
expired refresh tokens, causing authentication failures.
This fix adds proper error handling for refresh token
expiration and redirects users to login.
```

### Refactoring 

``` bash
refactor(admin): update cup management components to use hooks

Convert class components to functional components
and implement custom hooks for better code organization.
```

### Breaking change

``` bash
feat(api): remove deprecated user endpoints

BREAKING CHANGE: The old user endpoints have been removed.
Use the new endpoints as specified in the API documentation.
```

## Common prefixes

When including multiple related changes in a single commit, you can use these common prefixes:

- `WIP` - Work in progress (avoid in final commits)
- `Squash` - Changes intended to be squashed
- `Refs` - References an issue or pull request

## Additional Guidelines

- Keep commits focused on a single change or related set of changes
- Write commit messages that complete the sentence "This commit will..."
- Use the body to explain the "why" when the "what" is not self-evident
- Reference issues using `#issue-number` in the footer
- Avoid merging commits that don't follow these guidelines
