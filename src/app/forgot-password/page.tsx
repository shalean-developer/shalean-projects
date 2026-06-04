import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/account/auth-forms";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseAuthConfig } from "@/lib/supabase/server";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen bg-background px-5 py-8">
      <section className="mx-auto grid w-full max-w-md content-center gap-5">
        <div className="text-center">
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Forgot Password
          </h1>
          <p className="mt-3 text-muted-foreground">
            {"Enter your email address and we\u2019ll send you a link to reset your password."}
          </p>
        </div>
        <Card className="rounded-lg">
          <CardContent>
            {hasSupabaseAuthConfig() ? (
              <Suspense fallback={null}>
                <AuthForm mode="customer-forgot-password" />
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
      </section>
    </main>
  );
}
