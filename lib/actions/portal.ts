"use server";

import { logAudit } from "@/lib/audit";
import {
  getAuditLogs as storeGetAuditLogs,
  getCurrentProfile as storeGetCurrentProfile,
  getPatientSummaryData,
  getPatientAccounts as storeGetPatientAccounts,
  DEFAULT_PATIENT_ID,
} from "@/lib/data/mock-store";

export async function getAuditLogs(limit = 50) {
  return storeGetAuditLogs(limit);
}

export async function getCurrentProfile() {
  return storeGetCurrentProfile();
}

export async function getPatientAccounts() {
  return storeGetPatientAccounts();
}

export async function getPatientSummary(patientId: string = DEFAULT_PATIENT_ID) {
  const summary = getPatientSummaryData(patientId);
  if (!summary.patient) return null;

  await logAudit({
    action: "READ",
    entity: "Patient",
    entityId: patientId,
    metadata: { portal: "patient_summary" },
  });

  return summary;
}
