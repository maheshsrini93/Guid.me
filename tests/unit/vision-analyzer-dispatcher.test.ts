/**
 * Unit Tests: Vision Analyzer dispatcher (T-083) and CAD synthesis fallback (T-084).
 *
 * The dispatcher selects between document and CAD impls by inspecting
 * `state.extractedSource.structuredMetadata`. The CAD impl has a
 * "geometry-inferred" path that synthesizes RawFrameExtractions from the
 * ordered partsCatalog without making any Gemini calls — that path is fully
 * deterministic and testable here. The "explode-video" path requires real
 * Gemini calls and is exercised by T-098 (E2E).
 */
import { describe, it, expect } from "vitest";
import {
  documentVisionImpl,
  cadVisionImpl,
} from "@/lib/agents/vision-analyzer";
import { runVisionAnalyzer } from "@/lib/agents/vision-analyzer";
import type { PipelineState } from "@/types/pipeline";
import type {
  AgentContext,
  AgentExecutionRecord,
} from "@/lib/agents/types";
import type {
  StructuredMetadata,
  StructuredPartRef,
  AssemblyNode,
  RawFrameExtraction,
} from "@/types/agents";

function makeBaseState(jobId = "job-1"): PipelineState {
  return {
    jobId,
    status: "analyzing",
    documentPath: "/tmp/source.pdf",
    documentMimeType: "application/pdf",
    textRevisionCount: 0,
    costs: [],
    totalCostUsd: 0,
    startedAt: new Date(),
    lastProgressAt: new Date(),
  };
}

function makeStubContext(state: PipelineState): {
  ctx: AgentContext;
  emitted: Array<{ type: string; data: unknown }>;
  costs: unknown[];
  persisted: AgentExecutionRecord[];
} {
  const emitted: Array<{ type: string; data: unknown }> = [];
  const costs: unknown[] = [];
  const persisted: AgentExecutionRecord[] = [];
  const controller = new AbortController();

  const ctx: AgentContext = {
    jobId: state.jobId,
    pipelineState: state,
    signal: controller.signal,
    isCancelled: () => false,
    emit(type, data) {
      emitted.push({ type, data });
    },
    reportProgress() {
      // ignored for tests
    },
    recordCost(c) {
      costs.push(c);
    },
    async persistExecution(record) {
      persisted.push(record);
    },
  };

  return { ctx, emitted, costs, persisted };
}

function makeAssemblyTree(): AssemblyNode {
  return {
    id: "root",
    name: "Root Assembly",
    children: [
      { id: "root/base", name: "Base plate", children: [] },
      { id: "root/shaft", name: "Drive shaft", children: [] },
    ],
  };
}

function makePartsCatalog(): StructuredPartRef[] {
  return [
    { id: "root/base", name: "Base plate", quantity: 1 },
    { id: "root/shaft", name: "Drive shaft", quantity: 1 },
    { id: "root/bearing-a", name: "Front bearing", quantity: 1 },
    { id: "root/bearing-b", name: "Rear bearing", quantity: 1 },
    { id: "root/bolt", name: "M6 bolt", quantity: 4 },
  ];
}

function makeStructuredMetadata(
  overrides: Partial<StructuredMetadata> = {},
): StructuredMetadata {
  return {
    partsCatalog: makePartsCatalog(),
    assemblyTree: makeAssemblyTree(),
    sourceFormat: "step",
    sequenceSource: "geometry-inferred",
    sequenceConfidence: 0.7,
    ...overrides,
  };
}

describe("vision-analyzer dispatcher (T-083)", () => {
  it("documentVisionImpl handles state without structuredMetadata", () => {
    const state = makeBaseState();
    state.extractedSource = {
      frames: [
        { frameNumber: 1, imagePath: "/tmp/p1.png", width: 1024, height: 768, mimeType: "image/png" },
      ],
      documentMetadata: { filename: "manual.pdf", format: "pdf", pageCount: 1 },
      durationMs: 100,
    };
    expect(documentVisionImpl.canHandle(state)).toBe(true);
    expect(cadVisionImpl.canHandle(state)).toBe(false);
  });

  it("cadVisionImpl handles state with structuredMetadata", () => {
    const state = makeBaseState();
    state.extractedSource = {
      frames: [
        { frameNumber: 1, imagePath: "/tmp/f1.png", width: 1024, height: 768, mimeType: "image/png" },
        { frameNumber: 2, imagePath: "/tmp/f2.png", width: 1024, height: 768, mimeType: "image/png" },
      ],
      documentMetadata: { filename: "vise.step", format: "step", pageCount: 2 },
      structuredMetadata: makeStructuredMetadata(),
      durationMs: 5000,
    };
    expect(cadVisionImpl.canHandle(state)).toBe(true);
    expect(documentVisionImpl.canHandle(state)).toBe(false);
  });

  it("neither impl handles state without an extracted source", () => {
    const state = makeBaseState();
    expect(documentVisionImpl.canHandle(state)).toBe(false);
    expect(cadVisionImpl.canHandle(state)).toBe(false);
  });

  it("dispatcher throws AgentValidationError when no impl matches", async () => {
    const state = makeBaseState();
    const { ctx } = makeStubContext(state);
    await expect(runVisionAnalyzer(ctx)).rejects.toThrow(/No vision-analyzer sub-implementation/);
  });
});

describe("cadVisionImpl geometry-inferred fallback (T-084)", () => {
  it("synthesizes one frame extraction per Component without Gemini calls", async () => {
    const state = makeBaseState();
    const meta = makeStructuredMetadata({
      sequenceSource: "geometry-inferred",
      sequenceConfidence: 0.6,
    });
    state.extractedSource = {
      frames: [
        // 4 multi-view renders for the geometry-inferred path
        { frameNumber: 1, imagePath: "/tmp/iso.png", width: 1024, height: 768, mimeType: "image/png" },
        { frameNumber: 2, imagePath: "/tmp/top.png", width: 1024, height: 768, mimeType: "image/png" },
        { frameNumber: 3, imagePath: "/tmp/front.png", width: 1024, height: 768, mimeType: "image/png" },
        { frameNumber: 4, imagePath: "/tmp/side.png", width: 1024, height: 768, mimeType: "image/png" },
      ],
      documentMetadata: { filename: "vise.step", format: "step", pageCount: 4 },
      structuredMetadata: meta,
      durationMs: 5000,
    };

    const { ctx, costs, persisted, emitted } = makeStubContext(state);
    const result = await cadVisionImpl.run(ctx);

    // One step extraction per Component
    expect(result.output).toHaveLength(meta.partsCatalog.length);
    for (let i = 0; i < result.output.length; i++) {
      const ext: RawFrameExtraction = result.output[i];
      expect(ext.steps).toHaveLength(1);
      expect(ext.steps[0].stepNumber).toBe(i + 1);
      expect(ext.steps[0].confidence).toBeCloseTo(meta.sequenceConfidence, 5);
      expect(ext.steps[0].partsShown).toEqual([]);
      expect(ext.steps[0].toolsShown).toEqual([]);
      expect(ext.steps[0].fasteners).toEqual([]);
      expect(ext.steps[0].actions).toHaveLength(1);
      expect(ext.steps[0].actions[0].subject).toBe(meta.partsCatalog[i].name);
      expect(ext.pageType).toBe("assembly");
    }

    // No Gemini calls => zero cost, modelUsed = "code"
    expect(result.costUsd).toBe(0);
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(result.model).toBe("code");

    // Emitted lifecycle events
    const emittedTypes = emitted.map((e) => e.type);
    expect(emittedTypes).toContain("agent:start");
    expect(emittedTypes).toContain("agent:complete");

    // One cost record (zero cost is still recorded)
    expect(costs).toHaveLength(1);

    // One persisted execution row
    expect(persisted).toHaveLength(1);
    expect(persisted[0].agentName).toBe("vision-analyzer");
    expect(persisted[0].status).toBe("completed");
  });

  it("first step uses 'Place' verb, subsequent steps use 'Attach'", async () => {
    const state = makeBaseState();
    state.extractedSource = {
      frames: [
        { frameNumber: 1, imagePath: "/tmp/iso.png", width: 1024, height: 768, mimeType: "image/png" },
      ],
      documentMetadata: { filename: "vise.step", format: "step", pageCount: 1 },
      structuredMetadata: makeStructuredMetadata({ sequenceSource: "geometry-inferred" }),
      durationMs: 100,
    };
    const { ctx } = makeStubContext(state);
    const result = await cadVisionImpl.run(ctx);

    expect(result.output[0].steps[0].actions[0].actionType).toBe("Place");
    expect(result.output[0].steps[0].actions[0].target).toBe("workspace");
    for (let i = 1; i < result.output.length; i++) {
      expect(result.output[i].steps[0].actions[0].actionType).toBe("Attach");
      expect(result.output[i].steps[0].actions[0].target).toBe("previously-installed assembly");
    }
  });

  it("flags two-person handling when a Component is heavy or large", async () => {
    const state = makeBaseState();
    const meta: StructuredMetadata = {
      partsCatalog: [
        { id: "root/heavy", name: "Heavy plate", quantity: 1, mass: 25 },
        { id: "root/light", name: "Light bracket", quantity: 1, mass: 0.5 },
      ],
      assemblyTree: makeAssemblyTree(),
      sourceFormat: "step",
      sequenceSource: "geometry-inferred",
      sequenceConfidence: 0.6,
    };
    state.extractedSource = {
      frames: [
        { frameNumber: 1, imagePath: "/tmp/iso.png", width: 1024, height: 768, mimeType: "image/png" },
      ],
      documentMetadata: { filename: "vise.step", format: "step", pageCount: 1 },
      structuredMetadata: meta,
      durationMs: 100,
    };
    const { ctx } = makeStubContext(state);
    const result = await cadVisionImpl.run(ctx);

    expect(result.output[0].pageIndicators.hasTwoPersonWarning).toBe(true);
    expect(result.output[1].pageIndicators.hasTwoPersonWarning).toBe(false);
  });

  it("clamps invalid sequenceConfidence to [0, 1]", async () => {
    const state = makeBaseState();
    state.extractedSource = {
      frames: [
        { frameNumber: 1, imagePath: "/tmp/iso.png", width: 1024, height: 768, mimeType: "image/png" },
      ],
      documentMetadata: { filename: "vise.step", format: "step", pageCount: 1 },
      structuredMetadata: makeStructuredMetadata({
        sequenceSource: "geometry-inferred",
        sequenceConfidence: 1.5, // invalid: too high
      }),
      durationMs: 100,
    };
    const { ctx } = makeStubContext(state);
    const result = await cadVisionImpl.run(ctx);
    expect(result.output[0].steps[0].confidence).toBeLessThanOrEqual(1);
    expect(result.output[0].steps[0].confidence).toBeGreaterThanOrEqual(0);
  });
});
