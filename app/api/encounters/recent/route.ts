import { NextResponse } from "next/server";
import { getRecentEncounters } from "@/lib/actions/encounters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const encounters = await getRecentEncounters(limit);
    return NextResponse.json(encounters);
  } catch (err: any) {
    console.error("[/api/encounters/recent] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
