"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Headphones,
  Info,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  useEffect,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";

import {
  loginAdmin,
  loginCleaner,
  loginCustomer,
  requestCustomerPasswordReset,
  signUpCustomer,
  updateCustomerPassword,
} from "@/app/actions";
import {
  authSchema,
  cleanerAuthSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signupSchema,
  type AuthValues,
  type CleanerAuthValues,
  type PasswordResetRequestValues,
  type PasswordUpdateValues,
  type SignupValues,
} from "@/lib/account-schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const supportUrl = `https://wa.me/27825915525?text=${encodeURIComponent(
  "Hi Shalean support, I need help with account access."
)}`;

type AuthFormProps = {
  mode:
    | "customer-login"
    | "customer-signup"
    | "customer-forgot-password"
    | "customer-reset-password"
    | "cleaner-login"
    | "admin-login";
};

export function AuthForm({ mode }: AuthFormProps) {
  if (mode === "customer-signup") {
    return <SignupForm />;
  }

  if (mode === "customer-forgot-password") {
    return <ForgotPasswordForm />;
  }

  if (mode === "customer-reset-password") {
    return <ResetPasswordForm />;
  }

  if (mode === "cleaner-login") {
    return <CleanerLoginForm />;
  }

  if (mode === "admin-login") {
    return <AdminLoginForm />;
  }

  return <CustomerLoginForm />;
}

function CustomerLoginForm() {
  const router = useRouter();
  const redirectTo = useRedirectTo("customer");
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
      <Field
        id="customer-login-email"
        label="Email address"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="customer-login-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
      </Field>
      <Field
        id="customer-login-password"
        label="Password"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="customer-login-password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
      </Field>
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="h-11" disabled={isPending}>
        <LogIn className="size-4" />
        Login
      </Button>
      <AuthSwitch
        prompt={"Don\u2019t have an account?"}
        href="/signup"
        label="Sign up"
      />
    </form>
  );
}

function CleanerLoginForm() {
  const router = useRouter();
  const redirectTo = useRedirectTo("cleaner");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<CleanerAuthValues>({
    resolver: zodResolver(cleanerAuthSchema),
    defaultValues: { phone: "", password: "" },
  });

  function onSubmit(values: CleanerAuthValues) {
    setError("");
    startTransition(async () => {
      try {
        await loginCleaner(values);
        router.push(redirectTo);
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Cleaner account not found"
        );
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field
        id="cleaner-login-phone"
        label="Phone number"
        error={form.formState.errors.phone?.message}
      >
        <Input
          id="cleaner-login-phone"
          autoComplete="username"
          inputMode="tel"
          placeholder="082 123 4567"
          aria-invalid={Boolean(form.formState.errors.phone)}
          {...form.register("phone")}
        />
      </Field>
      <Field
        id="cleaner-login-password"
        label="Password"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="cleaner-login-password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="h-11" disabled={isPending}>
        <Sparkles className="size-4" />
        Login
      </Button>
      <SupportNotice />
    </form>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const redirectTo = useRedirectTo("admin");
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
        await loginAdmin(values);
        router.push(redirectTo);
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Admin access denied"
        );
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field
        id="admin-login-email"
        label="Email address"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="admin-login-email"
          type="email"
          autoComplete="username"
          placeholder="admin@example.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
      </Field>
      <Field
        id="admin-login-password"
        label="Password"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="admin-login-password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="h-11" disabled={isPending}>
        <ShieldCheck className="size-4" />
        Login
      </Button>
      <SupportNotice />
    </form>
  );
}

function SignupForm() {
  const router = useRouter();
  const redirectTo = useRedirectTo("customer");
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
      <Field
        id="customer-signup-name"
        label="Full name"
        error={form.formState.errors.fullName?.message}
      >
        <Input
          id="customer-signup-name"
          autoComplete="name"
          placeholder="Your full name"
          aria-invalid={Boolean(form.formState.errors.fullName)}
          {...form.register("fullName")}
        />
      </Field>
      <Field
        id="customer-signup-phone"
        label="Phone number"
        error={form.formState.errors.phone?.message}
      >
        <Input
          id="customer-signup-phone"
          autoComplete="tel"
          inputMode="tel"
          placeholder="082 123 4567"
          aria-invalid={Boolean(form.formState.errors.phone)}
          {...form.register("phone")}
        />
      </Field>
      <Field
        id="customer-signup-email"
        label="Email address"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="customer-signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
      </Field>
      <Field
        id="customer-signup-password"
        label="Password"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="customer-signup-password"
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="h-11" disabled={isPending}>
        <UserPlus className="size-4" />
        Sign Up
      </Button>
      <AuthSwitch prompt="Already have an account?" href="/login" label="Login" />
    </form>
  );
}

function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: PasswordResetRequestValues) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await requestCustomerPasswordReset(values);
        setMessage("If this email belongs to a customer account, a reset link has been sent.");
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Could not send the reset link."
        );
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field
        id="customer-forgot-email"
        label="Email address"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="customer-forgot-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}
      <Button type="submit" size="lg" className="h-11" disabled={isPending}>
        <Mail className="size-4" />
        Send Reset Link
      </Button>
      <AuthSwitch prompt="" href="/login" label="Back to login" />
    </form>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<PasswordUpdateValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let mounted = true;

    createSupabaseBrowserClient()
      .auth.getSession()
      .finally(() => {
        if (mounted) {
          setAuthReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  function onSubmit(values: PasswordUpdateValues) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await updateCustomerPassword(values);
        setMessage("Your password has been updated.");
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Could not update your password."
        );
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field
        id="customer-reset-password"
        label="Password"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="customer-reset-password"
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
      </Field>
      <Field
        id="customer-reset-confirm-password"
        label="Confirm password"
        error={form.formState.errors.confirmPassword?.message}
      >
        <PasswordInput
          id="customer-reset-confirm-password"
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.confirmPassword)}
          {...form.register("confirmPassword")}
        />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}
      <Button
        type="submit"
        size="lg"
        className="h-11"
        disabled={isPending || !authReady}
      >
        <LogIn className="size-4" />
        Update Password
      </Button>
      <AuthSwitch prompt="" href="/login" label="Back to login" />
    </form>
  );
}

function PasswordInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function SupportNotice() {
  return (
    <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
      <div className="flex gap-2">
        <Info className="mt-0.5 size-4 text-primary" />
        <p>For password reset, please contact support.</p>
      </div>
      <a
        href={supportUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({
          variant: "outline",
          className: "w-full gap-2",
        })}
      >
        <Headphones className="size-4" />
        Contact Support
      </a>
    </div>
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
      {prompt ? `${prompt} ` : null}
      <Link href={href} className="font-medium text-primary hover:underline">
        {label}
      </Link>
    </p>
  );
}

function useRedirectTo(role: "customer" | "cleaner" | "admin") {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  if (!redirectTo?.startsWith("/")) {
    return getDefaultRedirect(role);
  }

  if (role === "customer") {
    return redirectTo.startsWith("/admin") || redirectTo.startsWith("/cleaner")
      ? "/account"
      : redirectTo;
  }

  if (role === "cleaner") {
    return redirectTo.startsWith("/cleaner") ? redirectTo : "/cleaner";
  }

  return redirectTo.startsWith("/admin") ? redirectTo : "/admin";
}

function getDefaultRedirect(role: "customer" | "cleaner" | "admin") {
  if (role === "cleaner") {
    return "/cleaner";
  }

  if (role === "admin") {
    return "/admin";
  }

  return "/account";
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
