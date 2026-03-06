import { config, MODEL_PRICING, IMAGE_COST_USD } from "@/lib/config";

// ============================================================
// Model IDs (from config / environment)
// ============================================================

export const FLASH_MODEL = config.geminiFlashModel;
export const PRO_MODEL = config.geminiProModel;
export const IMAGE_MODEL = config.geminiImageModel;

/**
 * Calculate the cost of a text generation call.
 * Falls back to Flash pricing for unknown models.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["gemini-3.1-flash-lite-preview"];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // round to 6 decimal places
}

/** Get the approximate cost of an image generation */
export function getImageCost(): number {
  return IMAGE_COST_USD;
}
