"use server";

import { logAudit } from "@/lib/audit";
import {
  getAuditLogs as storeGetAuditLogs,
  getCurrentProfile as storeGetCurrentProfile,
  getPatientSummaryData,
  DEFAULT_PATIENT_ID,
} from "@/lib/data/mock-store";

export async function getAuditLogs(limit = 50) {
  return storeGetAuditLogs(limit);
}

export async function getCurrentProfile() {
  return storeGetCurrentProfile();
}

export async function getPatientSummary() {
  const summary = getPatientSummaryData(DEFAULT_PATIENT_ID);
  if (!summary.patient) return null;

  await logAudit({
    action: "READ",
    entity: "Patient",
    entityId: DEFAULT_PATIENT_ID,
    metadata: { portal: "patient_summary" },
  });

  return summary;
}
