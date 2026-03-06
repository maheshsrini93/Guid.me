type Listener = (type: string, data: unknown) => void;

interface BufferedEvent {
  type: string;
  data: unknown;
}

/**
 * Job-scoped event emitter singleton with buffered replay.
 * Each job has its own set of listeners (SSE connections).
 * Events are buffered so late-connecting clients receive all prior events.
 */
class PipelineEventEmitter {
  private listeners = new Map<string, Set<Listener>>();
  private buffers = new Map<string, BufferedEvent[]>();

  /**
   * Subscribe to events for a specific job.
   * Replays all buffered events to the new listener, then delivers live events.
   * Returns an unsubscribe function.
   */
  subscribe(jobId: string, listener: Listener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    // Replay buffered events to the new subscriber
    const buffer = this.buffers.get(jobId);
    if (buffer) {
      for (const event of buffer) {
        try {
          listener(event.type, event.data);
        } catch {
          // Don't let a broken listener crash during replay
        }
      }
    }

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
   * Also buffers the event for late-connecting subscribers.
   */
  emit(jobId: string, type: string, data: unknown): void {
    // Buffer the event
    if (!this.buffers.has(jobId)) {
      this.buffers.set(jobId, []);
    }
    this.buffers.get(jobId)!.push({ type, data });

    // Deliver to current listeners
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
   * Remove all listeners and buffered events for a job (cleanup after pipeline completes/fails).
   */
  dispose(jobId: string): void {
    this.listeners.delete(jobId);
    this.buffers.delete(jobId);
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
