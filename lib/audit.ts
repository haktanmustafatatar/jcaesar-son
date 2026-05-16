import { prisma } from "./prisma";

export interface AuditLogOptions {
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: any;
}

export async function createAuditLog(options: AuditLogOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        userEmail: options.userEmail,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        metadata: options.metadata || {},
      },
    });
  } catch (error) {
    console.error("[AuditLog] Failed to create log:", error);
  }
}
