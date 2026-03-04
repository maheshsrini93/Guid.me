import {
  AgentExhaustedError,
  PipelineCancelledError,
  DEFAULT_RETRY_CONFIG,
  type AgentName,
  type RetryConfig,
} from "./types";

/**
 * Determines if an error is retryable.
 * Retryable: HTTP 429, 500, 503, network timeout, JSON parse errors
 * Non-retryable: HTTP 400, validation errors, cancellation
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof PipelineCancelledError) return false;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Non-retryable status codes
    if (msg.includes("400") || msg.includes("bad request")) return false;
    if (msg.includes("401") || msg.includes("unauthorized")) return false;
    if (msg.includes("403") || msg.includes("forbidden")) return false;

    // Retryable status codes
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("500") || msg.includes("internal server")) return true;
    if (msg.includes("503") || msg.includes("unavailable")) return true;

    // Retryable: network/timeout errors
    if (msg.includes("timeout") || msg.includes("econnreset")) return true;
    if (msg.includes("econnrefused") || msg.includes("fetch failed")) return true;

    // Retryable: JSON parse errors (malformed model output)
    if (msg.includes("json") && msg.includes("parse")) return true;
    if (error instanceof SyntaxError) return true;
  }

  // Default: retry on unknown errors
  return true;
}

/**
 * Calculate delay with exponential backoff and jitter.
 * base * 2^attempt ± jitterFactor
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const exponential = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs,
  );
  const jitter = exponential * config.jitterFactor;
  return exponential + (Math.random() * 2 - 1) * jitter;
}

/**
 * Execute an async function with exponential backoff retries.
 * Throws AgentExhaustedError if all attempts fail.
 * Throws immediately on non-retryable errors.
 */
export async function withRetry<T>(
  agentName: AgentName,
  fn: (signal: AbortSignal) => Promise<T>,
  options?: {
    retryConfig?: Partial<RetryConfig>;
    isCancelled?: () => boolean;
  },
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    // Check cancellation before each attempt
    if (options?.isCancelled?.()) {
      throw new PipelineCancelledError("unknown");
    }

    try {
      // Create per-attempt abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const result = await fn(controller.signal);
        return result;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retryable errors
      if (!isRetryable(error)) {
        throw lastError;
      }

      // Don't wait after the last attempt
      if (attempt < config.maxAttempts - 1) {
        const delay = calculateDelay(attempt, config);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new AgentExhaustedError(agentName, config.maxAttempts, lastError);
}
