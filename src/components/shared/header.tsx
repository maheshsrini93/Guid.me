"use client";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Logo className="mr-6" />
        <div className="flex flex-1 items-center justify-center">
          {children}
        </div>
        <div className="flex items-center justify-end space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
