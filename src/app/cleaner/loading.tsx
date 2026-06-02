import { Card, CardContent } from "@/components/ui/card";

export default function CleanerLoading() {
  return (
    <main className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="h-8 w-52 rounded-lg bg-muted" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="rounded-lg">
            <CardContent>
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="mt-3 h-6 w-48 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
