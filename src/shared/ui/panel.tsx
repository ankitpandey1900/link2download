import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-card shadow-panel", className)} {...props} />;
}
