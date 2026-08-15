"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

interface CopyButtonProps extends ButtonProps {
  value: string;
  /** Toast message on success. */
  successMessage?: string;
  label?: string;
}

export function CopyButton({
  value,
  successMessage = "Copied to clipboard",
  label,
  children,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Could not copy — your browser blocked clipboard access.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void onCopy()}
      aria-label={label ?? "Copy to clipboard"}
      {...props}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {children}
    </Button>
  );
}
