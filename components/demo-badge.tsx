import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shown on every demo-mode result. Never hide this badge on demo output —
 * demo assets are bundled sample media, not model output.
 */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="demo" className={cn("font-medium", className)}>
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      Demo Preview
    </Badge>
  );
}
