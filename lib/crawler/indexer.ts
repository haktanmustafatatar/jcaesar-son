import { prisma } from "@/lib/prisma";
import { createEmbedding, createEmbeddings } from "@/lib/ai";

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
    // Filter out very short chunks
    const validChunks = chunks.filter(c => c.trim().length > 20);
    if (validChunks.length === 0) return 0;
    
    console.log(`[NeuralIndexer] Split into ${validChunks.length} valid chunks`);

    let indexedCount = 0;
    const BATCH_SIZE = 20;

    for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
      const batchChunks = validChunks.slice(i, i + BATCH_SIZE);
      
      try {
        // 2. Generate Batch Embeddings with Retry logic
        const embeddings = await this.generateBatchEmbeddingsWithRetry(batchChunks);
        
        // 3. Prepare queries for transaction
        const queries = batchChunks.map((chunk, idx) => {
          const vectorStr = `[${embeddings[idx].join(",")}]`;
          const docId = `doc_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
          
          return prisma.$executeRaw`
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
        });

        // 4. Batch Insertion
        await prisma.$transaction(queries);
        indexedCount += batchChunks.length;
      } catch (err) {
        console.error(`[NeuralIndexer] Failed to index batch of ${title}:`, err);
        // Continue with next batch instead of failing the whole job
      }
    }

    return indexedCount;
  }

  /**
   * Exponential backoff for batch embedding generation
   */
  private static async generateBatchEmbeddingsWithRetry(texts: string[], retries = 3): Promise<number[][]> {
    for (let i = 0; i < retries; i++) {
      try {
        return await createEmbeddings(texts);
      } catch (err) {
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i) * 1000;
        console.warn(`[NeuralIndexer] Batch embedding failed, retrying in ${delay}ms...`);
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
      const source = await prisma.dataSource.update({
        where: { id },
        data: { status, ...extra }
      });
      
      // Auto-activate chatbot if it was in TRAINING status
      if (status === "COMPLETED") {
        await prisma.chatbot.updateMany({
          where: { 
            id: source.chatbotId,
            status: "TRAINING" 
          },
          data: { status: "ACTIVE" }
        });
      }
    } else {
      const source = await prisma.knowledgeSource.update({
        where: { id },
        data: { status, ...extra }
      });

      // Knowledge sources might also activate chatbot or just update its intelligence
      if (status === "COMPLETED" && source.chatbotId) {
        await prisma.chatbot.updateMany({
          where: { 
            id: source.chatbotId,
            status: "TRAINING" 
          },
          data: { status: "ACTIVE" }
        });
      }
    }
  }
}
