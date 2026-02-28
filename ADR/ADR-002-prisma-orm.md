# ADR-002: Use Prisma ORM for Database Access

**Date:** 22 February 2026  
**Status:** Accepted  
**Deciders:** Kasinath C A, Nicky Sheby, Sree Sai Madhurima, Balini

---

## Context

The backend needs to communicate with a PostgreSQL database. The approach for doing this falls into three categories:

1. **Raw SQL** — Write SQL queries directly in TypeScript using a driver like `pg`.
2. **Query Builder** — Use a library like `Knex.js` that constructs SQL programmatically.
3. **ORM** — Use an Object-Relational Mapper that provides a type-safe abstraction over SQL.

Within ORMs, the main candidates for Node.js + TypeScript were:

- **Prisma** — Schema-first, generates a fully type-safe client from a declarative schema file.
- **TypeORM** — Decorator-based, closer to Java Hibernate style.
- **Drizzle ORM** — Lightweight, schema defined in TypeScript code.

## Decision

Use **Prisma** (`prisma` CLI + `@prisma/client`) for all database access.

The database schema is defined once in `apps/api/prisma/schema.prisma`. Prisma generates a fully type-safe client at build time. Migrations are managed by `prisma migrate`.

**Clarification:** Only the open-source `prisma` and `@prisma/client` npm packages are used. Prisma's paid cloud products (Prisma Postgres, Prisma Data Platform) are not used.

## Alternatives Considered

| Option             | Why rejected                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Raw SQL (`pg`)** | No type safety. Every query returns `any`. Column renames require manual updates across all query files. Prone to typos causing runtime errors only.                                             |
| **Knex.js**        | Better than raw SQL but still not type-safe by default. Requires additional tooling to generate TypeScript types. More boilerplate.                                                              |
| **TypeORM**        | Decorator-based approach mixes metadata into domain models (violating separation of concerns). Known for instability with complex TypeScript strict settings. Poor handling of nullable columns. |
| **Drizzle ORM**    | Strong option, but younger ecosystem and less documentation available — higher risk for a student team.                                                                                          |

## Consequences

**Positive:**

- The generated `PrismaClient` provides complete type safety for all queries — column names, types, and relation traversal are all type-checked at compile time.
- `prisma migrate dev` tracks schema changes as SQL migration files that are committed to Git — full database change history.
- The `schema.prisma` file serves as the single source of truth for the database structure — readable by all team members regardless of SQL experience.
- `prisma db seed` provides an easy way to populate local development data.
- Switching database providers (e.g., from PostgreSQL to MySQL) requires only a one-line change in `schema.prisma` — the application code is completely portable.

**Negative / trade-offs:**

- Complex queries (e.g., full-text search with ranking, recursive CTEs) cannot be expressed purely through the Prisma client and require `prisma.$queryRaw`. These are isolated to the service layer.
- The generated `PrismaClient` is a large dependency. Cold-start time is slightly higher than a query builder. Acceptable for this use case.

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [MINDPALACE_DEVELOPMENT_PLAN.md — Section 4](../MINDPALACE_DEVELOPMENT_PLAN.md)
