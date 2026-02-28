# ADR-001: Use a Modular Monolith Architecture

**Date:** 22 February 2026  
**Status:** Accepted  
**Deciders:** Kasinath C A, Nicky Sheby, Sree Sai Madhurima, Balini

---

## Context

We needed to choose a top-level application architecture. The options broadly available were:

1. **Monolith** — Single deployable unit, no internal module boundaries enforced.
2. **Modular Monolith** — Single deployable unit, but with strongly enforced internal module boundaries (each module owns its own router, controller, service, and data access code).
3. **Microservices** — Multiple independently deployed processes communicating over a network.

The team is 4 students with varying experience levels. The application has 4 defined modules (User Access, Bookmarks, Collections + Tags, System Maintenance) that map cleanly to self-contained functional areas.

## Decision

Adopt a **Modular Monolith** architecture for the backend (`apps/api`).

Each module (`auth`, `bookmarks`, `collections`, `tags`, `search`, `annotations`, `system`) lives in its own directory under `apps/api/src/modules/` and is self-contained:

```
modules/
  bookmarks/
    bookmarks.router.ts
    bookmarks.controller.ts
    bookmarks.service.ts
    bookmarks.schemas.ts
    bookmarks.test.ts
```

Modules only communicate with each other by importing from another module's **service** layer — never directly from a controller or from the database layer.

## Alternatives Considered

| Option             | Why rejected                                                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plain Monolith** | No enforced boundaries makes it easy to create spaghetti dependencies. Hard to reason about and test as the codebase grows.                                                                                                                                                                  |
| **Microservices**  | Requires operating multiple services independently (each needs its own CI/CD, networking, logging). A 4-person team would spend more time on infrastructure than on features. Distributed systems add complexity (network failures, distributed transactions) with no benefit at this scale. |

## Consequences

**Positive:**

- Single `docker-compose up` command runs everything. No service discovery needed.
- Testing is straightforward — no mocking of HTTP between services.
- Module boundaries are enforced by code convention and code review, keeping the codebase maintainable.
- If traffic ever demands it, individual modules can be extracted into separate services — the boundaries are already there.

**Negative / trade-offs:**

- A single process crash takes down all modules simultaneously (acceptable at this scale; health checks and `restart: unless-stopped` in Docker mitigate this).
- All modules share a single database — cannot independently scale DB access per module (not a concern at academic scale).

## References

- [Building Microservices — Sam Newman (O'Reilly)](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [MINDPALACE_DEVELOPMENT_PLAN.md — Section 2.1](../MINDPALACE_DEVELOPMENT_PLAN.md)
