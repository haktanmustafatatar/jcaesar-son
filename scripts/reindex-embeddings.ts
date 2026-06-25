/**
 * Re-index all Documents with new text-embedding-3-large (3072-dim) embeddings.
 * Replaces stale vector(1536) embeddings after the model upgrade.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/reindex-embeddings.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/reindex-embeddings.ts --dry-run
 *   npx ts-node --project tsconfig.scripts.json scripts/reindex-embeddings.ts --batch-size=50
 *
 * Checkpointing: progress is saved to /tmp/reindex-checkpoint.json so the
 * script can be interrupted and resumed without re-processing completed docs.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHECKPOINT_FILE = "/tmp/reindex-checkpoint.json";
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIM = 3072;

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const BATCH_SIZE = parseInt(
  args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ?? "100",
  10
);

interface Checkpoint {
  lastProcessedId: string | null;
  processed: number;
  errors: number;
  startedAt: string;
}

function loadCheckpoint(): Checkpoint {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const raw = fs.readFileSync(CHECKPOINT_FILE, "utf-8");
      const cp = JSON.parse(raw) as Checkpoint;
      console.log(
        `[Checkpoint] Resuming from doc after ID: ${cp.lastProcessedId ?? "start"} (${cp.processed} already done)`
      );
      return cp;
    } catch {
      // Corrupt checkpoint — start fresh
    }
  }
  return { lastProcessedId: null, processed: 0, errors: 0, startedAt: new Date().toISOString() };
}

function saveCheckpoint(cp: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      });
      return response.data.map((d) => d.embedding);
    } catch (err: any) {
      if (attempt === 2) throw err;
      const delay = Math.pow(2, attempt) * 1500;
      console.warn(`[Embed] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Embed failed after 3 attempts");
}

async function main() {
  console.log("=== Embedding Re-index Script ===");
  console.log(`Model: ${EMBEDDING_MODEL} (${EMBEDDING_DIM} dims)`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log();

  const totalCount = await prisma.document.count();
  console.log(`Total documents: ${totalCount}`);

  const cp = loadCheckpoint();
  let { lastProcessedId, processed, errors } = cp;

  let hasMore = true;

  while (hasMore) {
    const batch = await prisma.document.findMany({
      take: BATCH_SIZE,
      ...(lastProcessedId
        ? { skip: 1, cursor: { id: lastProcessedId } }
        : {}),
      orderBy: { id: "asc" },
      select: { id: true, content: true },
    });

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    console.log(
      `[Batch] Processing ${batch.length} docs (offset ~${processed}, last ID: ${batch[batch.length - 1].id})`
    );

    if (!DRY_RUN) {
      try {
        const texts = batch.map((d) => d.content.slice(0, 8000)); // token safety cap
        const embeddings = await embedBatch(texts);

        // Update each doc individually (pgvector requires raw SQL for vector type)
        const updates = batch.map((doc, i) => {
          const vectorStr = `[${embeddings[i].join(",")}]`;
          return prisma.$executeRaw(
            Prisma.sql`UPDATE "Document" SET "embedding" = ${vectorStr}::vector, "updatedAt" = NOW() WHERE "id" = ${doc.id}`
          );
        });

        await prisma.$transaction(updates);
        processed += batch.length;
      } catch (err) {
        console.error(`[Batch] Error processing batch:`, err);
        errors += batch.length;
        // Don't advance checkpoint — will retry this batch next run
        saveCheckpoint({ lastProcessedId, processed, errors, startedAt: cp.startedAt });
        console.error("[Batch] Checkpoint saved. Fix the error and re-run to retry.");
        process.exit(1);
      }
    } else {
      console.log(`[DryRun] Would embed and update ${batch.length} docs`);
      processed += batch.length;
    }

    lastProcessedId = batch[batch.length - 1].id;
    saveCheckpoint({ lastProcessedId, processed, errors, startedAt: cp.startedAt });

    const pct = ((processed / totalCount) * 100).toFixed(1);
    console.log(`[Progress] ${processed}/${totalCount} (${pct}%) | errors: ${errors}`);
  }

  console.log();
  console.log("=== Re-index Complete ===");
  console.log(`Processed: ${processed}`);
  console.log(`Errors:    ${errors}`);
  console.log(`Duration:  ${Math.round((Date.now() - new Date(cp.startedAt).getTime()) / 1000)}s`);

  if (!DRY_RUN && errors === 0) {
    // Clean up checkpoint on full success
    if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);
    console.log("[Checkpoint] Removed (all done).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
