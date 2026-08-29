import { NextResponse } from "next/server";
import { getPatients } from "@/lib/actions/patients";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const patients = await getPatients(q);
    return NextResponse.json(patients);
  } catch (err: any) {
    console.error("[/api/patients] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}