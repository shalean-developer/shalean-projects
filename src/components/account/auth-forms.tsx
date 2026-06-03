"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { loginCustomer, signUpCustomer } from "@/app/actions";
import {
  authSchema,
  signupSchema,
  type AuthValues,
  type SignupValues,
} from "@/lib/account-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  return mode === "signup" ? <SignupForm /> : <LoginForm />;
}

function LoginForm() {
  const router = useRouter();
  const redirectTo = useRedirectTo();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: AuthValues) {
    setError("");
    startTransition(async () => {
      try {
        await loginCustomer(values);
        router.push(redirectTo);
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Login failed."
        );
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field label="Email or cleaner phone" error={form.formState.errors.email?.message}>
        <Input
          autoComplete="username"
          inputMode="email"
          placeholder="you@example.com or 0792022648"
          {...form.register("email")}
        />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="h-11" disabled={isPending}>
        <LogIn className="size-4" />
        {isPending ? "Working" : "Log in"}
      </Button>
      <AuthSwitch prompt="Need an account?" href="/signup" label="Sign up" />
    </form>
  );
}

function SignupForm() {
  const router = useRouter();
  const redirectTo = useRedirectTo();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "" },
  });

  function onSubmit(values: SignupValues) {
    setError("");
    startTransition(async () => {
      try {
        await signUpCustomer(values);
        router.push(redirectTo);
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Signup failed."
        );
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field label="Full name" error={form.formState.errors.fullName?.message}>
        <Input autoComplete="name" {...form.register("fullName")} />
      </Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}>
        <Input autoComplete="tel" {...form.register("phone")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        <Input
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="h-11" disabled={isPending}>
        <UserPlus className="size-4" />
        {isPending ? "Working" : "Create account"}
      </Button>
      <AuthSwitch prompt="Already have an account?" href="/login" label="Log in" />
    </form>
  );
}

function AuthSwitch({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link href={href} className="font-medium text-primary hover:underline">
        {label}
      </Link>
    </p>
  );
}

function useRedirectTo() {
  const searchParams = useSearchParams();

  return searchParams.get("redirect") ?? "/account";
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
