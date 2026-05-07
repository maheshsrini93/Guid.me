/**
 * STEP file parser (T-078).
 *
 * Wraps `occt-import-js` (an OpenCascade WASM build) to extract:
 *   - parts catalog (`StructuredPartRef[]`)
 *   - hierarchical assembly tree (`AssemblyNode`)
 *   - per-Component triangle mesh + axis-aligned bounding box
 *
 * Each *Component* in the assembly hierarchy is a positioned instance of a
 * Part. occt-import-js gives us a flat list of meshes plus a tree of nodes
 * that reference those meshes. We walk the tree, generate stable IDs, and
 * compute bounding boxes per Component so downstream stages (sequence
 * inference, multi-view rendering, the final illustration renderer) can frame
 * cameras and reason about spatial relationships.
 */
import { readFile } from "fs/promises";
import type {
  AssemblyNode,
  StructuredPartRef,
} from "@/types/agents";

/**
 * Triangle mesh as returned by occt-import-js. Positions and normals are flat
 * float arrays in model coordinates; indices reference vertex triplets.
 *
 * We carry the mesh through the pipeline so the multi-view renderer (T-080)
 * and the per-step CAD illustration renderer (T-087) can render directly
 * without re-parsing the STEP file.
 */
export interface ParsedMesh {
  /** Stable mesh identifier — matches the Component this mesh represents */
  componentId: string;
  /** Source mesh index from occt-import-js, useful for debugging */
  occtMeshIndex: number;
  /** Flat array of vertex positions (length = vertexCount * 3) */
  positions: Float32Array;
  /** Flat array of vertex normals (length = vertexCount * 3), or null if absent */
  normals: Float32Array | null;
  /** Flat array of triangle indices (length = triangleCount * 3) */
  indices: Uint32Array;
  /** RGB color in [0, 1] from STEP attributes; null if not specified */
  color: [number, number, number] | null;
  /** Axis-aligned bounding box in model coordinates */
  boundingBox: { min: [number, number, number]; max: [number, number, number] };
}

export interface ParsedStep {
  /** Component-level parts catalog (each instance gets one entry) */
  partsCatalog: StructuredPartRef[];
  /** Hierarchical assembly tree */
  assemblyTree: AssemblyNode;
  /** Per-Component triangle meshes, ordered by the partsCatalog */
  meshes: ParsedMesh[];
  /** Axis-aligned bounding box of the full assembly */
  assemblyBoundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

// ============================================================
// occt-import-js shape (the package ships no .d.ts)
// ============================================================

interface OcctMesh {
  name?: string;
  color?: [number, number, number];
  brep_faces?: Array<unknown>;
  attributes?: {
    position?: { array: number[] | Float32Array; count: number };
    normal?: { array: number[] | Float32Array; count: number };
  };
  index?: { array: number[] | Uint32Array; count: number };
}

interface OcctNode {
  name?: string;
  meshes?: number[];
  children?: OcctNode[];
  color?: [number, number, number];
}

interface OcctReadResult {
  success: boolean;
  meshes: OcctMesh[];
  root: OcctNode;
}

interface OcctModule {
  ReadStepFile: (buffer: Uint8Array, options: unknown) => OcctReadResult;
}

let _occtPromise: Promise<OcctModule> | null = null;

/** Initialize the occt-import-js WASM module (cached). */
async function loadOcct(): Promise<OcctModule> {
  if (!_occtPromise) {
    _occtPromise = (async () => {
      const mod = (await import("occt-import-js")) as
        | { default?: () => Promise<OcctModule> }
        | (() => Promise<OcctModule>);
      const factory =
        typeof mod === "function" ? mod : (mod.default as () => Promise<OcctModule>);
      if (typeof factory !== "function") {
        throw new Error("occt-import-js did not expose a callable factory");
      }
      return factory();
    })();
  }
  return _occtPromise;
}

// ============================================================
// Public API
// ============================================================

/**
 * Parse a STEP (.stp / .step) file into a parts catalog + assembly tree +
 * per-Component meshes. Throws on parse failure.
 */
export async function parseStep(filePath: string): Promise<ParsedStep> {
  const occt = await loadOcct();
  const buffer = await readFile(filePath);
  const result = occt.ReadStepFile(new Uint8Array(buffer), null);

  if (!result.success) {
    throw new Error(`occt-import-js failed to parse STEP file: ${filePath}`);
  }

  // Walk the hierarchy depth-first, materializing one Component per leaf
  // mesh reference. Components are stable-named after their assembly path
  // so the same instance keeps the same ID across runs of the pipeline.
  const partsCatalog: StructuredPartRef[] = [];
  const meshes: ParsedMesh[] = [];

  const root = walkNode(result.root, result.meshes, [], partsCatalog, meshes);

  if (partsCatalog.length === 0) {
    throw new Error(
      `STEP file produced 0 components — file may be empty or corrupted: ${filePath}`,
    );
  }

  const assemblyBoundingBox = unionBoundingBoxes(meshes.map((m) => m.boundingBox));

  return {
    partsCatalog,
    assemblyTree: root,
    meshes,
    assemblyBoundingBox,
  };
}

// ============================================================
// Hierarchy walking
// ============================================================

/**
 * Walk an occt node depth-first. For each mesh referenced by the node, emit
 * one Component (StructuredPartRef + ParsedMesh). The returned AssemblyNode
 * mirrors the occt structure but uses our stable IDs.
 */
function walkNode(
  node: OcctNode,
  occtMeshes: OcctMesh[],
  parentPath: string[],
  partsCatalog: StructuredPartRef[],
  meshes: ParsedMesh[],
): AssemblyNode {
  const name = node.name?.trim() || "unnamed";
  const path = [...parentPath, slugify(name)];
  const id = path.join("/");

  const children: AssemblyNode[] = [];

  // Emit one child Component per mesh attached to this node.
  if (node.meshes && node.meshes.length > 0) {
    node.meshes.forEach((meshIdx, i) => {
      const occtMesh = occtMeshes[meshIdx];
      if (!occtMesh) return;

      const componentName =
        occtMesh.name?.trim() ||
        (node.meshes!.length > 1 ? `${name} #${i + 1}` : name);
      const componentPath = [...path, slugify(componentName)];
      const componentId = componentPath.join("/");

      const parsedMesh = parseMesh(occtMesh, componentId, meshIdx);
      meshes.push(parsedMesh);

      partsCatalog.push({
        name: componentName,
        id: componentId,
        quantity: 1,
        parentAssemblyPath: path.join("/") || undefined,
        boundingBox: parsedMesh.boundingBox,
      });

      children.push({
        id: componentId,
        name: componentName,
        children: [],
      });
    });
  }

  for (const child of node.children ?? []) {
    children.push(walkNode(child, occtMeshes, path, partsCatalog, meshes));
  }

  return { id, name, children };
}

// ============================================================
// Mesh parsing
// ============================================================

function parseMesh(
  occtMesh: OcctMesh,
  componentId: string,
  occtMeshIndex: number,
): ParsedMesh {
  const positionsRaw = occtMesh.attributes?.position?.array;
  const indicesRaw = occtMesh.index?.array;

  if (!positionsRaw || !indicesRaw) {
    throw new Error(
      `Mesh ${componentId} (occt index ${occtMeshIndex}) is missing position or index data`,
    );
  }

  const positions =
    positionsRaw instanceof Float32Array
      ? positionsRaw
      : new Float32Array(positionsRaw);
  const indices =
    indicesRaw instanceof Uint32Array ? indicesRaw : new Uint32Array(indicesRaw);

  const normalsRaw = occtMesh.attributes?.normal?.array;
  const normals = normalsRaw
    ? normalsRaw instanceof Float32Array
      ? normalsRaw
      : new Float32Array(normalsRaw)
    : null;

  const boundingBox = computeBoundingBox(positions);

  return {
    componentId,
    occtMeshIndex,
    positions,
    normals,
    indices,
    color: occtMesh.color ?? null,
    boundingBox,
  };
}

// ============================================================
// Geometry helpers
// ============================================================

function computeBoundingBox(positions: Float32Array): {
  min: [number, number, number];
  max: [number, number, number];
} {
  if (positions.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

function unionBoundingBoxes(
  boxes: Array<{ min: [number, number, number]; max: [number, number, number] }>,
): { min: [number, number, number]; max: [number, number, number] } {
  if (boxes.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const box of boxes) {
    for (let i = 0; i < 3; i++) {
      if (box.min[i] < min[i]) min[i] = box.min[i];
      if (box.max[i] > max[i]) max[i] = box.max[i];
    }
  }
  return { min, max };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "unnamed";
}
