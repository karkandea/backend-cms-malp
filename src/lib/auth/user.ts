import argon2 from "argon2";
import { prisma } from "../prisma";
import { PrismaSchemaNotReadyError, throwIfPrismaSchemaMissing } from "../errors";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function verifyCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return null;
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      return null;
    }

    return user;
  } catch (error) {
    throwIfPrismaSchemaMissing(error);
    throw error;
  }
}
