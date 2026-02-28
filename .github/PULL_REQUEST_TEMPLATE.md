## What does this PR do?

<!-- One sentence summary of the change. -->

## Why is this change needed?

<!-- Link the related issue/task, or briefly explain the context. -->

Closes #<!-- issue number -->

## Type of change

- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `refactor` — Refactor (no feature / no bug fix)
- [ ] `test` — Tests only
- [ ] `docs` — Documentation only
- [ ] `chore` — Build, CI, or dependency update
- [ ] `perf` — Performance improvement
- [ ] `security` — Security fix

## Changes made

<!-- Bullet list of specific files / modules changed and what was done. -->

-
-

## How to test this locally

<!-- Step-by-step instructions for the reviewer to test manually. -->

1.
2.

## Definition of Done checklist

**Code Quality**

- [ ] `pnpm run type-check` passes with zero errors
- [ ] `pnpm run lint` passes with zero errors
- [ ] No `console.log`, `any` types, or `// TODO` in changed files
- [ ] All functions have explicit TypeScript return type annotations

**Testing**

- [ ] Unit tests written for all new Service layer business logic
- [ ] All previously passing tests still pass
- [ ] Integration test written for every new API endpoint
- [ ] ≥ 80% coverage on changed files

**Review**

- [ ] CI pipeline is fully green
- [ ] At least 1 team member has been requested for review

**Functionality**

- [ ] Works in light and dark theme
- [ ] Works on mobile (375px), tablet (768px), desktop (1440px)
- [ ] Error and loading states are handled
- [ ] Keyboard navigation works

**Security** _(if applicable)_

- [ ] Returns `401` without valid JWT
- [ ] Returns `403` for other users' resources
- [ ] Request body validated with Zod
- [ ] No sensitive data in responses or logs

## Screenshots (if UI change)

<!-- Before / after screenshots or screen recording. Delete this section if not applicable. -->
