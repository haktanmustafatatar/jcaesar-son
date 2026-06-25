-- Upgrade embedding column from vector(1536) to vector(3072)
-- Required for text-embedding-3-large (OpenAI) upgrade
-- WARNING: Existing embeddings are incompatible and must be re-indexed via scripts/reindex-embeddings.ts

ALTER TABLE "Document" ALTER COLUMN "embedding" TYPE vector(3072)
  USING NULL;
