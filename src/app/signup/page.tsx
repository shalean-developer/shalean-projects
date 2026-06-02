import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/account/auth-forms";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseAuthConfig } from "@/lib/supabase/server";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen bg-background px-5 py-8">
      <section className="mx-auto grid w-full max-w-md content-center gap-5">
        <div className="text-center">
          <p className="text-sm font-medium text-primary">Shalean account</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Create account
          </h1>
          <p className="mt-3 text-muted-foreground">
            Save your details, reuse addresses, and manage booking requests.
          </p>
        </div>
        <Card className="rounded-lg">
          <CardContent>
            {hasSupabaseAuthConfig() ? (
              <Suspense fallback={null}>
                <AuthForm mode="signup" />
              </Suspense>
            ) : (
              <div className="grid gap-3 text-sm text-muted-foreground">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Supabase Auth is not configured yet</CardTitle>
                </CardHeader>
                <p>
                  Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
                  to enable customer signup.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Link href="/" className={buttonVariants({ variant: "ghost", className: "mx-auto" })}>
          Back home
        </Link>
      </section>
    </main>
  );
}
