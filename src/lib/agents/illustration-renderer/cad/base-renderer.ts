/**
 * CAD per-step base renderer (T-087).
 *
 * Renders the isometric view of an Assembly for a single step with the
 * IL-008 opacity policy applied:
 *   - active components → opacity 1.0
 *   - previously-installed components → opacity 0.3
 *   - everything else → 0 (skipped by `renderSingleView`)
 *
 * Delegates rasterization to {@link renderSingleView} so we don't duplicate
 * the camera, lighting, or z-buffer logic. In addition to the PNG, this
 * module exposes `project(componentId)` and `boundsOnScreen(componentId)`
 * helpers used by the overlay layer (T-088 / T-089) to anchor labels and
 * arrows to features that are actually visible in the rendered image.
 *
 * **Important**: `renderSingleView` computes its framing bbox from *all*
 * meshes (not visible-only — see three-renderer.ts:123). To keep our
 * projection matrix in sync with the rendered pixels, we replicate that
 * exact behavior here. The camera math (offsets, FOV 30°, near/far ratios,
 * NDC-to-pixel conversion with Y flip) is copied verbatim from
 * three-renderer.ts so we don't drift if either side is tuned in isolation.
 */
import { Vector3, Matrix4 } from "three";
import { renderSingleView } from "@/lib/render/three-renderer";
import type { ParsedMesh } from "@/lib/agents/source-adapter/cad/step-parser";

// ============================================================
// Public types
// ============================================================

export interface RenderStepBaseInput {
  /** All meshes from the parsed STEP */
  meshes: ParsedMesh[];
  /** Component IDs of parts being installed in THIS step (active, opacity 1.0). */
  activeComponentIds: Set<string>;
  /** Component IDs of parts already installed in earlier steps (opacity 0.3). */
  installedComponentIds: Set<string>;
  /** Output PNG path */
  outputPath: string;
  /** Default 1600 */
  width?: number;
  /** Default 1200 */
  height?: number;
}

export interface RenderStepBaseResult {
  filePath: string;
  width: number;
  height: number;
  /**
   * Project a Component centroid to screen pixels. Used by T-089/overlays
   * to anchor labels and arrows. Returns null if the component has no mesh
   * or projects behind the camera.
   */
  project(componentId: string): { x: number; y: number } | null;
  /**
   * Axis-aligned bounding box of a Component in screen pixels.
   */
  boundsOnScreen(
    componentId: string,
  ): { x: number; y: number; w: number; h: number } | null;
}

// ============================================================
// Public API
// ============================================================

export async function renderStepBase(
  input: RenderStepBaseInput,
): Promise<RenderStepBaseResult> {
  const width = input.width ?? 1600;
  const height = input.height ?? 1200;

  // Build the IL-008 opacity map. Anything not active or installed is
  // implicitly 0 (renderSingleView skips meshes whose opacity is 0).
  const opacityByComponentId: Record<string, number> = {};
  for (const mesh of input.meshes) {
    if (input.activeComponentIds.has(mesh.componentId)) {
      opacityByComponentId[mesh.componentId] = 1.0;
    } else if (input.installedComponentIds.has(mesh.componentId)) {
      opacityByComponentId[mesh.componentId] = 0.3;
    } else {
      opacityByComponentId[mesh.componentId] = 0;
    }
  }

  await renderSingleView(input.meshes, "isometric", input.outputPath, {
    width,
    height,
    opacityByComponentId,
  });

  // Build a projection matrix that mirrors what renderSingleView used so
  // overlay anchors line up with the rendered pixels. Note that the
  // upstream renderer computes its bbox from ALL meshes (including
  // hidden ones — see three-renderer.ts:123), so we do the same here.
  const bbox = computeAssemblyBBox(input.meshes);
  const cameraMatrix = makeIsometricCameraMatrix(bbox, width, height);

  const meshById = new Map<string, ParsedMesh>();
  for (const m of input.meshes) meshById.set(m.componentId, m);

  const isVisible = (id: string): boolean =>
    (opacityByComponentId[id] ?? 0) > 0;

  return {
    filePath: input.outputPath,
    width,
    height,
    project(componentId) {
      if (!isVisible(componentId)) return null;
      const mesh = meshById.get(componentId);
      if (!mesh) return null;
      const centroid = meshCentroid(mesh);
      return projectPointToScreen(centroid, cameraMatrix, width, height);
    },
    boundsOnScreen(componentId) {
      if (!isVisible(componentId)) return null;
      const mesh = meshById.get(componentId);
      if (!mesh) return null;
      return projectAabbToScreen(
        mesh.boundingBox,
        cameraMatrix,
        width,
        height,
      );
    },
  };
}

// ============================================================
// Camera replication (mirrors three-renderer.ts isometric branch)
// ============================================================

function computeAssemblyBBox(meshes: ParsedMesh[]): {
  min: Vector3;
  max: Vector3;
} {
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

function makeIsometricCameraMatrix(
  bbox: { min: Vector3; max: Vector3 },
  width: number,
  height: number,
): Matrix4 {
  const center = new Vector3()
    .addVectors(bbox.min, bbox.max)
    .multiplyScalar(0.5);
  const size = new Vector3().subVectors(bbox.max, bbox.min);
  const maxExtent = Math.max(size.x, size.y, size.z, 1e-6);

  // Same offset, near/far, and FOV as three-renderer.ts isometric branch.
  const cameraOffset = new Vector3(
    maxExtent * 1.8,
    maxExtent * 1.6,
    maxExtent * 2.0,
  );
  const up = new Vector3(0, 1, 0);
  const cameraPos = new Vector3().addVectors(center, cameraOffset);

  const viewMatrix = new Matrix4().lookAt(cameraPos, center, up);
  viewMatrix.setPosition(cameraPos);
  const view4 = new Matrix4().copy(viewMatrix).invert();

  const fov = 30 * (Math.PI / 180);
  const aspect = width / height;
  const near = maxExtent * 0.1;
  const far = maxExtent * 10;
  const projMatrix = makePerspective(fov, aspect, near, far);

  return new Matrix4().multiplyMatrices(projMatrix, view4);
}

function makePerspective(
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Matrix4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Matrix4();
  // Column-major (three.js convention) — verbatim from three-renderer.ts.
  m.set(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), (2 * far * near) / (near - far),
    0, 0, -1, 0,
  );
  return m;
}

// ============================================================
// Projection helpers
// ============================================================

function meshCentroid(mesh: ParsedMesh): Vector3 {
  const positions = mesh.positions;
  const vertexCount = positions.length / 3;
  if (vertexCount === 0) {
    // Fall back to bbox center for empty meshes.
    return new Vector3(
      (mesh.boundingBox.min[0] + mesh.boundingBox.max[0]) * 0.5,
      (mesh.boundingBox.min[1] + mesh.boundingBox.max[1]) * 0.5,
      (mesh.boundingBox.min[2] + mesh.boundingBox.max[2]) * 0.5,
    );
  }
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < vertexCount; i++) {
    sx += positions[i * 3];
    sy += positions[i * 3 + 1];
    sz += positions[i * 3 + 2];
  }
  return new Vector3(sx / vertexCount, sy / vertexCount, sz / vertexCount);
}

/**
 * Apply the camera matrix to a world-space point, perspective-divide, and
 * map NDC to pixel coordinates. Y is flipped so (0, 0) is the top-left of
 * the canvas — matching three-renderer.ts:361.
 */
function projectPointToScreen(
  p: Vector3,
  cameraMatrix: Matrix4,
  width: number,
  height: number,
): { x: number; y: number } | null {
  const m = cameraMatrix.elements;
  const x = m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12];
  const y = m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13];
  // const z = m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14];
  const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
  if (w <= 0) return null; // behind the camera
  const ndcX = x / w;
  const ndcY = y / w;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (1 - (ndcY * 0.5 + 0.5)) * height,
  };
}

function projectAabbToScreen(
  bbox: { min: [number, number, number]; max: [number, number, number] },
  cameraMatrix: Matrix4,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  // Project all 8 corners; drop any that land behind the camera.
  const corners: Vector3[] = [
    new Vector3(bbox.min[0], bbox.min[1], bbox.min[2]),
    new Vector3(bbox.max[0], bbox.min[1], bbox.min[2]),
    new Vector3(bbox.min[0], bbox.max[1], bbox.min[2]),
    new Vector3(bbox.max[0], bbox.max[1], bbox.min[2]),
    new Vector3(bbox.min[0], bbox.min[1], bbox.max[2]),
    new Vector3(bbox.max[0], bbox.min[1], bbox.max[2]),
    new Vector3(bbox.min[0], bbox.max[1], bbox.max[2]),
    new Vector3(bbox.max[0], bbox.max[1], bbox.max[2]),
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let projectedCount = 0;
  for (const c of corners) {
    const s = projectPointToScreen(c, cameraMatrix, width, height);
    if (!s) continue;
    projectedCount++;
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x > maxX) maxX = s.x;
    if (s.y > maxY) maxY = s.y;
  }
  if (projectedCount === 0) return null;

  // Clamp to canvas bounds.
  const cx = Math.max(0, minX);
  const cy = Math.max(0, minY);
  const cMaxX = Math.min(width, maxX);
  const cMaxY = Math.min(height, maxY);
  if (cMaxX <= cx || cMaxY <= cy) return null;
  return {
    x: cx,
    y: cy,
    w: cMaxX - cx,
    h: cMaxY - cy,
  };
}
