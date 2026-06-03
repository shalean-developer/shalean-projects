import { NextRequest, NextResponse } from "next/server";

import { getCleanerDateAvailability } from "@/lib/supabase/queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const serviceName = request.nextUrl.searchParams.get("serviceName");
  const bookingDate = request.nextUrl.searchParams.get("date");
  const bookingTime = request.nextUrl.searchParams.get("time") ?? undefined;

  if (!serviceName || !bookingDate) {
    return NextResponse.json(
      { error: "serviceName and date are required." },
      { status: 400 }
    );
  }

  const availability = await getCleanerDateAvailability({
    serviceName,
    bookingDate,
    bookingTime,
  });

  return NextResponse.json({
    cleaners: availability.map((item) => ({
      id: item.cleaner.id,
      status: item.status,
      reason: item.reason,
    })),
  });
}
