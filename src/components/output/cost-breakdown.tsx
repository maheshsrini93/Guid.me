"use client";

import { Badge } from "@/components/ui/badge";

export function CostBreakdown({ cost, metadata }: { cost: any; metadata: any }) {
  if (!cost) return null;

  const agents = Object.keys(cost.breakdown);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-none border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
          <p className="mt-2 text-4xl font-bold text-emerald-600 dark:text-emerald-400">${cost.totalUsd.toFixed(4)}</p>
        </div>
        <div className="rounded-none border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Processing Time</p>
          <p className="mt-2 font-mono text-4xl font-bold">{(metadata.processingTimeMs / 1000).toFixed(1)}s</p>
        </div>
        <div className="rounded-none border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Revision Loops</p>
          <p className="mt-2 text-4xl font-bold">{metadata.textRevisionLoops}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="border-b pb-2 text-xl font-semibold">Models Used</h3>
        <div className="flex flex-wrap gap-2">
          {metadata.modelsUsed.map((model: string, i: number) => (
            <Badge key={i} variant="secondary" className="px-3 py-1 text-sm">
              {model}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="border-b pb-2 text-xl font-semibold">Cost by Agent</h3>
        <div className="overflow-hidden rounded-none border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-right font-medium">Cost (USD)</th>
                <th className="px-4 py-3 text-right font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agents.map((agent) => {
                const agentCost = cost.breakdown[agent];
                const percentage = (agentCost / cost.totalUsd) * 100;
                return (
                  <tr key={agent} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium capitalize">{agent.replace(/-/g, " ")}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">${agentCost.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="w-12 text-muted-foreground">{percentage.toFixed(1)}%</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-none bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50 font-medium">
              <tr>
                <td className="px-4 py-3 text-left">Total</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">${cost.totalUsd.toFixed(4)}</td>
                <td className="px-4 py-3 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
