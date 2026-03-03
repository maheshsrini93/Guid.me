import { config } from "@/lib/config";

// ============================================================
// Model IDs (from config / environment)
// ============================================================

export const FLASH_MODEL = config.geminiFlashModel;
export const PRO_MODEL = config.geminiProModel;
export const IMAGE_MODEL = config.geminiImageModel;

// ============================================================
// Token Pricing (approximate, per Gemini API docs)
// ============================================================

/** Cost per 1M tokens, in USD */
interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash": { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5.0 },
};

/** Approximate cost per image generation */
const IMAGE_COST_USD = 0.04;

/**
 * Calculate the cost of a text generation call.
 * Falls back to Flash pricing for unknown models.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING[model] ?? PRICING["gemini-2.5-flash"];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // round to 6 decimal places
}

/** Get the approximate cost of an image generation */
export function getImageCost(): number {
  return IMAGE_COST_USD;
}
