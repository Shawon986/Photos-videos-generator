"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  // Read the stored preference during the first client render.
  const [dark, setDark] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("visionforge-theme") !== "light";
  });

  // Sync the <html> class (DOM-only side effect — no setState here).
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("visionforge-theme", next ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}
