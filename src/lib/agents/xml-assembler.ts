import type { PipelineState } from "@/types/pipeline";
import type { XmlAssemblerOutput, EnforcedGuide, GeneratedIllustration } from "@/types/agents";
import type {
  XmlWorkInstruction,
  XmlPart,
  XmlTool,
  XmlWarning,
  XmlPhase,
  XmlStep,
} from "@/types/xml";
import { buildXml } from "@/lib/xml/builder";
import { saveFile, getOutputPath } from "@/lib/utils/file-storage";
import { BaseCodeAgent } from "./base-code-agent";
import { AgentValidationError, type AgentContext, type AgentName } from "./types";

interface XmlAssemblerInput {
  state: PipelineState;
}

/**
 * Agent 8: XML Assembler (code-only).
 * Collects all pipeline outputs and assembles them into canonical XML.
 */
class XmlAssemblerAgent extends BaseCodeAgent<XmlAssemblerInput, XmlAssemblerOutput> {
  name: AgentName = "xml-assembler";
  displayName = "XML Assembler";
  executionOrder = 8;

  validateInput(state: PipelineState): XmlAssemblerInput {
    if (!state.enforcedGuide) {
      throw new AgentValidationError(
        "xml-assembler",
        "No enforced guide available.",
      );
    }
    if (!state.qualityReview) {
      throw new AgentValidationError(
        "xml-assembler",
        "No quality review available.",
      );
    }
    if (!state.safetyReview) {
      throw new AgentValidationError(
        "xml-assembler",
        "No safety review available.",
      );
    }
    return { state };
  }

  async execute(
    input: XmlAssemblerInput,
    context: AgentContext,
  ): Promise<XmlAssemblerOutput> {
    const { state } = input;
    const guide = state.enforcedGuide!;
    const qualityReview = state.qualityReview!;
    const safetyReview = state.safetyReview!;
    const doc = state.extractedDocument;

    context.reportProgress(10, "Collecting pipeline outputs");

    // Build the data structure
    const workInstruction = assembleWorkInstruction(guide, state);

    context.reportProgress(50, "Building XML document");

    // Generate XML
    const xmlContent = buildXml(workInstruction);

    context.reportProgress(70, "Writing XML file");

    // Write to storage
    const xmlPath = getOutputPath(state.jobId);
    await saveFile(xmlPath, Buffer.from(xmlContent, "utf-8"));

    context.reportProgress(90, "Building JSON representation");

    // JSON representation
    const jsonContent = workInstruction;

    context.reportProgress(100, "Assembly complete");

    return {
      xmlContent,
      xmlFilePath: xmlPath,
      jsonContent,
      durationMs: 0, // Will be set by base class
    };
  }

  summarize(output: XmlAssemblerOutput): string {
    const sizeKb = (Buffer.byteLength(output.xmlContent, "utf-8") / 1024).toFixed(1);
    return `Assembled XML: ${sizeKb} KB`;
  }
}

// ============================================================
// Assembly Logic
// ============================================================

function assembleWorkInstruction(
  guide: EnforcedGuide,
  state: PipelineState,
): XmlWorkInstruction {
  const doc = state.extractedDocument;
  const qualityReview = state.qualityReview!;
  const safetyReview = state.safetyReview!;

  // Collect unique parts across all steps
  const partsMap = new Map<string, XmlPart>();
  for (const step of guide.steps) {
    for (const part of step.parts) {
      const existing = partsMap.get(part.id);
      if (existing) {
        existing.quantity = Math.max(existing.quantity, part.quantity);
      } else {
        partsMap.set(part.id, {
          id: part.id,
          name: part.name,
          quantity: part.quantity,
        });
      }
    }
  }

  // Collect unique tools (from composed guide if available)
  const toolsSet = new Set<string>();
  const tools: XmlTool[] = [];
  if (state.composedGuide) {
    for (const tool of state.composedGuide.toolsRequired) {
      if (!toolsSet.has(tool.toolName)) {
        toolsSet.add(tool.toolName);
        tools.push({ name: tool.toolName, required: true });
      }
    }
  }

  // Collect guide-level safety warnings
  const warnings: XmlWarning[] = [];
  const warningSet = new Set<string>();
  for (const step of guide.steps) {
    if (step.safetyCallout) {
      const key = `${step.safetyCallout.severity}:${step.safetyCallout.text}`;
      if (!warningSet.has(key)) {
        warningSet.add(key);
        warnings.push({
          severity: step.safetyCallout.severity,
          text: step.safetyCallout.text,
        });
      }
    }
  }

  // Group steps into phases (with illustration refs if available)
  const phases = groupStepsIntoPhases(guide, state.illustrations);

  // Collect models used
  const modelsUsed = new Set<string>();
  for (const cost of state.costs) {
    if (cost.model && cost.model !== "code") {
      modelsUsed.add(cost.model);
    }
  }

  // Build quality flags from quality review issues
  const qualityFlags = qualityReview.issues.map((issue) => ({
    severity: issue.severity,
    step: issue.stepNumber,
    description: issue.description,
  }));

  return {
    metadata: {
      title: guide.guideMetadata.purposeStatement,
      domain: state.composedGuide?.metadata?.skillLevel ?? "consumer",
      safetyLevel: safetyReview.recommendedSafetyLevel,
      estimatedMinutes: guide.guideMetadata.estimatedMinutes,
      personsRequired: guide.guideMetadata.personsRequired,
      skillLevel: guide.guideMetadata.skillLevel,
      purpose: guide.guideMetadata.purposeStatement,
      sourceDocument: {
        filename: doc?.filename ?? "unknown",
        format: (doc?.format ?? "pdf") as "pdf" | "docx",
        pageCount: doc?.pageCount ?? 0,
      },
    },
    partsList: [...partsMap.values()],
    toolsRequired: tools,
    safetyWarnings: warnings,
    phases,
    generationMetadata: {
      jobId: state.jobId,
      generatedAt: new Date().toISOString(),
      qualityScore: qualityReview.overallScore,
      qualityDecision: qualityReview.decision,
      totalCostUsd: state.totalCostUsd,
      processingTimeMs: Date.now() - state.startedAt.getTime(),
      textRevisionLoops: state.textRevisionCount,
      modelsUsed: [...modelsUsed],
      qualityFlags,
    },
  };
}

function groupStepsIntoPhases(
  guide: EnforcedGuide,
  illustrations?: GeneratedIllustration[],
): XmlPhase[] {
  // Build a map for quick lookup: stepNumber -> illustration file path
  const illustrationMap = new Map<string, string>();
  if (illustrations) {
    for (const il of illustrations) {
      // Use relative path for XML refs: step-001.png
      const filename = il.filePath.split("/").pop() ?? `step-${String(il.stepNumber).padStart(3, "0")}.png`;
      illustrationMap.set(String(il.stepNumber), filename);
    }
  }

  const phases: XmlPhase[] = [];
  let currentPhase: XmlPhase = { name: "Assembly", steps: [] };

  for (const step of guide.steps) {
    // Start a new phase if this step marks one
    if (step.phaseStart) {
      if (currentPhase.steps.length > 0) {
        phases.push(currentPhase);
      }
      currentPhase = { name: step.phaseStart, steps: [] };
    }

    const xmlStep: XmlStep = {
      number: step.stepNumber,
      title: step.title,
      instruction: step.instruction,
      parts: step.parts.map((p) => ({ id: p.id, quantity: p.quantity })),
      tools: [], // Tools are at guide level, not per-step in current schema
      safety: step.safetyCallout
        ? [{ severity: step.safetyCallout.severity, text: step.safetyCallout.text }]
        : [],
      illustrationSrc: illustrationMap.get(String(step.stepNumber)) ?? null,
      twoPersonRequired: step.twoPersonRequired,
      complexity: step.complexity,
      confidence: step.confidence,
      sourcePages: step.sourcePdfPages,
    };

    currentPhase.steps.push(xmlStep);
  }

  // Push the last phase
  if (currentPhase.steps.length > 0) {
    phases.push(currentPhase);
  }

  return phases;
}

export const xmlAssembler = new XmlAssemblerAgent();
