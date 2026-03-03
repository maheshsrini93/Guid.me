/**
 * Simple token-bucket rate limiter for Gemini API calls.
 * Prevents 429 errors by throttling requests per model.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
  rpm: number;
}

const buckets = new Map<string, Bucket>();

/** Default RPM limits per model tier */
const DEFAULT_RPM: Record<string, number> = {
  flash: 60,
  pro: 10,
  image: 10,
};

function getModelTier(model: string): string {
  if (model.includes("pro")) return "pro";
  if (model.includes("image")) return "image";
  return "flash";
}

function getBucket(model: string): Bucket {
  const tier = getModelTier(model);
  if (!buckets.has(tier)) {
    const rpm = DEFAULT_RPM[tier] ?? 30;
    buckets.set(tier, {
      tokens: rpm,
      lastRefill: Date.now(),
      rpm,
    });
  }
  return buckets.get(tier)!;
}

function refill(bucket: Bucket): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = (elapsed / 60_000) * bucket.rpm;
  bucket.tokens = Math.min(bucket.rpm, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

/**
 * Wait until a request slot is available for the given model.
 * Resolves immediately if capacity is available.
 */
export async function waitForSlot(model: string): Promise<void> {
  const bucket = getBucket(model);
  refill(bucket);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return;
  }

  // Wait until a token becomes available
  const waitMs = ((1 - bucket.tokens) / bucket.rpm) * 60_000;
  await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
  refill(bucket);
  bucket.tokens -= 1;
}
