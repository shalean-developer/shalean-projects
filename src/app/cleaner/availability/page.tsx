import { addCleanerAvailability, deleteCleanerAvailability } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireCleaner } from "@/lib/auth";
import { getCleanerAvailability } from "@/lib/supabase/queries";

export default async function CleanerAvailabilityPage() {
  const { cleaner } = await requireCleaner("/cleaner/availability");
  const availability = await getCleanerAvailability(cleaner.id);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Availability</h2>
        <p className="mt-2 text-muted-foreground">Manage availability used by admin scheduling and conflict detection.</p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Add availability</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addCleanerAvailability} className="grid gap-3 sm:grid-cols-5">
            <input type="hidden" name="cleaner_id" value={cleaner.id} />
            <Input type="date" name="available_date" required />
            <Input type="time" name="start_time" required />
            <Input type="time" name="end_time" required />
            <select name="is_available" defaultValue="true" className="h-8 rounded-lg border bg-background px-3 text-sm">
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
            <Button type="submit">Add slot</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Availability slots</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {availability.length ? (
            availability.map((slot) => (
              <div key={slot.id} className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="text-sm">
                  <span className="font-medium">{slot.available_date}</span> · {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
                </p>
                <form action={deleteCleanerAvailability}>
                  <input type="hidden" name="cleaner_id" value={cleaner.id} />
                  <input type="hidden" name="availability_id" value={slot.id} />
                  <Button type="submit" variant="destructive" size="sm">Delete</Button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No availability slots yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
