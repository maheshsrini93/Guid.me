/**
 * Demo Mode Manager.
 *
 * Replays pre-cached results with realistic timing when DEMO_MODE=true.
 * Emits identical SSE events to the live pipeline.
 *
 * Phase 6 (T-095): dispatches between two cassettes — the PDF/DOCX cassette
 * (existing 6-step bookshelf) and the CAD cassette (5-step benchtop pulley
 * with deterministic parts catalog and $0 illustration renderer). The
 * cassette selection is driven by `jobs.sourceKind`.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, generatedGuides, generatedIllustrations, agentExecutions } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/ulid";
import { pipelineEvents } from "@/lib/orchestrator/event-emitter";
import { PipelineCancelledError } from "@/lib/agents/types";
import type { PipelineStatus, AgentCostRecord } from "@/types/pipeline";
import type {
  EnforcedGuide,
  ExtractedSource,
  QualityReviewResult,
  SafetyReviewResult,
} from "@/types/agents";
import {
  DEMO_EXTRACTED_SOURCE,
  DEMO_ENFORCED_GUIDE,
  DEMO_FRAME_EXTRACTIONS,
  DEMO_QUALITY_REVIEW,
  DEMO_SAFETY_REVIEW,
  DEMO_XML_CONTENT,
  DEMO_COST_RECORDS,
  DEMO_TOTAL_COST,
} from "./demo-data";
import {
  DEMO_CAD_EXTRACTED_SOURCE,
  DEMO_CAD_ENFORCED_GUIDE,
  DEMO_CAD_QUALITY_REVIEW,
  DEMO_CAD_SAFETY_REVIEW,
  DEMO_CAD_XML_CONTENT,
  DEMO_CAD_COST_RECORDS,
  DEMO_CAD_TOTAL_COST,
} from "./demo-data-cad";
import { getAgentTiming, sleep } from "./demo-timing";
import type { XmlWorkInstruction, XmlPhase, XmlStep, XmlPart, XmlWarning } from "@/types/xml";

/** Track cancellation per demo job */
const demoCancelledJobs = new Map<string, { current: boolean }>();

export function cancelDemoPipeline(jobId: string): void {
  const ref = demoCancelledJobs.get(jobId);
  if (ref) ref.current = true;
}

// ============================================================
// Cassette: per-path constants the simulator consumes
// ============================================================

type CostRecord = {
  agent: string;
  model: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
};

interface DemoCassette {
  kind: "document" | "cad";
  /** Cached agent outputs */
  extractedSource: ExtractedSource;
  enforcedGuide: EnforcedGuide;
  qualityReview: QualityReviewResult;
  safetyReview: SafetyReviewResult;
  xmlContent: string;
  costRecords: CostRecord[];
  totalCost: number;
  /** Display values that feed into SSE messages and persisted records */
  domain: string;
  /** Default models reported on the guide row */
  modelsUsed: string[];
  /** Per-agent progress messages */
  progressFor: {
    sourceAdapter: { progress: number; message: string }[];
    visionAnalyzer: { progress: number; message: string }[];
    instructionComposer: { progress: number; message: string }[];
    guidelineEnforcer: { progress: number; message: string }[];
    illustrationRenderer: { progress: number; message: string }[];
    xmlAssembler: { progress: number; message: string }[];
  };
  /** Per-agent summary line on agent:complete */
  summary: {
    sourceAdapter: string;
    visionAnalyzer: string;
    instructionComposer: string;
    guidelineEnforcer: string;
    illustrationRenderer: string;
    xmlAssembler: string;
  };
  /** Illustration metadata for the persisted illustration rows */
  illustration: {
    model: string;
    width: number;
    height: number;
    durationMs: number;
    /** Cost per step (already summed into the cassette totalCost via costRecords) */
    costPerStepUsd: number;
    /** Storage path template */
    filePath: (stepNumber: number) => string;
  };
}

function pdfCassette(): DemoCassette {
  const observationCount = DEMO_FRAME_EXTRACTIONS.reduce((sum, p) => sum + p.steps.length, 0);
  return {
    kind: "document",
    extractedSource: DEMO_EXTRACTED_SOURCE,
    enforcedGuide: DEMO_ENFORCED_GUIDE,
    qualityReview: DEMO_QUALITY_REVIEW,
    safetyReview: DEMO_SAFETY_REVIEW,
    xmlContent: DEMO_XML_CONTENT,
    costRecords: DEMO_COST_RECORDS,
    totalCost: DEMO_TOTAL_COST,
    domain: "consumer",
    modelsUsed: ["gemini-3.1-flash-lite-preview", "gemini-3.1-pro-preview"],
    progressFor: {
      sourceAdapter: [
        { progress: 30, message: "Extracting pages from PDF" },
        { progress: 70, message: "Converting pages to images" },
        { progress: 100, message: `Extracted ${DEMO_EXTRACTED_SOURCE.documentMetadata.pageCount} pages` },
      ],
      visionAnalyzer: [
        { progress: 25, message: "Analyzing page 1 of 4" },
        { progress: 50, message: "Analyzing page 2 of 4" },
        { progress: 75, message: "Analyzing page 3 of 4" },
        { progress: 100, message: "Analyzing page 4 of 4" },
      ],
      instructionComposer: [
        { progress: 30, message: "Merging page observations" },
        { progress: 70, message: "Composing instruction steps" },
        { progress: 100, message: `Composed ${DEMO_ENFORCED_GUIDE.steps.length} steps in 3 phases` },
      ],
      guidelineEnforcer: [
        { progress: 30, message: "Loading work instruction guidelines" },
        { progress: 70, message: "Enforcing verb-first structure + part IDs" },
        { progress: 100, message: `All ${DEMO_ENFORCED_GUIDE.steps.length} steps guideline-compliant` },
      ],
      illustrationRenderer: DEMO_ENFORCED_GUIDE.steps
        .map((s, i, arr) => ({
          progress: Math.round(((i + 1) / arr.length) * 100),
          message:
            i === arr.length - 1
              ? `Generated ${arr.length} illustrations`
              : `Generating illustration for step ${s.stepNumber}`,
        })),
      xmlAssembler: [
        { progress: 50, message: "Building XML document" },
        { progress: 100, message: "Assembly complete" },
      ],
    },
    summary: {
      sourceAdapter: `Extracted ${DEMO_EXTRACTED_SOURCE.documentMetadata.pageCount} pages`,
      visionAnalyzer: `Analyzed 4 pages, extracted ${observationCount} observations`,
      instructionComposer: `Composed ${DEMO_ENFORCED_GUIDE.steps.length} steps in 3 phases`,
      guidelineEnforcer: `All ${DEMO_ENFORCED_GUIDE.steps.length} steps guideline-compliant`,
      illustrationRenderer: `Generated ${DEMO_ENFORCED_GUIDE.steps.length} illustrations`,
      xmlAssembler: `Assembled XML: ${(Buffer.byteLength(DEMO_XML_CONTENT, "utf-8") / 1024).toFixed(1)} KB`,
    },
    illustration: {
      model: "gemini-3.1-flash-image-preview",
      width: 512,
      height: 512,
      durationMs: 2000,
      costPerStepUsd: 0.04,
      filePath: (n) => `demo/illustrations/step-${String(n).padStart(3, "0")}.png`,
    },
  };
}

function cadCassette(): DemoCassette {
  const stepCount = DEMO_CAD_ENFORCED_GUIDE.steps.length;
  const componentCount = DEMO_CAD_EXTRACTED_SOURCE.structuredMetadata?.partsCatalog.length ?? 0;
  const frameCount = DEMO_CAD_EXTRACTED_SOURCE.frames.length;

  return {
    kind: "cad",
    extractedSource: DEMO_CAD_EXTRACTED_SOURCE,
    enforcedGuide: DEMO_CAD_ENFORCED_GUIDE,
    qualityReview: DEMO_CAD_QUALITY_REVIEW,
    safetyReview: DEMO_CAD_SAFETY_REVIEW,
    xmlContent: DEMO_CAD_XML_CONTENT,
    costRecords: DEMO_CAD_COST_RECORDS,
    totalCost: DEMO_CAD_TOTAL_COST,
    domain: "manufacturing",
    modelsUsed: [
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-pro-preview",
      "internal-cad-renderer",
    ],
    progressFor: {
      sourceAdapter: [
        { progress: 25, message: "Parsing STEP geometry" },
        { progress: 50, message: `Cataloging ${componentCount} components` },
        { progress: 80, message: `Extracting ${frameCount} keyframes from explode video` },
        { progress: 100, message: `Source ready: ${componentCount} parts, ${frameCount} keyframes` },
      ],
      visionAnalyzer: [
        { progress: 20, message: `Comparing keyframes 1 → 2` },
        { progress: 40, message: `Comparing keyframes 2 → 3` },
        { progress: 60, message: `Comparing keyframes 3 → 4` },
        { progress: 80, message: `Comparing keyframes 4 → 5` },
        { progress: 100, message: `Comparing keyframes 5 → 6` },
      ],
      instructionComposer: [
        { progress: 30, message: "Merging keyframe transitions" },
        { progress: 70, message: "Grounding parts against CAD catalog" },
        { progress: 100, message: `Composed ${stepCount} steps` },
      ],
      guidelineEnforcer: [
        { progress: 30, message: "Loading work instruction guidelines" },
        { progress: 70, message: "Enforcing verb-first structure + CAD part IDs" },
        { progress: 100, message: `All ${stepCount} steps guideline-compliant` },
      ],
      illustrationRenderer: DEMO_CAD_ENFORCED_GUIDE.steps.map((s, i, arr) => ({
        progress: Math.round(((i + 1) / arr.length) * 100),
        message:
          i === arr.length - 1
            ? `Rendered ${arr.length} CAD illustrations`
            : `Rendering CAD view for step ${s.stepNumber}`,
      })),
      xmlAssembler: [
        { progress: 50, message: "Building XML document" },
        { progress: 100, message: "Assembly complete" },
      ],
    },
    summary: {
      sourceAdapter: `Parsed STEP (${componentCount} components) + ${frameCount} keyframes`,
      visionAnalyzer: `${frameCount - 1} keyframe transitions analyzed (CAD path)`,
      instructionComposer: `Composed ${stepCount} steps grounded in CAD catalog`,
      guidelineEnforcer: `All ${stepCount} steps guideline-compliant`,
      illustrationRenderer: `Rendered ${stepCount} CAD illustrations (three.js + overlays, $0)`,
      xmlAssembler: `Assembled XML: ${(Buffer.byteLength(DEMO_CAD_XML_CONTENT, "utf-8") / 1024).toFixed(1)} KB`,
    },
    illustration: {
      model: "internal-cad-renderer",
      width: 1600,
      height: 1200,
      durationMs: 600,
      costPerStepUsd: 0,
      filePath: (n) => `cad/illustrations/step-${String(n).padStart(3, "0")}.png`,
    },
  };
}

function selectCassette(jobId: string): DemoCassette {
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) {
    // Defensive fallback — shouldn't happen because the orchestrator just created the row.
    return pdfCassette();
  }
  switch (job.sourceKind) {
    case "step":
    case "step+explode-video":
      return cadCassette();
    case "pdf":
    case "docx":
    default:
      return pdfCassette();
  }
}

// ============================================================
// Public entry point
// ============================================================

/**
 * Run the full pipeline in demo mode with cached results + realistic timing.
 *
 * Selects a cassette by `jobs.sourceKind`. The simulator below is shared by
 * both paths; only the cached data + display strings + per-agent timings differ.
 */
export async function runDemoPipeline(jobId: string): Promise<void> {
  const cancelledRef = { current: false };
  demoCancelledJobs.set(jobId, cancelledRef);
  const startedAt = Date.now();

  const cassette = selectCassette(jobId);

  const costs: AgentCostRecord[] = [];
  let totalCostUsd = 0;

  try {
    // ── Agent 1: Source Adapter ────────────────────────────
    await simulateAgent(jobId, cancelledRef, cassette, "extracting", "source-adapter", costs, () => {
      totalCostUsd += findRecord(cassette, "source-adapter").costUsd;
      return cassette.progressFor.sourceAdapter;
    }, findRecord(cassette, "source-adapter").costUsd, cassette.summary.sourceAdapter);

    // ── Agent 2: Vision Analyzer ───────────────────────────
    await simulateAgent(jobId, cancelledRef, cassette, "analyzing", "vision-analyzer", costs, () => {
      totalCostUsd += findRecord(cassette, "vision-analyzer").costUsd;
      return cassette.progressFor.visionAnalyzer;
    }, findRecord(cassette, "vision-analyzer").costUsd, cassette.summary.visionAnalyzer);

    // ── Agent 3: Instruction Composer ──────────────────────
    await simulateAgent(jobId, cancelledRef, cassette, "composing", "instruction-composer", costs, () => {
      totalCostUsd += findRecord(cassette, "instruction-composer").costUsd;
      return cassette.progressFor.instructionComposer;
    }, findRecord(cassette, "instruction-composer").costUsd, cassette.summary.instructionComposer);

    // ── Agent 4: Guideline Enforcer ────────────────────────
    await simulateAgent(jobId, cancelledRef, cassette, "enforcing", "guideline-enforcer", costs, () => {
      totalCostUsd += findRecord(cassette, "guideline-enforcer").costUsd;
      return cassette.progressFor.guidelineEnforcer;
    }, findRecord(cassette, "guideline-enforcer").costUsd, cassette.summary.guidelineEnforcer);

    // ── Agents 5+6: Review (parallel) ──────────────────────
    checkCancelled(jobId, cancelledRef);
    updateDemoStatus(jobId, "reviewing");

    const timing5 = getAgentTiming("quality-reviewer", cassette.kind);
    const timing6 = getAgentTiming("safety-reviewer", cassette.kind);

    pipelineEvents.emit(jobId, "agent:start", {
      agent: "quality-reviewer",
      startedAt: new Date().toISOString(),
    });
    pipelineEvents.emit(jobId, "agent:start", {
      agent: "safety-reviewer",
      startedAt: new Date().toISOString(),
    });

    const maxDuration = Math.max(timing5.durationMs, timing6.durationMs);
    const parallelSteps = 4;
    for (let i = 1; i <= parallelSteps; i++) {
      checkCancelled(jobId, cancelledRef);
      await sleep(maxDuration / parallelSteps);
      const pct = Math.round((i / parallelSteps) * 100);
      pipelineEvents.emit(jobId, "agent:progress", {
        agent: "quality-reviewer",
        progress: pct,
        message: pct < 100 ? "Reviewing instruction quality" : "Quality review complete",
      });
      pipelineEvents.emit(jobId, "agent:progress", {
        agent: "safety-reviewer",
        progress: pct,
        message: pct < 100 ? "Reviewing safety compliance" : "Safety review complete",
      });
    }

    const qualityCost = findRecord(cassette, "quality-reviewer").costUsd;
    const safetyCost = findRecord(cassette, "safety-reviewer").costUsd;
    totalCostUsd += qualityCost + safetyCost;

    pipelineEvents.emit(jobId, "agent:complete", {
      agent: "quality-reviewer",
      durationMs: timing5.durationMs,
      costUsd: qualityCost,
      summary: `Score: ${cassette.qualityReview.overallScore}/100 — ${cassette.qualityReview.decision}`,
    });
    pipelineEvents.emit(jobId, "agent:complete", {
      agent: "safety-reviewer",
      durationMs: timing6.durationMs,
      costUsd: safetyCost,
      summary: `Safety: ${cassette.safetyReview.recommendedSafetyLevel} — ${cassette.safetyReview.issues.length} issues`,
    });

    recordDemoCost(jobId, costs, totalCostUsd, findRecord(cassette, "quality-reviewer"));
    recordDemoCost(jobId, costs, totalCostUsd, findRecord(cassette, "safety-reviewer"));

    const reviewStartedAt = new Date().toISOString();
    db.insert(agentExecutions).values({
      id: generateId(), jobId, agentName: "quality-reviewer", executionOrder: 5,
      model: findRecord(cassette, "quality-reviewer").model, wasEscalation: false,
      promptSent: "[demo mode]", responseReceived: "[demo mode]", structuredOutput: null,
      inputTokens: findRecord(cassette, "quality-reviewer").inputTokens,
      outputTokens: findRecord(cassette, "quality-reviewer").outputTokens,
      costUsd: qualityCost,
      startedAt: reviewStartedAt, completedAt: new Date().toISOString(),
      durationMs: timing5.durationMs, status: "completed", errorMessage: null,
    }).run();
    db.insert(agentExecutions).values({
      id: generateId(), jobId, agentName: "safety-reviewer", executionOrder: 6,
      model: findRecord(cassette, "safety-reviewer").model, wasEscalation: false,
      promptSent: "[demo mode]", responseReceived: "[demo mode]", structuredOutput: null,
      inputTokens: findRecord(cassette, "safety-reviewer").inputTokens,
      outputTokens: findRecord(cassette, "safety-reviewer").outputTokens,
      costUsd: safetyCost,
      startedAt: reviewStartedAt, completedAt: new Date().toISOString(),
      durationMs: timing6.durationMs, status: "completed", errorMessage: null,
    }).run();

    pipelineEvents.emit(jobId, "agent:progress", {
      agent: "reviewing",
      progress: 100,
      message: `Quality gate: ${cassette.qualityReview.decision} (score: ${cassette.qualityReview.overallScore})`,
    });

    // ── Agent 7: Illustration Renderer ─────────────────────
    await simulateAgent(jobId, cancelledRef, cassette, "illustrating", "illustration-renderer", costs, () => {
      totalCostUsd += findRecord(cassette, "illustration-renderer").costUsd;
      return cassette.progressFor.illustrationRenderer;
    }, findRecord(cassette, "illustration-renderer").costUsd, cassette.summary.illustrationRenderer);

    // ── Agent 8: XML Assembler ─────────────────────────────
    await simulateAgent(jobId, cancelledRef, cassette, "assembling", "xml-assembler", costs, () => {
      totalCostUsd += findRecord(cassette, "xml-assembler").costUsd;
      return cassette.progressFor.xmlAssembler;
    }, findRecord(cassette, "xml-assembler").costUsd, cassette.summary.xmlAssembler);

    // ── Persist demo guide to DB ───────────────────────────
    persistGuide(jobId, cassette);

    // ── Complete ───────────────────────────────────────────
    const durationMs = Date.now() - startedAt;
    db.update(jobs)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalCostUsd: cassette.totalCost,
        qualityScore: cassette.qualityReview.overallScore,
        qualityDecision: cassette.qualityReview.decision,
        textRevisionCount: 0,
        // Phase 6: surface CAD provenance so the output banner (T-093) renders correctly.
        ...(cassette.kind === "cad" && cassette.extractedSource.structuredMetadata
          ? {
              sourceKind: cassette.extractedSource.structuredMetadata.sourceFormat,
              sequenceSource: cassette.extractedSource.structuredMetadata.sequenceSource,
              sequenceConfidence: cassette.extractedSource.structuredMetadata.sequenceConfidence,
            }
          : {}),
      })
      .where(eq(jobs.id, jobId))
      .run();

    pipelineEvents.emit(jobId, "pipeline:state", {
      state: "completed",
      timestamp: new Date().toISOString(),
    });
    pipelineEvents.emit(jobId, "pipeline:complete", {
      state: "completed",
      qualityScore: cassette.qualityReview.overallScore,
      qualityDecision: cassette.qualityReview.decision,
      totalCostUsd: cassette.totalCost,
      durationMs,
    });
  } catch (error) {
    if (error instanceof PipelineCancelledError) {
      db.update(jobs)
        .set({
          status: "cancelled",
          completedAt: new Date().toISOString(),
          errorMessage: "Pipeline cancelled by user",
        })
        .where(eq(jobs.id, jobId))
        .run();

      pipelineEvents.emit(jobId, "pipeline:state", {
        state: "cancelled",
        timestamp: new Date().toISOString(),
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      db.update(jobs)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage,
          totalCostUsd,
        })
        .where(eq(jobs.id, jobId))
        .run();

      pipelineEvents.emit(jobId, "pipeline:error", {
        error: errorMessage,
        recoverable: false,
      });
      pipelineEvents.emit(jobId, "pipeline:state", {
        state: "failed",
        timestamp: new Date().toISOString(),
      });
    }
  } finally {
    setTimeout(() => {
      pipelineEvents.dispose(jobId);
      demoCancelledJobs.delete(jobId);
    }, 2000);
  }
}

// ============================================================
// Helpers
// ============================================================

function findRecord(cassette: DemoCassette, agent: string): CostRecord {
  const r = cassette.costRecords.find((c) => c.agent === agent);
  if (!r) {
    return { agent, model: "code", costUsd: 0, inputTokens: 0, outputTokens: 0 };
  }
  return r;
}

function persistGuide(jobId: string, cassette: DemoCassette): void {
  const guide = cassette.enforcedGuide;
  const guideId = generateId();
  const xmlInstruction = buildDemoXmlWorkInstruction(jobId, cassette);

  // Build a sortable phase-count from the enforced steps.
  const phaseNames = new Set<string>();
  let inferredPhases = 1;
  for (const step of guide.steps) {
    if (step.phaseStart) {
      if (!phaseNames.has(step.phaseStart)) {
        phaseNames.add(step.phaseStart);
        inferredPhases += 1;
      }
    }
  }

  db.insert(generatedGuides)
    .values({
      id: guideId,
      jobId,
      xmlContent: cassette.xmlContent,
      jsonContent: JSON.stringify(xmlInstruction),
      xmlFilePath: null,
      qualityScore: cassette.qualityReview.overallScore,
      qualityDecision: cassette.qualityReview.decision,
      qualityIssues: JSON.stringify(cassette.qualityReview.issues),
      safetyIssues: JSON.stringify(cassette.safetyReview.issues),
      stepCount: guide.steps.length,
      phaseCount: inferredPhases,
      title: guide.guideMetadata.title || guide.guideMetadata.purposeStatement,
      domain: cassette.domain,
      estimatedMinutes: guide.guideMetadata.estimatedMinutes,
      safetyLevel: cassette.safetyReview.recommendedSafetyLevel,
      modelsUsed: JSON.stringify(cassette.modelsUsed),
      textRevisionLoops: 0,
      totalCostUsd: cassette.totalCost,
      generatedAt: new Date().toISOString(),
    })
    .run();

  for (const step of guide.steps) {
    db.insert(generatedIllustrations)
      .values({
        id: generateId(),
        jobId,
        guideId,
        stepNumber: step.stepNumber,
        filePath: cassette.illustration.filePath(step.stepNumber),
        mimeType: "image/png",
        width: cassette.illustration.width,
        height: cassette.illustration.height,
        model: cassette.illustration.model,
        costUsd: cassette.illustration.costPerStepUsd,
        durationMs: cassette.illustration.durationMs,
        generatedAt: new Date().toISOString(),
      })
      .run();
  }
}

/**
 * Build a proper XmlWorkInstruction from the cassette's EnforcedGuide.
 * Mirrors xml-assembler.ts.
 */
function buildDemoXmlWorkInstruction(jobId: string, cassette: DemoCassette): XmlWorkInstruction {
  const guide = cassette.enforcedGuide;

  const partsMap = new Map<string, XmlPart>();
  for (const step of guide.steps) {
    for (const part of step.parts) {
      const existing = partsMap.get(part.id);
      if (existing) {
        existing.quantity = Math.max(existing.quantity, part.quantity);
      } else {
        partsMap.set(part.id, { id: part.id, name: part.name, quantity: part.quantity });
      }
    }
  }

  const warnings: XmlWarning[] = [];
  const warningSet = new Set<string>();
  for (const step of guide.steps) {
    for (const callout of step.safetyCallouts) {
      const key = `${callout.severity}:${callout.text}`;
      if (!warningSet.has(key)) {
        warningSet.add(key);
        warnings.push({ severity: callout.severity, text: callout.text });
      }
    }
  }

  const phases: XmlPhase[] = [];
  let currentPhase: XmlPhase = { name: "Assembly", steps: [] };
  for (const step of guide.steps) {
    if (step.phaseStart) {
      if (currentPhase.steps.length > 0) phases.push(currentPhase);
      currentPhase = { name: step.phaseStart, steps: [] };
    }
    const xmlStep: XmlStep = {
      number: step.stepNumber,
      title: step.title,
      instruction: step.instruction,
      parts: step.parts.map((p) => ({ id: p.id, quantity: p.quantity })),
      tools: (step.toolsRequired ?? []).map((t) => ({ name: t })),
      safety: step.safetyCallouts.map((c) => ({ severity: c.severity, text: c.text })),
      illustrationSrc: `step-${String(step.stepNumber).padStart(3, "0")}.png`,
      twoPersonRequired: step.twoPersonRequired,
      complexity: step.complexity,
      confidence: step.confidence,
      sourcePages: step.sourcePdfPages,
    };
    currentPhase.steps.push(xmlStep);
  }
  if (currentPhase.steps.length > 0) phases.push(currentPhase);

  const sourceMeta = cassette.extractedSource.documentMetadata;

  return {
    metadata: {
      title: guide.guideMetadata.title || guide.guideMetadata.purposeStatement,
      domain: cassette.domain,
      safetyLevel: cassette.safetyReview.recommendedSafetyLevel,
      estimatedMinutes: guide.guideMetadata.estimatedMinutes,
      personsRequired: guide.guideMetadata.personsRequired,
      skillLevel: guide.guideMetadata.skillLevel,
      purpose: guide.guideMetadata.purposeStatement,
      sourceDocument: {
        filename: sourceMeta.filename,
        format: sourceMeta.format,
        pageCount: sourceMeta.pageCount,
      },
    },
    partsList: [...partsMap.values()],
    toolsRequired: [],
    safetyWarnings: warnings,
    phases,
    generationMetadata: {
      jobId,
      generatedAt: new Date().toISOString(),
      qualityScore: cassette.qualityReview.overallScore,
      qualityDecision: cassette.qualityReview.decision,
      totalCostUsd: cassette.totalCost,
      processingTimeMs: cassette.kind === "cad" ? 32000 : 35000,
      textRevisionLoops: 0,
      modelsUsed: cassette.modelsUsed,
      qualityFlags: cassette.qualityReview.issues.map((i) => ({
        severity: i.severity,
        step: i.stepNumber,
        description: i.description,
      })),
    },
  };
}

function checkCancelled(jobId: string, ref: { current: boolean }): void {
  if (ref.current) throw new PipelineCancelledError(jobId);
}

function updateDemoStatus(jobId: string, status: PipelineStatus): void {
  db.update(jobs)
    .set({
      status,
      currentAgent: status,
      ...(status === "extracting" ? { startedAt: new Date().toISOString() } : {}),
    })
    .where(eq(jobs.id, jobId))
    .run();

  pipelineEvents.emit(jobId, "pipeline:state", {
    state: status,
    timestamp: new Date().toISOString(),
  });
}

function recordDemoCost(
  jobId: string,
  costs: AgentCostRecord[],
  totalCostUsd: number,
  record: CostRecord,
): void {
  const costRecord: AgentCostRecord = {
    agent: record.agent,
    model: record.model,
    costUsd: record.costUsd,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    durationMs: 0,
    timestamp: new Date(),
  };
  costs.push(costRecord);

  const breakdown: Record<string, number> = {};
  for (const c of costs) {
    breakdown[c.agent] = (breakdown[c.agent] ?? 0) + c.costUsd;
  }
  pipelineEvents.emit(jobId, "pipeline:cost", {
    totalUsd: totalCostUsd,
    breakdown,
  });

  db.update(jobs)
    .set({ totalCostUsd })
    .where(eq(jobs.id, jobId))
    .run();
}

async function simulateAgent(
  jobId: string,
  cancelledRef: { current: boolean },
  cassette: DemoCassette,
  pipelineStatus: PipelineStatus,
  agentName: string,
  costs: AgentCostRecord[],
  getProgressSteps: () => { progress: number; message: string }[],
  agentCost: number,
  summary: string,
): Promise<void> {
  checkCancelled(jobId, cancelledRef);
  updateDemoStatus(jobId, pipelineStatus);

  const timing = getAgentTiming(agentName, cassette.kind);
  await sleep(timing.startDelayMs);

  const startedAt = new Date();
  pipelineEvents.emit(jobId, "agent:start", {
    agent: agentName,
    startedAt: startedAt.toISOString(),
  });

  const steps = getProgressSteps();
  const stepDelay = timing.durationMs / Math.max(steps.length, 1);

  for (const step of steps) {
    checkCancelled(jobId, cancelledRef);
    await sleep(stepDelay);
    pipelineEvents.emit(jobId, "agent:progress", {
      agent: agentName,
      progress: step.progress,
      message: step.message,
    });
  }

  const costRecord = findRecord(cassette, agentName);
  let runningTotal = 0;
  for (const c of costs) runningTotal += c.costUsd;
  runningTotal += agentCost;
  recordDemoCost(jobId, costs, runningTotal, costRecord);

  db.insert(agentExecutions)
    .values({
      id: generateId(),
      jobId,
      agentName,
      executionOrder: getExecutionOrder(agentName),
      model: costRecord.model,
      wasEscalation: false,
      promptSent: "[demo mode]",
      responseReceived: "[demo mode]",
      structuredOutput: null,
      inputTokens: costRecord.inputTokens,
      outputTokens: costRecord.outputTokens,
      costUsd: agentCost,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: timing.durationMs,
      status: "completed",
      errorMessage: null,
    })
    .run();

  pipelineEvents.emit(jobId, "agent:complete", {
    agent: agentName,
    durationMs: timing.durationMs,
    costUsd: agentCost,
    summary,
  });
}

function getExecutionOrder(agent: string): number {
  const order: Record<string, number> = {
    "source-adapter": 1,
    "vision-analyzer": 2,
    "instruction-composer": 3,
    "guideline-enforcer": 4,
    "quality-reviewer": 5,
    "safety-reviewer": 6,
    "illustration-renderer": 7,
    "xml-assembler": 8,
  };
  return order[agent] ?? 0;
}
