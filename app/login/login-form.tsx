"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }
      toast.success("Signed in — welcome back!");
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });

  const errors = form.formState.errors;

  return (
    <Card className="mt-8 w-full">
      <CardContent className="pt-6">
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...form.register("email")}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? (
              <p className="text-sm text-red-400" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...form.register("password")}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? (
              <p className="text-sm text-red-400" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign In
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
