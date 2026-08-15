"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppConfigProvider } from "@/lib/config-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={200}>
        <AppConfigProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(240 6% 10%)",
                border: "1px solid hsl(240 5% 20%)",
                color: "hsl(0 0% 98%)",
              },
            }}
          />
        </AppConfigProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
