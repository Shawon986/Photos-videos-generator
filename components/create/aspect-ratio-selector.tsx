"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string; width: number; height: number }>;
  label?: string;
}

const RATIO_BOX: Record<string, { w: number; h: number }> = {
  "1:1": { w: 4, h: 4 },
  "16:9": { w: 5, h: 3 },
  "9:16": { w: 3, h: 5 },
  "4:3": { w: 4, h: 3 },
  "3:4": { w: 3, h: 4 },
};

export function AspectRatioSelector({
  value,
  onChange,
  options,
  label = "Aspect ratio",
}: AspectRatioSelectorProps) {
  return (
    <fieldset>
      <Label asChild>
        <legend className="mb-2">{label}</legend>
      </Label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const box = RATIO_BOX[option.id] ?? { w: 1, h: 1 };
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                "focus-ring flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
                selected
                  ? "border-violet-400/60 bg-violet-500/10 text-violet-200"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25",
              )}
            >
              <span
                className={cn(
                  "rounded-[3px] border-2",
                  selected ? "border-violet-300" : "border-white/30",
                )}
                style={{
                  width: `${box.w * 7}px`,
                  height: `${box.h * 7}px`,
                  maxWidth: 28,
                  maxHeight: 28,
                }}
                aria-hidden="true"
              />
              <span>{option.label}</span>
              <span className="text-[10px] text-muted-foreground/70">
                {option.width}×{option.height}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
