export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY!,
  databaseUrl: process.env.DATABASE_URL ?? "file:./storage/guid.db",
  storagePath: process.env.STORAGE_PATH ?? "./storage",
  geminiFlashModel: process.env.GEMINI_FLASH_MODEL ?? "gemini-2.5-flash",
  geminiProModel: process.env.GEMINI_PRO_MODEL ?? "gemini-2.5-pro",
  geminiImageModel:
    process.env.GEMINI_IMAGE_MODEL ??
    "gemini-2.5-flash-image",
  qualityThreshold: parseInt(process.env.QUALITY_THRESHOLD ?? "85", 10),
  maxRevisionLoops: parseInt(process.env.MAX_REVISION_LOOPS ?? "2", 10),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? "50", 10),
  demoMode: process.env.DEMO_MODE === "true",
  logLevel: process.env.LOG_LEVEL ?? "info",
  /** Per-agent timeout in milliseconds (default 60s) */
  agentTimeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS ?? "60000", 10),
} as const;

// ============================================================
// Model Pricing (USD per 1M tokens, per Gemini API docs)
// ============================================================

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash": { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5.0 },
};

/** Flat cost per generated image (USD) */
export const IMAGE_COST_USD = 0.04;
