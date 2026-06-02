import { NextRequest, NextResponse } from "next/server";

import { runAutomationSweep } from "@/lib/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.AUTOMATION_SECRET;

  if (!configuredSecret) {
    return NextResponse.json(
      { error: "AUTOMATION_SECRET is required for API-triggered sweeps." },
      { status: 503 }
    );
  }

  const providedSecret =
    request.headers.get("x-automation-secret") ??
    request.nextUrl.searchParams.get("secret");

  if (providedSecret !== configuredSecret) {
    return NextResponse.json(
      { error: "Invalid automation secret." },
      { status: 401 }
    );
  }

  const result = await runAutomationSweep();
  return NextResponse.json(result);
}
