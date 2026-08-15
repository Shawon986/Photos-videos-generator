"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";
import { toast } from "sonner";

const schema = z
  .object({
    name: z.string().trim().max(80).optional(),
    email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128)
      .regex(/[a-zA-Z]/, "Password must contain a letter.")
      .regex(/[0-9]/, "Password must contain a number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: values.name || undefined,
          email: values.email,
          password: values.password,
        }),
      });
      toast.success("Account created — please sign in.");
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
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
            <Label htmlFor="reg-name">Name (optional)</Label>
            <Input
              id="reg-name"
              autoComplete="name"
              placeholder="Your name"
              {...form.register("name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
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
            <Label htmlFor="reg-password">Password</Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters, with a letter and a number"
              {...form.register("password")}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? (
              <p className="text-sm text-red-400" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm">Confirm password</Label>
            <Input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              {...form.register("confirmPassword")}
              aria-invalid={Boolean(errors.confirmPassword)}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-red-400" role="alert">
                {errors.confirmPassword.message}
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
                Creating account…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create Account
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
