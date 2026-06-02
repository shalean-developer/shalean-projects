"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CleanerError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-lg rounded-lg">
        <CardHeader>
          <CardTitle>Cleaner portal error</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">The cleaner view could not load.</p>
          <Button onClick={reset} className="w-fit">Try again</Button>
        </CardContent>
      </Card>
    </main>
  );
}
