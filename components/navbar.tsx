"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Sparkles, LayoutDashboard, Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/create", label: "Create" },
  { href: "/explore", label: "Explore" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#about", label: "About" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close the mobile menu on navigation (render-time derived state).
  const [lastPathname, setLastPathname] = React.useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  const initials = (session?.user?.name ?? session?.user?.email ?? "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
      <nav
        className="container flex h-16 items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span className="text-gradient">{APP_NAME}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "focus-ring rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {status === "loading" ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-white/10" aria-hidden="true" />
          ) : session?.user ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="focus-ring rounded-full"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-9 border border-white/10">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name ?? "Creator"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {session.user.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <User />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-400 focus:bg-red-400/10 focus:text-red-300"
                    onSelect={() => void signOut({ callbackUrl: "/" })}
                  >
                    <LogOut />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/create">Start Creating</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-white/5 bg-zinc-950/95 px-4 pb-4 pt-2 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="focus-ring rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-white/10" />
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="focus-ring rounded-md px-3 py-2.5 text-sm font-medium hover:bg-white/5"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="focus-ring rounded-md px-3 py-2.5 text-sm font-medium hover:bg-white/5"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="focus-ring rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-400 hover:bg-white/5"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button variant="gradient" asChild className="justify-start">
                  <Link href="/create">Start Creating</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
