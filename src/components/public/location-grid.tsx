import Link from "next/link";
import { MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicLocation } from "@/config/public-locations";

export function LocationGrid({
  locations,
  limit,
}: {
  locations: PublicLocation[];
  limit?: number;
}) {
  const visibleLocations = limit ? locations.slice(0, limit) : locations;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleLocations.map((location) => (
        <Link
          key={location.slug}
          href={`/locations/${location.slug}`}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Card className="h-full rounded-lg border-border/80 bg-white shadow-[0_14px_38px_rgba(10,66,42,0.06)] transition-colors hover:border-primary/40">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="size-4" aria-hidden="true" />
                <span className="text-sm font-medium">{location.area}</span>
              </div>
              <CardTitle>{location.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {location.description}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
