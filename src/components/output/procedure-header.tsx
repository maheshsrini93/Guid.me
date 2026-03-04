import {
  Clock,
  Users,
  Wrench,
  FileText,
  Shield,
  Gauge,
} from "lucide-react";
import type { XmlWorkInstruction } from "@/types/xml";
import { SafetyCallout } from "./safety-callout";

interface ProcedureHeaderProps {
  data: XmlWorkInstruction;
}

export function ProcedureHeader({ data }: ProcedureHeaderProps) {
  const { metadata, partsList, toolsRequired, safetyWarnings } = data;

  return (
    <div id="procedure-header" className="space-y-5">
      {/* Title + Purpose */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground leading-tight">
          {metadata.title}
        </h1>
        {metadata.purpose && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            {metadata.purpose}
          </p>
        )}
      </div>

      {/* Badge row */}
      <div className="flex flex-wrap gap-2">
        <Badge icon={<FileText className="w-3 h-3" />} label={metadata.domain} />
        <Badge icon={<Shield className="w-3 h-3" />} label={`Safety: ${metadata.safetyLevel}`} />
        <Badge icon={<Gauge className="w-3 h-3" />} label={formatSkillLevel(metadata.skillLevel)} />
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {metadata.estimatedMinutes} min estimated
        </span>
        {metadata.personsRequired > 1 && (
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {metadata.personsRequired} persons required
          </span>
        )}
        {metadata.sourceDocument && (
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {metadata.sourceDocument.filename} ({metadata.sourceDocument.pageCount} pages)
          </span>
        )}
      </div>

      {/* Safety warnings */}
      {safetyWarnings.length > 0 && (
        <div className="space-y-2">
          {safetyWarnings.map((w, i) => (
            <SafetyCallout key={i} severity={w.severity} text={w.text} />
          ))}
        </div>
      )}

      {/* Parts + Tools in a 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Parts table */}
        {partsList.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Parts List
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-3 py-1.5 text-left font-medium">ID</th>
                  <th className="px-3 py-1.5 text-left font-medium">Part Name</th>
                  <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {partsList.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{p.id}</td>
                    <td className="px-3 py-1.5">{p.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tools list */}
        {toolsRequired.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tools Required
              </span>
            </div>
            <div className="divide-y">
              {toolsRequired.map((t) => (
                <div key={t.name} className="px-3 py-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                    {t.name}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      t.required
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {t.required ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full capitalize">
      {icon}
      {label}
    </span>
  );
}

function formatSkillLevel(level: string): string {
  switch (level) {
    case "none": return "No tools needed";
    case "basic_hand_tools": return "Basic hand tools";
    case "power_tools_recommended": return "Power tools";
    default: return level.replace(/_/g, " ");
  }
}
