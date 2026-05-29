import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Pooler Supabase (pgbouncer, transaction mode) khiến interactive transaction
    // dễ timeout với default maxWait=2s/timeout=5s. Nới rộng để tránh lỗi P2028.
    transactionOptions: {
      maxWait: 15000,
      timeout: 30000,
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
