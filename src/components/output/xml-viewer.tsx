"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export function XmlViewer({ xml }: { xml: string }) {
  if (!xml) return <div className="p-8 text-center text-muted-foreground">No XML output available.</div>;

  return (
    <div className="overflow-hidden rounded-none border bg-[#1E1E1E]">
      <SyntaxHighlighter
        language="xml"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1.5rem",
          fontSize: "0.875rem",
          background: "transparent",
        }}
        wrapLines={true}
        showLineNumbers={true}
      >
        {xml}
      </SyntaxHighlighter>
    </div>
  );
}
