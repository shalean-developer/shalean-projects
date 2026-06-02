import { NextRequest, NextResponse } from "next/server";

import { verifyAndFinalizePayment } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  return verify(reference);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return verify(typeof body.reference === "string" ? body.reference : null);
}

async function verify(reference: string | null) {
  if (!reference) {
    return NextResponse.json(
      { error: "Payment reference is required." },
      { status: 400 }
    );
  }

  try {
    const result = await verifyAndFinalizePayment(reference);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to verify payment.",
      },
      { status: 500 }
    );
  }
}
