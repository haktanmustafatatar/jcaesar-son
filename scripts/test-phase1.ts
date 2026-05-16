import { prisma } from "../lib/prisma";
import { Redis } from "ioredis";
import { Queue } from "bullmq";

async function runTests() {
  console.log("🔍 Starting Phase 1 Integration Tests...");
  let results = {
    database: false,
    redis: false,
    queues: false,
    auditLogs: false
  };

  // 1. Test Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database: Connection stable.");
    results.database = true;
  } catch (e) {
    console.error("❌ Database: Connection failed!", e);
  }

  // 2. Test Redis
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
  try {
    await redis.ping();
    console.log("✅ Redis: Cluster reachable.");
    results.redis = true;
  } catch (e) {
    console.error("❌ Redis: Cluster unreachable!", e);
  } finally {
    await redis.quit();
  }

  // 3. Test BullMQ Queues
  try {
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const testQueue = new Queue("crawl-queue", { connection });
    const counts = await testQueue.getJobCounts();
    console.log("✅ Queues: BullMQ structure verified.", counts);
    results.queues = true;
    await connection.quit();
  } catch (e) {
    console.error("❌ Queues: BullMQ initialization failed!", e);
  }

  // 4. Test Audit Log Storage
  try {
    const logCount = await prisma.auditLog.count();
    console.log(`✅ Audit: Storage active. Found ${logCount} existing logs.`);
    results.auditLogs = true;
  } catch (e) {
    console.error("❌ Audit: Storage check failed!", e);
  }

  console.log("\n--- TEST SUMMARY ---");
  console.table(results);

  if (Object.values(results).every(v => v === true)) {
    console.log("\n🚀 ALL SYSTEMS OPERATIONAL. Phase 1 is verified.");
    process.exit(0);
  } else {
    console.log("\n⚠️ SOME TESTS FAILED. Please check the logs above.");
    process.exit(1);
  }
}

runTests();
