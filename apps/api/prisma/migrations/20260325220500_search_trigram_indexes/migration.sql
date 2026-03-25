-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Search typo tolerance with pg_trgm indexes
--
-- Adds trigram support and expression indexes used by search ranking/predicate:
--   similarity(LOWER(title), LOWER($query))
--   similarity(LOWER(url), LOWER($query))
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS bookmarks_title_trgm_gin
  ON bookmarks
  USING GIN (LOWER(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS bookmarks_url_trgm_gin
  ON bookmarks
  USING GIN (LOWER(url) gin_trgm_ops);
