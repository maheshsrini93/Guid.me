import { readFileSync } from "fs";
import path from "path";
import { parse } from "yaml";
import type { GuidelineFile, GuidelineRequirement } from "./schema";

const GUIDELINES_DIR = path.join(
  process.cwd(),
  "src",
  "lib",
  "guidelines",
);

// Singleton caches — load once, reuse
let wiCache: GuidelineFile | null = null;
let ilCache: GuidelineFile | null = null;
let wiRawCache: string | null = null;
let ilRawCache: string | null = null;

function readYaml(filename: string): string {
  return readFileSync(path.join(GUIDELINES_DIR, filename), "utf-8");
}

/** Load and parse work-instructions.yaml */
export function loadWorkInstructionGuidelines(): GuidelineFile {
  if (!wiCache) {
    const raw = readYaml("work-instructions.yaml");
    wiCache = parse(raw) as GuidelineFile;
  }
  return wiCache;
}

/** Load and parse illustrations.yaml */
export function loadIllustrationGuidelines(): GuidelineFile {
  if (!ilCache) {
    const raw = readYaml("illustrations.yaml");
    ilCache = parse(raw) as GuidelineFile;
  }
  return ilCache;
}

/** Get raw YAML string for prompt injection (no truncation) */
export function getGuidelinesAsString(
  type: "work-instructions" | "illustrations",
): string {
  if (type === "work-instructions") {
    if (!wiRawCache) wiRawCache = readYaml("work-instructions.yaml");
    return wiRawCache;
  }
  if (!ilRawCache) ilRawCache = readYaml("illustrations.yaml");
  return ilRawCache;
}

/** Filter specific requirements by their IDs (e.g., ["WI-001", "WI-015"]) */
export function getRequirementsByIds(ids: string[]): GuidelineRequirement[] {
  const idSet = new Set(ids);
  const results: GuidelineRequirement[] = [];

  const wi = loadWorkInstructionGuidelines();
  const il = loadIllustrationGuidelines();

  for (const guideline of [wi, il]) {
    for (const category of guideline.categories) {
      for (const req of category.requirements) {
        if (idSet.has(req.id)) {
          results.push(req);
        }
      }
    }
  }

  return results;
}
