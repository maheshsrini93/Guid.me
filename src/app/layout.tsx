import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guid — General Unified Industrialization Dashboard",
  description:
    "AI-powered work instruction generator. Upload a document, watch 8 AI agents transform it into structured XML work instructions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
