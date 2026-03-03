/**
 * SSE (Server-Sent Events) response helper for Next.js App Router.
 *
 * Usage in a route handler:
 *   const { stream, sendEvent, close } = createSSEStream();
 *   // ... send events with sendEvent("agent:start", { agent: "..." })
 *   // ... call close() when done
 *   return new Response(stream, {
 *     headers: {
 *       "Content-Type": "text/event-stream",
 *       "Cache-Control": "no-cache",
 *       Connection: "keep-alive",
 *     },
 *   });
 */

export interface SSEController {
  /** The ReadableStream to pass to the Response constructor */
  stream: ReadableStream;
  /** Send a typed SSE event */
  sendEvent: (type: string, data: unknown) => void;
  /** Close the stream */
  close: () => void;
}

export function createSSEStream(): SSEController {
  let controller: ReadableStreamDefaultController | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      // Send a heartbeat comment every 30 seconds to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          controller?.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          // Stream may already be closed
        }
      }, 30_000);
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  const sendEvent = (type: string, data: unknown) => {
    if (!controller) return;
    try {
      const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(new TextEncoder().encode(payload));
    } catch {
      // Stream may already be closed
    }
  };

  const close = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    try {
      controller?.close();
    } catch {
      // Stream may already be closed
    }
  };

  return { stream, sendEvent, close };
}
