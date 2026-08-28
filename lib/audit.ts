import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    entity,
    entity_id: entityId,
    ip_address: ip,
    metadata: metadata ?? null,
  });
}
