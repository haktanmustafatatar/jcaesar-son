import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Database Optimization...");

  try {
    // 1. Ensure pgvector extension is enabled
    console.log("📡 Enabling pgvector extension...");
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // 2. Create HNSW index for Vector Search
    // This is the key for scaling to 1000+ businesses
    console.log("🧠 Creating HNSW vector index (this may take a few seconds)...");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS document_embedding_hnsw_idx 
      ON "Document" 
      USING hnsw (embedding vector_cosine_ops);
    `);

    // 3. Create GIN index for Turkish Full Text Search
    console.log("🔍 Creating GIN index for Turkish text search...");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS document_content_fts_idx 
      ON "Document" 
      USING gin(to_tsvector('turkish', content));
    `);

    console.log("✅ Database optimization complete! Your system is now ready for high-scale production.");
  } catch (error) {
    console.error("❌ Optimization failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
