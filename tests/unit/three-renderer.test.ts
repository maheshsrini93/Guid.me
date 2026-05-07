/**
 * Unit Tests: software multi-view renderer (T-080)
 *
 * The renderer produces PNGs from triangle-mesh data. We render a synthetic
 * mesh (a unit cube and a single triangle) and check that:
 *   - the output PNG is the requested dimensions
 *   - the output is not pure background (i.e. *something* got rasterized)
 *   - opacity overrides correctly skip components when set to 0
 *
 * We don't pixel-compare against a golden image — that would be brittle.
 * Instead we sample stats: non-background pixel count, depth-buffer
 * differences across views, etc.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { mkdir, readFile, rm } from "fs/promises";
import path from "path";
import os from "os";
import { PNG } from "pngjs";
import {
  renderAssemblyViews,
  renderSingleView,
} from "@/lib/render/three-renderer";
import type { ParsedMesh } from "@/lib/agents/source-adapter/cad/step-parser";

function makeUnitCubeMesh(componentId: string, offset: [number, number, number]): ParsedMesh {
  // 8 corners of a unit cube, translated by offset.
  const [ox, oy, oz] = offset;
  const positions = new Float32Array([
    ox + 0, oy + 0, oz + 0,
    ox + 1, oy + 0, oz + 0,
    ox + 1, oy + 1, oz + 0,
    ox + 0, oy + 1, oz + 0,
    ox + 0, oy + 0, oz + 1,
    ox + 1, oy + 0, oz + 1,
    ox + 1, oy + 1, oz + 1,
    ox + 0, oy + 1, oz + 1,
  ]);
  // 12 triangles (2 per face, CCW when viewed from outside)
  const indices = new Uint32Array([
    // -Z face (z=0): viewed from -Z, CCW is 0,3,2 / 0,2,1
    0, 3, 2, 0, 2, 1,
    // +Z face (z=1): viewed from +Z, CCW is 4,5,6 / 4,6,7
    4, 5, 6, 4, 6, 7,
    // -Y face: 0,1,5 / 0,5,4
    0, 1, 5, 0, 5, 4,
    // +Y face: 3,7,6 / 3,6,2
    3, 7, 6, 3, 6, 2,
    // -X face: 0,4,7 / 0,7,3
    0, 4, 7, 0, 7, 3,
    // +X face: 1,2,6 / 1,6,5
    1, 2, 6, 1, 6, 5,
  ]);

  const min: [number, number, number] = [ox, oy, oz];
  const max: [number, number, number] = [ox + 1, oy + 1, oz + 1];
  return {
    componentId,
    occtMeshIndex: 0,
    positions,
    normals: null,
    indices,
    color: [200, 100, 100],
    boundingBox: { min, max },
  };
}

async function decodePng(filePath: string): Promise<{ data: Buffer; width: number; height: number }> {
  const buf = await readFile(filePath);
  return new Promise((resolve, reject) => {
    new PNG().parse(buf, (err, png) => {
      if (err) return reject(err);
      resolve({ data: png.data, width: png.width, height: png.height });
    });
  });
}

function countNonBackgroundPixels(
  data: Buffer,
  bg: [number, number, number] = [255, 255, 255],
): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== bg[0] || data[i + 1] !== bg[1] || data[i + 2] !== bg[2]) {
      n++;
    }
  }
  return n;
}

describe("renderAssemblyViews", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = path.join(os.tmpdir(), `guid-renderer-test-${Date.now()}`);
    await mkdir(outDir, { recursive: true });
  });

  it("produces top, front, side, isometric PNGs", async () => {
    const meshes = [
      makeUnitCubeMesh("cube-A", [0, 0, 0]),
      makeUnitCubeMesh("cube-B", [2, 0, 0]),
    ];
    const result = await renderAssemblyViews(meshes, outDir, {
      width: 256,
      height: 256,
    });
    expect(result.views).toHaveLength(4);
    const names = result.views.map((v) => v.view).sort();
    expect(names).toEqual(["front", "isometric", "side", "top"]);

    for (const v of result.views) {
      const png = await decodePng(v.filePath);
      expect(png.width).toBe(256);
      expect(png.height).toBe(256);
      const visible = countNonBackgroundPixels(png.data);
      expect(visible).toBeGreaterThan(100); // something got rasterized
    }
  });

  it("respects opacity overrides — opacity 0 hides a component", async () => {
    const meshes = [
      makeUnitCubeMesh("visible", [0, 0, 0]),
      makeUnitCubeMesh("hidden", [10, 0, 0]),
    ];

    const visiblePath = path.join(outDir, "vis.png");
    const hiddenPath = path.join(outDir, "hide.png");

    await renderSingleView(meshes, "isometric", visiblePath, {
      width: 256,
      height: 256,
    });

    await renderSingleView(meshes, "isometric", hiddenPath, {
      width: 256,
      height: 256,
      opacityByComponentId: { hidden: 0 },
    });

    const visiblePng = await decodePng(visiblePath);
    const hiddenPng = await decodePng(hiddenPath);
    const visibleN = countNonBackgroundPixels(visiblePng.data);
    const hiddenN = countNonBackgroundPixels(hiddenPng.data);
    expect(hiddenN).toBeLessThan(visibleN);
  });

  it("falls back to a blank PNG when no meshes are visible", async () => {
    const meshes = [makeUnitCubeMesh("hidden", [0, 0, 0])];
    const filePath = path.join(outDir, "blank.png");
    await renderSingleView(meshes, "front", filePath, {
      width: 64,
      height: 64,
      opacityByComponentId: { hidden: 0 },
    });
    const png = await decodePng(filePath);
    expect(png.width).toBe(64);
    expect(countNonBackgroundPixels(png.data)).toBe(0);
  });

  afterAll(async () => {
    try {
      await rm(outDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });
});

// vitest globals provide afterAll, but the import block is module-scope;
// a stub keeps TypeScript happy without changing runtime behavior.
declare const afterAll: (fn: () => Promise<void> | void) => void;
