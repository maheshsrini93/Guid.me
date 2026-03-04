import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center border-b px-6">
      <Logo />
      <div className="ml-auto flex items-center gap-3">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
