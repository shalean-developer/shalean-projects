import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Home,
  Hotel,
  Sparkles,
  SprayCan,
  Truck,
  Wind,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicService } from "@/config/public-services";

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "standard-cleaning-cape-town": Home,
  "deep-cleaning-cape-town": Sparkles,
  "move-out-cleaning-cape-town": Truck,
  "airbnb-cleaning-cape-town": Hotel,
  "office-cleaning-cape-town": Building2,
  "carpet-cleaning-cape-town": SprayCan,
  "window-cleaning-cape-town": Wind,
};

export function ServiceCard({ service }: { service: PublicService }) {
  const Icon = serviceIcons[service.slug] ?? Sparkles;

  return (
    <Card className="rounded-lg border-border/80 shadow-sm transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">{service.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {service.shortDescription}
        </p>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-primary">{service.fromPrice}</span>
          <Link
            href={`/services/${service.slug}`}
            className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Learn more
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

