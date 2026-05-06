import { prisma } from "@/lib/prisma";
import { createEmbedding } from "@/lib/ai";

/**
 * NeuralIndexer handles chunking, embedding, and database insertion 
 * for pgvector-enabled RAG systems.
 */
export class NeuralIndexer {
  /**
   * Chunks text into smaller pieces for better embedding resolution
   */
  static chunkText(text: string, size = 512, overlap = 50): string[] {
    if (!text) return [];
    
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += size - overlap) {
      const chunk = words.slice(i, i + size).join(" ");
      if (chunk.trim()) {
        chunks.push(chunk);
      }
      if (i + size >= words.length) break;
    }
    
    return chunks;
  }

  /**
   * Core function to index a piece of content (web page, file, or raw text)
   */
  static async indexContent({
    content,
    title,
    url,
    metadata = {},
    chatbotId,
    dataSourceId,
    knowledgeSourceId,
  }: {
    content: string;
    title: string;
    url?: string;
    metadata?: any;
    chatbotId: string;
    dataSourceId?: string;
    knowledgeSourceId?: string;
  }) {
    if (!content || content.trim().length < 10) {
      console.warn(`[NeuralIndexer] Skipping thin content for ${url || title}`);
      return 0;
    }

    console.log(`[NeuralIndexer] Indexing: ${title} (${url || "Manual Source"})`);

    // 1. Chunking
    const chunks = this.chunkText(content);
    console.log(`[NeuralIndexer] Split into ${chunks.length} chunks`);

    let indexedCount = 0;

    for (const chunk of chunks) {
      try {
        // 2. Generate Embedding with Retry logic
        const embedding = await this.generateEmbeddingWithRetry(chunk);
        
        // 3. Prepare for pgvector
        const vectorStr = `[${embedding.join(",")}]`;
        const docId = `doc_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;

        // 4. Raw SQL Insertion (Prisma doesn't support vector type natively)
        await prisma.$executeRaw`
          INSERT INTO "Document" ("id", "dataSourceId", "knowledgeSourceId", "content", "url", "title", "metadata", "embedding", "createdAt", "updatedAt")
          VALUES (
            ${docId},
            ${dataSourceId || null},
            ${knowledgeSourceId || null},
            ${chunk},
            ${url || null},
            ${title},
            ${JSON.stringify(metadata)}::jsonb,
            ${vectorStr}::vector,
            NOW(),
            NOW()
          )
        `;
        
        indexedCount++;
      } catch (err) {
        console.error(`[NeuralIndexer] Failed to index chunk of ${title}:`, err);
        // Continue with next chunk instead of failing the whole job
      }
    }

    return indexedCount;
  }

  /**
   * Exponential backoff for embedding generation
   */
  private static async generateEmbeddingWithRetry(text: string, retries = 3): Promise<number[]> {
    for (let i = 0; i < retries; i++) {
      try {
        return await createEmbedding(text);
      } catch (err) {
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i) * 1000;
        console.warn(`[NeuralIndexer] Embedding failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("Failed after retries");
  }

  /**
   * Update status of data/knowledge source after indexing
   */
  static async updateStatus(id: string, type: "data" | "knowledge", status: "COMPLETED" | "ERROR", extra = {}) {
    if (type === "data") {
      await prisma.dataSource.update({
        where: { id },
        data: { status, ...extra }
      });
    } else {
      await prisma.knowledgeSource.update({
        where: { id },
        data: { status, ...extra }
      });
    }
  }
}
