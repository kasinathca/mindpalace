# Contributing to Mind Palace

Thank you for contributing. Please read this guide fully before opening a pull request.

---

## Table of Contents

1. [Development Setup](#1-development-setup)
2. [Branching Strategy](#2-branching-strategy)
3. [Commit Messages](#3-commit-messages)
4. [Pull Request Process](#4-pull-request-process)
5. [Definition of Done](#5-definition-of-done)
6. [Code Style](#6-code-style)

---

## 1. Development Setup

Follow the **Quick Start** section in [README.md](./README.md) to get your local environment running.

Before you start coding:

```powershell
# Ensure you are on the latest develop branch
git checkout develop
git pull origin develop

# Create your feature branch (see naming rules below)
git checkout -b feature/your-feature-name
```

---

## 2. Branching Strategy

We use a simplified **GitHub Flow** with a `develop` integration branch.

### Protected Branches

| Branch    | Rule                                                             |
| --------- | ---------------------------------------------------------------- |
| `main`    | Production-ready only. Merges from `develop` after full testing. |
| `develop` | Integration branch. All feature branches merge here.             |

### Branch Naming

```
<type>/<short-description>
```

| Type        | When to use                            |
| ----------- | -------------------------------------- |
| `feature/`  | New functionality                      |
| `bugfix/`   | Fixing a bug on `develop`              |
| `hotfix/`   | Urgent fix applied directly to `main`  |
| `refactor/` | Code restructure — no behaviour change |
| `test/`     | Adding or fixing tests only            |
| `docs/`     | Documentation only                     |
| `chore/`    | Build system, CI, dependency updates   |

**Examples:**

```
feature/inc1-auth-module
feature/inc1-add-bookmark-api
bugfix/password-reset-token-expiry
chore/upgrade-prisma-5.12
```

---

## 3. Commit Messages

We follow the **[Conventional Commits](https://www.conventionalcommits.org/)** specification. Every commit message must follow this format:

```
<type>(<scope>): <short description in lowercase>

[optional body — explain WHY, not WHAT]

[optional footer — e.g., Closes #42]
```

### Allowed Types

| Type       | When to use                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `test`     | Adding or updating tests                 |
| `docs`     | Documentation only                       |
| `refactor` | Refactor (no feature / no bug fix)       |
| `style`    | Formatting, whitespace (no logic change) |
| `chore`    | Build, CI, dependency updates            |
| `perf`     | Performance improvement                  |

### Allowed Scopes

`auth`, `bookmarks`, `collections`, `tags`, `search`, `annotations`, `workers`, `db`, `ci`, `deps`, `config`

### Good Examples

```
feat(bookmarks): add duplicate URL detection on create
fix(auth): prevent refresh token from being stored in localStorage
test(collections): add integration tests for recursive delete
chore(deps): upgrade prisma to 5.12.0
docs(readme): update quick start commands for windows
```

### Bad Examples (do not do this)

```
fixed stuff
WIP
update
feat: added new feature
```

---

## 4. Pull Request Process

1. Ensure your branch is up to date with `develop` before opening the PR:

   ```powershell
   git fetch origin
   git rebase origin/develop
   ```

2. Run all checks locally **before** pushing:

   ```powershell
   pnpm run lint
   pnpm run type-check
   pnpm run test:unit
   ```

3. Open the PR against `develop` (never directly against `main`).

4. Fill in the **pull request template** completely — leave no section blank.

5. The CI pipeline must be **fully green** before requesting review.

6. At least **one other team member** must approve the PR before it is merged.

7. Use **Squash and Merge** when merging. Delete the branch after.

---

## 5. Definition of Done

A task is not done until ALL of these are checked:

**Code Quality**

- [ ] `pnpm run type-check` passes with zero errors
- [ ] `pnpm run lint` passes with zero errors
- [ ] No `console.log`, `any` types, or `// TODO` comments in changed files
- [ ] All functions have explicit TypeScript return type annotations

**Testing**

- [ ] Unit tests written for all new Service layer logic
- [ ] All previously passing tests still pass
- [ ] Integration test written for every new API endpoint
- [ ] ≥ 80% test coverage on changed files

**Review**

- [ ] PR template fully completed
- [ ] CI pipeline is green (all jobs pass)
- [ ] At least 1 team member has approved

**Functionality**

- [ ] Feature works in both light and dark theme
- [ ] Feature works on mobile (375px), tablet (768px), and desktop (1440px)
- [ ] Error states show meaningful messages
- [ ] Loading states appear for operations taking > 300ms
- [ ] Keyboard navigation works without a mouse

**Security** _(for any endpoint handling user data)_

- [ ] Endpoint returns `401` if no valid JWT is provided
- [ ] Endpoint returns `403` if accessing another user's resource
- [ ] Request body validated through a Zod schema
- [ ] No sensitive data in response bodies or log output

---

## 6. Code Style

Code style is enforced automatically — the pre-commit hook will fix and block commits that don't conform.

- **Formatter:** Prettier — run `pnpm run format` to format manually
- **Linter:** ESLint — run `pnpm run lint` to check; `pnpm run lint:fix` to auto-fix
- **No `any`:** TypeScript `any` type is banned by ESLint rule
- **No `console.log`:** Use the `logger` from `apps/api/src/lib/logger.ts` instead
- **Env variables:** Never access `process.env` directly — always use `apps/api/src/config/env.ts`
