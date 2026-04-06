import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5">
      <span className="text-xl font-bold tracking-tight">Guid</span>
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
    </Link>
  );
}
