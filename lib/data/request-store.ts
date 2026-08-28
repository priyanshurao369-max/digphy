/**
 * Request-scoped patient persistence for the DigPhy demo.
 *
 * The in-memory mock store (`mock-store.ts`) only survives within a single
 * Node.js process, so it breaks on Vercel's serverless functions where each
 * request may land on a different instance. A patient you create in instance A
 * simply isn't visible to the redirected `/patients/[id]` page served by
 * instance B → 404.
 *
 * As a zero-infrastructure fix, we mirror each created/updated patient into a
 * browser cookie (`digphy_p_<uuid>`). Cookies travel with every request, so any
 * serverless instance can re-read patients that were created on another one.
 *
 * NOTE: This is a demo-only workaround — data is PHI visible in the browser and
 * bounded by cookie size limits. Swap in a real DB (Supabase/Postgres or Vercel
 * KV) for production.
 */
import { cookies } from "next/headers";
import {
  getAllPatients,
  getPatientById,
} from "@/lib/data/mock-store";
import type { Patient } from "@/types";

const PREFIX = "digphy_p_";

/** Mirror a patient into a cookie so other serverless instances can see it. */
export async function persistPatientCookie(patient: Patient): Promise<void> {
  try {
    const store = await cookies();
    store.set(`${PREFIX}${patient.id}`, JSON.stringify(patient), {
      path: "/",
      sameSite: "lax",
    });
  } catch {
    // `cookies()` unavailable outside a request scope — swallow; the in-memory
    // store still holds the record for the current process.
  }
}

/** Read all mirrored patients out of the request cookies. */
async function readPatientCookies(): Promise<Patient[]> {
  try {
    const store = await cookies();
    const list: Patient[] = [];
    for (const cookie of store.getAll()) {
      if (cookie.name.startsWith(PREFIX)) {
        try {
          const parsed = JSON.parse(cookie.value) as Patient;
          if (parsed && parsed.id) list.push(parsed);
        } catch {
          // Skip malformed/oversized rows.
        }
      }
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Find a patient by id across the in-memory store AND request cookies, so a
 * patient created on another serverless instance is still resolvable.
 */
export async function findPatientById(id: string): Promise<Patient | undefined> {
  return getPatientById(id) ?? (await readPatientCookies()).find((p) => p.id === id);
}

/**
 * Full patient list (in-memory + persisted cookies), with the same search +
 * sort behaviour as `mock-store.getAllPatients`.
 */
export async function getAllPatientsForRequest(
  search?: string,
): Promise<Patient[]> {
  const mem = getAllPatients();
  const persisted = await readPatientCookies();
  const memIds = new Set(mem.map((p) => p.id));
  const merged = [...mem, ...persisted.filter((p) => !memIds.has(p.id))].sort(
    (a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name),
  );

  if (!search) return merged;
  const s = search.toLowerCase();
  return merged.filter(
    (p) =>
      p.first_name.toLowerCase().includes(s) ||
      p.last_name.toLowerCase().includes(s) ||
      p.contact_phone.includes(s) ||
      p.primary_diagnosis.toLowerCase().includes(s),
  );
}