import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer-bg animate-shimmer rounded-md bg-white/5", className)}
      {...props}
    />
  );
}

export { Skeleton };
