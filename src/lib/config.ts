export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY!,
  databaseUrl: process.env.DATABASE_URL ?? "file:./storage/guid.db",
  storagePath: process.env.STORAGE_PATH ?? "./storage",
  geminiFlashModel: process.env.GEMINI_FLASH_MODEL ?? "gemini-2.5-flash",
  geminiProModel: process.env.GEMINI_PRO_MODEL ?? "gemini-2.5-pro",
  geminiImageModel:
    process.env.GEMINI_IMAGE_MODEL ??
    "gemini-2.5-flash-preview-image-generation",
  qualityThreshold: parseInt(process.env.QUALITY_THRESHOLD ?? "85", 10),
  maxRevisionLoops: parseInt(process.env.MAX_REVISION_LOOPS ?? "2", 10),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? "50", 10),
  demoMode: process.env.DEMO_MODE === "true",
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;
