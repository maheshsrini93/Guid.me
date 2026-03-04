type Listener = (type: string, data: unknown) => void;

/**
 * Job-scoped event emitter singleton.
 * Each job has its own set of listeners (SSE connections).
 * Events are only delivered to listeners for that specific jobId.
 */
class PipelineEventEmitter {
  private listeners = new Map<string, Set<Listener>>();

  /**
   * Subscribe to events for a specific job.
   * Returns an unsubscribe function.
   */
  subscribe(jobId: string, listener: Listener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    return () => {
      const set = this.listeners.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(jobId);
        }
      }
    };
  }

  /**
   * Emit an event to all listeners for a specific job.
   */
  emit(jobId: string, type: string, data: unknown): void {
    const set = this.listeners.get(jobId);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(type, data);
      } catch {
        // Don't let a broken listener crash the pipeline
      }
    }
  }

  /**
   * Remove all listeners for a job (cleanup after pipeline completes/fails).
   */
  dispose(jobId: string): void {
    this.listeners.delete(jobId);
  }

  /**
   * Check if a job has any active listeners.
   */
  hasListeners(jobId: string): boolean {
    const set = this.listeners.get(jobId);
    return !!set && set.size > 0;
  }
}

/** Singleton instance shared across the application */
export const pipelineEvents = new PipelineEventEmitter();
