import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/account/auth-forms";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseAuthConfig } from "@/lib/supabase/server";

export default function ResetPasswordPage() {
  return (
    <PublicPage>
      <section className="grid min-h-[calc(100vh-4rem)] bg-secondary/35 px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid w-full max-w-md content-center gap-5">
        <div className="text-center">
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Forgot Password
          </h1>
          <p className="mt-3 text-muted-foreground">
            Enter your new password to complete the reset.
          </p>
        </div>
        <Card className="rounded-lg bg-white shadow-[0_14px_38px_rgba(10,66,42,0.06)]">
          <CardContent>
            {hasSupabaseAuthConfig() ? (
              <Suspense fallback={null}>
                <AuthForm mode="customer-reset-password" />
              </Suspense>
            ) : (
              <div className="grid gap-3 text-sm text-muted-foreground">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Supabase Auth is not configured yet</CardTitle>
                </CardHeader>
                <p>
                  Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
                  to enable password reset.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Link href="/" className={buttonVariants({ variant: "ghost", className: "mx-auto" })}>
          Back home
        </Link>
        </div>
      </section>
    </PublicPage>
  );
}
