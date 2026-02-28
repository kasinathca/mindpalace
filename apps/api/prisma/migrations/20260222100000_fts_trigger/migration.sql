-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Full-Text Search — trigger, GIN index, and back-fill
--
-- The `searchVector` tsvector column already exists from the init migration.
-- This migration:
--   1. Creates the PL/pgSQL trigger function
--   2. Attaches a BEFORE INSERT OR UPDATE trigger to the bookmarks table
--   3. Creates the GIN index for fast ts_rank / tsquery lookups
--   4. Back-fills searchVector for any existing rows
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Trigger function ───────────────────────────────────────────────────────
--
-- Weight rationale:
--   A → title      (most relevant)
--   B → description
--   C → notes
--   D → url        (least relevant — still useful for domain search)

CREATE OR REPLACE FUNCTION update_bookmark_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.url, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Trigger ────────────────────────────────────────────────────────────────
--
-- BEFORE trigger so NEW is mutated before the row is written.
-- Only fires when the indexed columns actually change (saves I/O on unrelated
-- updates like lastCheckedAt flips).

DROP TRIGGER IF EXISTS bookmarks_search_vector_trigger ON bookmarks;

CREATE TRIGGER bookmarks_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, notes, url
  ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_bookmark_search_vector();

-- ── 3. GIN index ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS bookmarks_search_vector_gin
  ON bookmarks
  USING GIN ("searchVector");

-- ── 4. Back-fill existing rows ────────────────────────────────────────────────
--
-- The trigger only fires on future writes; existing rows need a one-time UPDATE.

UPDATE bookmarks
SET "searchVector" =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(notes, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(url, '')), 'D');
