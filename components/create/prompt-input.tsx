"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function PromptInput({
  value,
  onChange,
  id,
  label,
  placeholder = "Describe what you want to create...",
  maxLength = 2000,
  disabled,
  className,
  autoFocus,
}: PromptInputProps) {
  const remaining = maxLength - value.length;
  const nearLimit = remaining < 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span
          className={cn(
            "text-[11px] tabular-nums text-muted-foreground/70",
            nearLimit && "text-amber-300/90",
          )}
          aria-live="polite"
        >
          {remaining.toLocaleString()} characters left
        </span>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={4}
        className="resize-y text-[15px] leading-relaxed"
        aria-describedby={`${id}-hint`}
      />
    </div>
  );
}
