import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Sign In — VisionForge AI",
  description: "Sign in to your VisionForge AI account.",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="container flex max-w-md flex-col items-center py-16 lg:py-24">
      <span className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-violet-500/30">
        <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Welcome <span className="text-gradient">back</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to continue creating with AI.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="focus-ring rounded text-violet-300 underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
