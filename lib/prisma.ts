import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool tuning:
// - connection_limit: max simultaneous DB connections per Prisma instance
//   (PgBouncer handles the actual pooling, so keep this low: 10-20)
// - pool_timeout: seconds to wait for a free connection before error
const buildDatabaseUrl = () => {
  const base = process.env.DATABASE_URL || "";
  if (!base || base.includes("connection_limit")) return base;
  const separator = base.includes("?") ? "&" : "?";
  const limit = process.env.PRISMA_CONNECTION_LIMIT || "10";
  const timeout = process.env.PRISMA_POOL_TIMEOUT || "10";
  return `${base}${separator}connection_limit=${limit}&pool_timeout=${timeout}`;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
