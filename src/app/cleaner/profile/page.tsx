import { StatusBadge } from "@/components/platform/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCleaner } from "@/lib/auth";

export default async function CleanerProfilePage() {
  const { cleaner } = await requireCleaner("/cleaner/profile");

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Profile</h2>
        <p className="mt-2 text-muted-foreground">Cleaner profile, specialties, rating, and contact details.</p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{cleaner.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <DetailRow label="Email" value={cleaner.email} />
          <DetailRow label="Phone" value={cleaner.phone} />
          <DetailRow label="Rating" value={cleaner.rating.toFixed(1)} />
          <DetailRow label="Completed jobs" value={String(cleaner.completed_jobs)} />
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={cleaner.active ? "Active" : "Inactive"} />
          </div>
          <div className="grid gap-2">
            <span className="text-muted-foreground">Specialties</span>
            <div className="flex flex-wrap gap-2">
              {cleaner.specialties.map((specialty) => (
                <StatusBadge key={specialty} status={specialty} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
