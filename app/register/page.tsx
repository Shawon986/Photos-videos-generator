import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { RegisterForm } from "./register-form";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Create Account — VisionForge AI",
  description: "Create a free VisionForge AI account.",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="container flex max-w-md flex-col items-center py-16 lg:py-24">
      <span className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-violet-500/30">
        <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Join <span className="text-gradient">VisionForge</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a free account and start generating.
      </p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="focus-ring rounded text-violet-300 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
