# ADR-003: Use PostgreSQL Full-Text Search Instead of a Dedicated Search Engine

**Date:** 22 February 2026  
**Status:** Accepted  
**Deciders:** Kasinath C A, Nicky Sheby, Sree Sai Madhurima, Balini

---

## Context

The SRS requires users to be able to search their bookmark library by keyword across: URL, title, description, and (for bookmarks with permanent copies) the full article text. The search results should be ranked by relevance.

The main options evaluated:

1. **PostgreSQL full-text search** — Built into PostgreSQL using `tsvector` / `tsquery`. Supported natively by the primary database already in use.
2. **Meilisearch** — Open-source, fast search engine. Runs as a separate service.
3. **Elasticsearch / OpenSearch** — Industry-standard search engine. Runs as a separate service.

## Decision

Use **PostgreSQL's built-in full-text search** (`tsvector` / `tsquery` / GIN index).

A `search_vector` column (type `tsvector`) is added to the `bookmarks` table. A database trigger automatically updates this column on every INSERT or UPDATE by combining the `title` (weight A), `description` (weight B), `domain` (weight C), and `url` (weight D) fields. A GIN index on `search_vector` enables sub-millisecond lookups.

Search queries use `ts_rank_cd` for relevance ordering and `ts_headline` for result highlighting.

## Alternatives Considered

| Option                       | Why rejected                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Meilisearch**              | Would require operating a third service alongside PostgreSQL and Redis. During development, every team member's machine would need Meilisearch running. Adds complexity to the Docker Compose setup, CI pipeline, and production deployment — for a feature that PostgreSQL can handle natively. |
| **Elasticsearch/OpenSearch** | Requires ~1 GB of RAM minimum. Impractical on student development machines. Adds significant operational complexity. Complete overkill for a library of < 100,000 bookmarks.                                                                                                                     |
| **ILIKE / pattern matching** | `WHERE title ILIKE '%keyword%'` does not use indexes, forces a full table scan, and does not support relevance ranking or multi-word queries. Unacceptable for performance requirements.                                                                                                         |

## Consequences

**Positive:**

- No additional service to run, configure, or maintain.
- PostgreSQL FTS satisfies the stated NFR-PERF-2 requirement: search results in < 1 second for a library of 10,000 bookmarks.
- The GIN index keeps search performance O(log n) as the library grows.
- Search stays transactionally consistent with the database — no sync lag between a new bookmark being saved and it appearing in search results.

**Negative / trade-offs:**

- Does not support fuzzy/typo-tolerant search natively (e.g., "macine learning" won't match "machine learning"). Workaround: prefix search via `:*` operator covers common cases.
- If library size exceeds ~1,000,000 bookmarks across all users, a dedicated search service would be more appropriate. Not a concern at this scale.
- The `SearchService` is written against a clean interface — swapping PostgreSQL FTS for Meilisearch in the future requires only changes to `apps/api/src/modules/search/search.service.ts`.

## References

- [PostgreSQL Full Text Search Documentation](https://www.postgresql.org/docs/16/textsearch.html)
- [mindpalace-development-plan.md — Section 12](../docs/planning/mindpalace-development-plan.md)
