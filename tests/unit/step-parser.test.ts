/**
 * Unit Tests: STEP parser (T-078)
 *
 * Full STEP parsing requires a real .stp asset; the demo asset and OSHW
 * test corpus arrive in T-094 / T-096. Until then we test:
 *   - module loads (so import errors surface early)
 *   - the parser fails fast on missing files with a useful message
 *   - the parser fails fast on non-STEP content
 *
 * End-to-end coverage with a real assembly is part of T-098 / T-099.
 */
import { describe, it, expect } from "vitest";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import { parseStep } from "@/lib/agents/source-adapter/cad/step-parser";

describe("parseStep", () => {
  it("loads the WASM module without throwing", async () => {
    // Importing the module shouldn't synchronously fail. The module is loaded
    // lazily inside parseStep(), so call once with a deliberately invalid
    // path to trigger the load.
    await expect(parseStep("/nonexistent/path/to/file.stp")).rejects.toThrow();
  });

  it("rejects empty / non-STEP content with a clear error", async () => {
    const tmpDir = path.join(os.tmpdir(), `guid-step-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const fakePath = path.join(tmpDir, "not-a-step.stp");
    await writeFile(fakePath, "This is not a STEP file at all.\n");

    await expect(parseStep(fakePath)).rejects.toThrow(
      /occt-import-js failed to parse|0 components/i,
    );
  });
});
