import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { Card, CardContent } from "@/components/ui/card";
import { getReportingSummary } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function CleanersReportPage() {
  const summary = await getReportingSummary();

  return (
    <AdminPage title="Cleaners report" description="Top cleaners by completed jobs and average rating.">
      <Card className="rounded-lg">
        <CardContent className="grid gap-3">
          {summary.topCleaners.map((item) => (
            <Link key={item.cleaner.id} href={`/admin/cleaners/${item.cleaner.id}`} className="grid gap-2 rounded-lg border p-3 hover:bg-muted/50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <span className="font-medium">{item.cleaner.full_name}</span>
              <span>{item.completedJobs} completed</span>
              <span>{item.averageRating.toFixed(1)} rating</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
