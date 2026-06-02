import { Card, CardContent } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto grid max-w-7xl gap-4">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-lg">
              <CardContent>
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="mt-3 h-8 w-20 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
