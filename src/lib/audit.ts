import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type AuditPayload = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: Prisma.JsonValue | null;
  after?: Prisma.JsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function createAuditLog(payload: AuditPayload) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: payload.actorId ?? null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        before: payload.before ?? null,
        after: payload.after ?? null,
        ip: payload.ip ?? null,
        userAgent: payload.userAgent ?? null,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[audit] failed to write audit log", error);
    }
  }
}
