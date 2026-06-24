import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting index creation...");
  
  // Enable vector extension if not present
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("✓ pgvector extension verified/enabled.");
  } catch (err) {
    console.error("Error enabling pgvector extension:", err);
  }

  // Alter embedding column type to vector(1536)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Document" ALTER COLUMN embedding TYPE vector(1536);`);
    console.log("✓ Document embedding column type altered to vector(1536).");
  } catch (err) {
    console.error("Error altering embedding column type:", err);
  }

  // Create FTS GIN index for Turkish search
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS document_fts_tr_idx ON "Document" USING gin(to_tsvector('turkish', "content"));`
    );
    console.log("✓ Turkish Full-Text Search GIN index verified/created.");
  } catch (err) {
    console.error("Error creating Turkish FTS GIN index:", err);
  }

  // Create pgvector HNSW index for embedding cosine similarity
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS document_embedding_hnsw_idx ON "Document" USING hnsw (embedding vector_cosine_ops);`
    );
    console.log("✓ HNSW vector embedding index verified/created.");
  } catch (err) {
    console.error("Error creating HNSW vector index:", err);
  }

  console.log("Index creation process finished.");
}

main()
  .catch((e) => {
    console.error("Failed to run index script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
