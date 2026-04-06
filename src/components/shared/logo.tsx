import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-xl font-bold tracking-tight", className)}>
      <span>Guid</span>
      <div className="h-2 w-2 rounded-full bg-primary" />
    </Link>
  );
}
