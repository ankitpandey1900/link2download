import { cn } from "@/shared/lib/utils";

export function Skeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)}>{children}</div>;
}
