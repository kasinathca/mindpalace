-- Enforce case-insensitive tag uniqueness at DB level.
CREATE UNIQUE INDEX IF NOT EXISTS "tags_userId_name_lower_key"
ON "tags" ("userId", LOWER("name"));

-- Align bookmark->collection FK delete policy with Restrict semantics.
ALTER TABLE "bookmarks"
DROP CONSTRAINT IF EXISTS "bookmarks_collectionId_fkey";

ALTER TABLE "bookmarks"
ADD CONSTRAINT "bookmarks_collectionId_fkey"
FOREIGN KEY ("collectionId") REFERENCES "collections"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
