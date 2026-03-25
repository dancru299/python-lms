import { Prisma } from "@prisma/client";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /can't reach database server|failed to connect|connection timed out|server has closed the connection/i.test(
    error.message
  );
}

export async function runDatabaseOperation<T>(
  operation: () => Promise<T>,
  attempts = 2
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isDatabaseUnavailableError(error) || attempt === attempts) {
        throw error;
      }

      await wait(250 * attempt);
    }
  }

  throw lastError;
}
