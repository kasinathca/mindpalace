-- Add versioned archive history for permanent copies (max 3 enforced in worker logic)
CREATE TABLE "permanent_copy_versions" (
  "id" TEXT NOT NULL,
  "raw_html" TEXT,
  "article_content" TEXT,
  "source_url" TEXT,
  "mime_type" TEXT NOT NULL DEFAULT 'text/html',
  "size_bytes" INTEGER,
  "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bookmark_id" TEXT NOT NULL,
  CONSTRAINT "permanent_copy_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "permanent_copy_versions"
ADD CONSTRAINT "permanent_copy_versions_bookmark_id_fkey"
FOREIGN KEY ("bookmark_id") REFERENCES "bookmarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "permanent_copy_versions_bookmark_id_captured_at_idx"
ON "permanent_copy_versions"("bookmark_id", "captured_at" DESC);
