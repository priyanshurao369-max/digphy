import { headers } from "next/headers";
import { addAuditLog, CLINICIAN_ID } from "@/lib/data/mock-store";
import type { AuditAction, AuditEntity } from "@/types";

interface AuditParams {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit({
  action,
  entity,
  entityId,
  metadata,
}: AuditParams): Promise<void> {
  let ip = "unknown";
  try {
    const headersList = await headers();
    ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
  } catch {
    // headers() unavailable (e.g. called outside request scope) — ignore
  }

  addAuditLog({
    user_id: CLINICIAN_ID,
    action,
    entity,
    entity_id: entityId,
    ip_address: ip,
    metadata: metadata ?? null,
  });
}
