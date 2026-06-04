import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/account/auth-forms";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicMetadata } from "@/lib/public-metadata";
import { hasSupabaseAuthConfig } from "@/lib/supabase/server";

export const metadata: Metadata = publicMetadata({
  title: "Sign Up for Shalean Cleaning Services",
  description:
    "Create a Shalean account to manage Cape Town cleaning bookings, addresses, invoices, recurring plans, and support requests.",
  path: "/signup",
});

export default function SignupPage() {
  return (
    <PublicPage>
      <section className="bg-[radial-gradient(circle_at_top,rgba(49,128,91,0.16),transparent_30rem),var(--background)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="grid gap-5">
            <Breadcrumbs items={[{ label: "Sign Up" }]} />
            <div>
              <p className="w-fit rounded-full border bg-card px-3 py-1 text-sm font-medium text-primary">
                Shalean account
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                Sign up for easier Cape Town cleaning bookings
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                Create an account to manage bookings, saved addresses, invoices,
                recurring plans, reviews, and support requests.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/services"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 px-4",
                })}
              >
                View Services
              </Link>
              <Link
                href="/cleaning-prices-cape-town"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 px-4",
                })}
              >
                View Pricing
              </Link>
            </div>
          </div>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
            </CardHeader>
            <CardContent>
              {hasSupabaseAuthConfig() ? (
                <Suspense fallback={null}>
                  <AuthForm mode="customer-signup" />
                </Suspense>
              ) : (
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <CardTitle>Supabase Auth is not configured yet</CardTitle>
                  <p>
                    Add NEXT_PUBLIC_SUPABASE_URL and
                    NEXT_PUBLIC_SUPABASE_ANON_KEY to enable customer signup.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicPage>
  );
}
