import type { HTMLAttributes } from "react";
import { cn } from "cn";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-md bg-[#e7ebe9]", className)}
      {...props}
    />
  );
}
