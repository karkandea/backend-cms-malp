import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const PRISMA_SCHEMA_MISSING_CODES = new Set(["P2010", "P2021"]);

export class PrismaSchemaNotReadyError extends Error {
  constructor(message = "Database schema is not initialized. Run migrations and seed before using the app.") {
    super(message);
    this.name = "PrismaSchemaNotReadyError";
  }
}

export function isPrismaClientKnownRequestError(error: unknown): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError;
}

export function isPrismaSchemaNotReadyError(error: unknown): error is PrismaSchemaNotReadyError {
  return error instanceof PrismaSchemaNotReadyError;
}

export function mapPrismaSchemaError(error: unknown): PrismaSchemaNotReadyError | null {
  if (isPrismaClientKnownRequestError(error) && PRISMA_SCHEMA_MISSING_CODES.has(error.code)) {
    return new PrismaSchemaNotReadyError();
  }
  return null;
}

export function throwIfPrismaSchemaMissing(error: unknown): never {
  const mapped = mapPrismaSchemaError(error);
  if (mapped) {
    throw mapped;
  }
  throw error;
}
