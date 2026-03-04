import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guid — General Unified Industrialization Dashboard",
  description:
    "AI-powered work instruction generator. Upload a document, watch 8 AI agents transform it into structured XML work instructions.",
};

// Inline script to set theme before first paint (prevents FOUC)
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
