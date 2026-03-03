import { Logo } from "./logo";

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center border-b px-6">
      <Logo />
      <div className="ml-auto flex items-center gap-4">{children}</div>
    </header>
  );
}
