import Link from "next/link";
import { Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-zinc-950/50">
      <div className="container flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <span className="flex items-center gap-2 font-display font-bold">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600">
              <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </span>
            <span className="text-gradient">{APP_NAME}</span>
          </span>
          <p className="max-w-xs text-center text-xs text-muted-foreground md:text-left">
            Free AI image &amp; video generation powered by open-source models. No
            subscription required.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/create" className="focus-ring rounded hover:text-foreground">
            Create
          </Link>
          <Link href="/explore" className="focus-ring rounded hover:text-foreground">
            Explore
          </Link>
          <Link href="/dashboard" className="focus-ring rounded hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/settings" className="focus-ring rounded hover:text-foreground">
            Settings
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Built with open-source AI.
        </p>
      </div>
    </footer>
  );
}
