/**
 * Multi-view renderer (T-080).
 *
 * Renders an Assembly to PNG images from canonical orthographic views (top,
 * front, side) plus an isometric perspective. Used both by:
 *   - the STEP-only sequence-inference fallback (T-081), which feeds the
 *     four views to Gemini Pro as visual context, and
 *   - the per-step CAD illustration renderer (T-088), which uses the same
 *     base setup with per-step opacity overrides.
 *
 * Implementation notes
 * ====================
 *
 * **Why a software rasterizer instead of headless-gl/WebGL?** The original
 * plan was three.js + headless-gl (`gl` npm package). On macOS with a
 * worktree path that contains spaces, node-gyp's clang invocation breaks
 * (clang interprets the spaces as argument separators). Rather than ship a
 * fragile native dependency that fails on a path with a space — and since
 * the demo asset's triangle count is small (~50k tris) — we render in pure
 * JS using a barycentric-coord triangle rasterizer with a Z-buffer. The
 * external API is identical to what a three.js implementation would expose,
 * so we can swap the backend later without touching callers.
 *
 * **What about three.js?** We *do* import three.js for its battle-tested
 * `Vector3` / `Matrix4` / `Box3` math classes — there's no point in
 * reimplementing those. We just don't use the `WebGLRenderer`.
 */
import { Vector3, Matrix4 } from "three";
import { PNG } from "pngjs";
import { writeFile } from "fs/promises";
import path from "path";
import type { ParsedMesh } from "@/lib/agents/source-adapter/cad/step-parser";

// ============================================================
// Public types
// ============================================================

export type ViewName = "top" | "front" | "side" | "isometric";

export interface RenderViewOptions {
  /** Output image width in pixels. Default 1024. */
  width?: number;
  /** Output image height in pixels. Default 1024. */
  height?: number;
  /**
   * Per-component opacity overrides (0-1). Components not in this map are
   * fully opaque. Components with opacity 0 are skipped entirely. Used by
   * the CAD illustration renderer (T-087) to fade installed Parts (IL-008).
   */
  opacityByComponentId?: Record<string, number>;
  /**
   * Background color as [r, g, b] in 0-255. Default white.
   */
  backgroundColor?: [number, number, number];
}

export interface RenderedView {
  view: ViewName;
  width: number;
  height: number;
  /** PNG file path on disk */
  filePath: string;
}

export interface MultiViewRenders {
  views: RenderedView[];
}

// ============================================================
// Public API
// ============================================================

/**
 * Render the four canonical views (top, front, side, isometric) of an
 * Assembly to PNG files in `outputDir`. Returns paths and dimensions.
 *
 * Camera framing is auto-derived from the union bounding box of all
 * (visible) meshes — i.e., we always render the full Assembly tightly.
 */
export async function renderAssemblyViews(
  meshes: ParsedMesh[],
  outputDir: string,
  opts: RenderViewOptions = {},
): Promise<MultiViewRenders> {
  const views: ViewName[] = ["top", "front", "side", "isometric"];
  const out: RenderedView[] = [];
  for (const v of views) {
    const filePath = path.join(outputDir, `view-${v}.png`);
    await renderSingleView(meshes, v, filePath, opts);
    out.push({
      view: v,
      width: opts.width ?? 1024,
      height: opts.height ?? 1024,
      filePath,
    });
  }
  return { views: out };
}

/**
 * Render a single view to a PNG file. Exposed so callers (e.g. T-087's
 * per-step illustration renderer) can render just the isometric view per
 * step without re-rendering the other three.
 */
export async function renderSingleView(
  meshes: ParsedMesh[],
  view: ViewName,
  filePath: string,
  opts: RenderViewOptions = {},
): Promise<void> {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const opacityMap = opts.opacityByComponentId ?? {};
  const bg = opts.backgroundColor ?? [255, 255, 255];

  // Filter visible meshes
  const visible = meshes.filter((m) => (opacityMap[m.componentId] ?? 1) > 0);
  if (visible.length === 0) {
    await writeBlankPng(filePath, width, height, bg);
    return;
  }

  const bbox = computeAssemblyBBox(meshes);
  const camera = makeCamera(view, bbox, width, height);

  // Framebuffer (RGBA) and Z-buffer.
  const framebuffer = new Uint8Array(width * height * 4);
  fillBackground(framebuffer, width, height, bg);
  const zbuffer = new Float32Array(width * height);
  zbuffer.fill(Infinity);

  const lightDir = new Vector3(0.5, -0.5, 0.7).normalize();

  for (const mesh of visible) {
    const opacity = opacityMap[mesh.componentId] ?? 1;
    rasterizeMesh(mesh, camera, framebuffer, zbuffer, width, height, lightDir, opacity, bg);
  }

  await writePng(filePath, framebuffer, width, height);
}

// ============================================================
// Camera setup
// ============================================================

interface Camera {
  /** World → clip-space matrix */
  matrix: Matrix4;
  /** Projection kind (used for triangle culling) */
  kind: "ortho" | "perspective";
}

/**
 * Build a camera that frames the entire bounding box. For ortho views, the
 * frustum is sized to the box's diagonal projected onto the view plane;
 * for the isometric view, we use a moderate FOV with the camera placed
 * back along the view direction far enough to fit the box.
 */
function makeCamera(
  view: ViewName,
  bbox: { min: Vector3; max: Vector3 },
  width: number,
  height: number,
): Camera {
  const center = new Vector3()
    .addVectors(bbox.min, bbox.max)
    .multiplyScalar(0.5);
  const size = new Vector3().subVectors(bbox.max, bbox.min);
  const maxExtent = Math.max(size.x, size.y, size.z, 1e-6);

  // Camera direction (looking from → to)
  const cameraOffset = new Vector3();
  const up = new Vector3(0, 1, 0);
  switch (view) {
    case "top": // looking down -Y
      cameraOffset.set(0, maxExtent * 3, 0);
      up.set(0, 0, -1);
      break;
    case "front": // looking down -Z
      cameraOffset.set(0, 0, maxExtent * 3);
      break;
    case "side": // looking down -X
      cameraOffset.set(maxExtent * 3, 0, 0);
      break;
    case "isometric":
      cameraOffset.set(maxExtent * 1.8, maxExtent * 1.6, maxExtent * 2.0);
      break;
  }

  const cameraPos = new Vector3().addVectors(center, cameraOffset);

  const viewMatrix = new Matrix4().lookAt(cameraPos, center, up);
  // lookAt produces a *world* basis matrix. Invert for camera-to-world view.
  viewMatrix.setPosition(cameraPos);
  const view4 = new Matrix4().copy(viewMatrix).invert();

  let projMatrix: Matrix4;
  if (view === "isometric") {
    // Perspective projection — moderate FOV
    const fov = 30 * (Math.PI / 180);
    const aspect = width / height;
    const near = maxExtent * 0.1;
    const far = maxExtent * 10;
    projMatrix = makePerspective(fov, aspect, near, far);
    return {
      matrix: new Matrix4().multiplyMatrices(projMatrix, view4),
      kind: "perspective",
    };
  } else {
    // Orthographic projection — fit box with 5% padding
    const halfExtent = (maxExtent / 2) * 1.1;
    projMatrix = makeOrthographic(
      -halfExtent,
      halfExtent,
      -halfExtent,
      halfExtent,
      maxExtent * 0.1,
      maxExtent * 10,
    );
    return {
      matrix: new Matrix4().multiplyMatrices(projMatrix, view4),
      kind: "ortho",
    };
  }
}

function makePerspective(fovY: number, aspect: number, near: number, far: number): Matrix4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Matrix4();
  // Column-major (three.js convention)
  m.set(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), (2 * far * near) / (near - far),
    0, 0, -1, 0,
  );
  return m;
}

function makeOrthographic(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Matrix4 {
  const m = new Matrix4();
  const w = right - left;
  const h = top - bottom;
  const d = far - near;
  m.set(
    2 / w, 0, 0, -(right + left) / w,
    0, 2 / h, 0, -(top + bottom) / h,
    0, 0, -2 / d, -(far + near) / d,
    0, 0, 0, 1,
  );
  return m;
}

// ============================================================
// Rasterization
// ============================================================

const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _e1 = new Vector3();
const _e2 = new Vector3();
const _normal = new Vector3();

/**
 * Rasterize all triangles of a mesh into the framebuffer with z-buffering
 * and flat (per-triangle) Lambert shading.
 */
function rasterizeMesh(
  mesh: ParsedMesh,
  camera: Camera,
  framebuffer: Uint8Array,
  zbuffer: Float32Array,
  width: number,
  height: number,
  lightDir: Vector3,
  opacity: number,
  bg: [number, number, number],
): void {
  const positions = mesh.positions;
  const indices = mesh.indices;
  // mesh.color is documented as [0, 1] (per step-parser.ts), but the rest of
  // the renderer works in 0-255. Scale here so colored STEP parts don't wash
  // out to black after the lambert shade multiplier.
  const baseColor: [number, number, number] = mesh.color
    ? [mesh.color[0] * 255, mesh.color[1] * 255, mesh.color[2] * 255]
    : defaultColorFor(mesh.componentId);

  // Project all vertices once.
  const vertexCount = positions.length / 3;
  const projected = new Float32Array(vertexCount * 4); // x, y, z, w
  for (let i = 0; i < vertexCount; i++) {
    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    const m = camera.matrix.elements;
    // three.js Matrix4 elements are column-major
    const x = m[0] * px + m[4] * py + m[8] * pz + m[12];
    const y = m[1] * px + m[5] * py + m[9] * pz + m[13];
    const z = m[2] * px + m[6] * py + m[10] * pz + m[14];
    const w = m[3] * px + m[7] * py + m[11] * pz + m[15];
    projected[i * 4] = x;
    projected[i * 4 + 1] = y;
    projected[i * 4 + 2] = z;
    projected[i * 4 + 3] = w;
  }

  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t];
    const i1 = indices[t + 1];
    const i2 = indices[t + 2];

    // Compute face normal in world space (for shading; lit independent of camera).
    _v0.set(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
    _v1.set(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
    _v2.set(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
    _e1.subVectors(_v1, _v0);
    _e2.subVectors(_v2, _v0);
    _normal.crossVectors(_e1, _e2);
    const nLen = _normal.length();
    if (nLen < 1e-12) continue; // degenerate triangle
    _normal.divideScalar(nLen);

    const lambert = Math.max(0, _normal.dot(lightDir));
    const shade = 0.35 + 0.65 * lambert; // ambient + diffuse
    const r = baseColor[0] * shade;
    const g = baseColor[1] * shade;
    const b = baseColor[2] * shade;

    // Get clip-space verts; do perspective divide; convert to screen-space.
    const sx0 = projected[i0 * 4];
    const sy0 = projected[i0 * 4 + 1];
    const sz0 = projected[i0 * 4 + 2];
    const sw0 = projected[i0 * 4 + 3];

    const sx1 = projected[i1 * 4];
    const sy1 = projected[i1 * 4 + 1];
    const sz1 = projected[i1 * 4 + 2];
    const sw1 = projected[i1 * 4 + 3];

    const sx2 = projected[i2 * 4];
    const sy2 = projected[i2 * 4 + 1];
    const sz2 = projected[i2 * 4 + 2];
    const sw2 = projected[i2 * 4 + 3];

    if (sw0 <= 0 || sw1 <= 0 || sw2 <= 0) continue; // behind camera (perspective)

    const ndc0x = sx0 / sw0;
    const ndc0y = sy0 / sw0;
    const ndc0z = sz0 / sw0;
    const ndc1x = sx1 / sw1;
    const ndc1y = sy1 / sw1;
    const ndc1z = sz1 / sw1;
    const ndc2x = sx2 / sw2;
    const ndc2y = sy2 / sw2;
    const ndc2z = sz2 / sw2;

    const px0 = (ndc0x * 0.5 + 0.5) * width;
    const py0 = (1 - (ndc0y * 0.5 + 0.5)) * height; // flip Y
    const px1 = (ndc1x * 0.5 + 0.5) * width;
    const py1 = (1 - (ndc1y * 0.5 + 0.5)) * height;
    const px2 = (ndc2x * 0.5 + 0.5) * width;
    const py2 = (1 - (ndc2y * 0.5 + 0.5)) * height;

    // Backface cull in screen space (drop CCW after Y-flip ⇒ keep CW).
    const screenCross = (px1 - px0) * (py2 - py0) - (py1 - py0) * (px2 - px0);
    if (screenCross >= 0) continue;

    rasterizeTriangle(
      framebuffer, zbuffer, width, height,
      px0, py0, ndc0z,
      px1, py1, ndc1z,
      px2, py2, ndc2z,
      r, g, b,
      opacity, bg,
    );
  }
}

/**
 * Scan-line triangle rasterizer using barycentric coordinates. Z-tests in
 * NDC space (−1 = near, +1 = far). Writes RGB to framebuffer when test
 * passes; alpha is always 255 (we composite manually for opacity).
 */
function rasterizeTriangle(
  framebuffer: Uint8Array,
  zbuffer: Float32Array,
  width: number,
  height: number,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  r: number, g: number, b: number,
  opacity: number,
  bg: [number, number, number],
): void {
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1, y2)));

  if (minX > maxX || minY > maxY) return;

  const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (Math.abs(denom) < 1e-9) return;
  const invDenom = 1 / denom;

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const w0 = ((y1 - y2) * (px + 0.5 - x2) + (x2 - x1) * (py + 0.5 - y2)) * invDenom;
      const w1 = ((y2 - y0) * (px + 0.5 - x2) + (x0 - x2) * (py + 0.5 - y2)) * invDenom;
      const w2 = 1 - w0 - w1;

      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const z = w0 * z0 + w1 * z1 + w2 * z2;
      const idx = py * width + px;
      if (z < zbuffer[idx]) {
        zbuffer[idx] = z;
        const fbIdx = idx * 4;
        if (opacity >= 0.999) {
          framebuffer[fbIdx] = clamp255(r);
          framebuffer[fbIdx + 1] = clamp255(g);
          framebuffer[fbIdx + 2] = clamp255(b);
          framebuffer[fbIdx + 3] = 255;
        } else {
          // Composite over background (we don't have under-pixel info because
          // z-buffer only keeps a single sample). Acceptable approximation
          // for fade-installed-parts opacity in IL-008.
          const a = opacity;
          framebuffer[fbIdx] = clamp255(r * a + bg[0] * (1 - a));
          framebuffer[fbIdx + 1] = clamp255(g * a + bg[1] * (1 - a));
          framebuffer[fbIdx + 2] = clamp255(b * a + bg[2] * (1 - a));
          framebuffer[fbIdx + 3] = 255;
        }
      }
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function computeAssemblyBBox(meshes: ParsedMesh[]): { min: Vector3; max: Vector3 } {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const m of meshes) {
    if (m.boundingBox.min[0] < min.x) min.x = m.boundingBox.min[0];
    if (m.boundingBox.min[1] < min.y) min.y = m.boundingBox.min[1];
    if (m.boundingBox.min[2] < min.z) min.z = m.boundingBox.min[2];
    if (m.boundingBox.max[0] > max.x) max.x = m.boundingBox.max[0];
    if (m.boundingBox.max[1] > max.y) max.y = m.boundingBox.max[1];
    if (m.boundingBox.max[2] > max.z) max.z = m.boundingBox.max[2];
  }
  if (!isFinite(min.x)) {
    min.set(0, 0, 0);
    max.set(1, 1, 1);
  }
  return { min, max };
}

function fillBackground(
  framebuffer: Uint8Array,
  width: number,
  height: number,
  bg: [number, number, number],
): void {
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    framebuffer[idx] = bg[0];
    framebuffer[idx + 1] = bg[1];
    framebuffer[idx + 2] = bg[2];
    framebuffer[idx + 3] = 255;
  }
}

/**
 * Stable hash → palette assignment. Used when a mesh has no explicit color
 * in the STEP attributes — gives consistent per-Component coloration across
 * pipeline runs.
 */
function defaultColorFor(componentId: string): [number, number, number] {
  const palette: Array<[number, number, number]> = [
    [180, 70, 70],   // muted red
    [70, 130, 180],  // steel blue
    [120, 160, 80],  // olive green
    [200, 150, 60],  // ochre
    [140, 100, 170], // muted purple
    [80, 160, 160],  // teal
    [200, 110, 130], // dusty rose
    [110, 130, 100], // sage
    [180, 130, 90],  // tan
    [90, 110, 150],  // slate
  ];
  let hash = 0;
  for (let i = 0; i < componentId.length; i++) {
    hash = ((hash << 5) - hash + componentId.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function clamp255(x: number): number {
  if (x < 0) return 0;
  if (x > 255) return 255;
  return x | 0;
}

// ============================================================
// PNG output
// ============================================================

async function writePng(
  filePath: string,
  framebuffer: Uint8Array,
  width: number,
  height: number,
): Promise<void> {
  const png = new PNG({ width, height });
  png.data = Buffer.from(framebuffer.buffer, framebuffer.byteOffset, framebuffer.byteLength);
  const buf = PNG.sync.write(png);
  await writeFile(filePath, buf);
}

async function writeBlankPng(
  filePath: string,
  width: number,
  height: number,
  bg: [number, number, number],
): Promise<void> {
  const fb = new Uint8Array(width * height * 4);
  fillBackground(fb, width, height, bg);
  await writePng(filePath, fb, width, height);
}
