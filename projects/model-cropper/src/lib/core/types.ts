/**
 * Core types and interfaces for ng-three-model-cropper
 * Framework-agnostic - can be used by any Angular version adapter
 */

/**
 * Crop box configuration defining the 3D bounding box for cropping
 * Values are in world-space coordinates
 */
export interface CropBoxConfig {
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
}

/**
 * 3D vector interface for position and rotation values
 */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Mesh transformation configuration for translating and rotating the loaded model
 */
export interface MeshTransformConfig {
  readonly position: Vec3;
  readonly rotation: Vec3;
}

/**
 * Download mode for the exported GLB file
 * - 'download': Trigger browser download of the file
 * - 'emit': Emit the ArrayBuffer via output for host app handling
 */
export type DownloadMode = 'download' | 'emit';

/**
 * Angle unit for rotation values
 * - 'radians': Rotation values are in radians (default, Three.js native)
 * - 'degrees': Rotation values are in degrees (-180 to 180, etc.)
 */
export type AngleUnit = 'radians' | 'degrees';

/**
 * Loading state for the model loader
 */
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Loading progress information
 * Provides detailed progress tracking during model loading
 */
export interface LoadingProgress {
  /** Current loading state */
  readonly state: LoadingState;
  /** Loading progress percentage (0-100) */
  readonly percentage: number;
  /** Number of bytes loaded */
  readonly loaded: number;
  /** Total bytes to load (may be 0 if unknown) */
  readonly total: number;
  /** Human-readable status message */
  readonly message: string;
}

/**
 * Model file type determined by extension
 */
export type ModelFileType = 'glb' | 'gltf' | 'fbx' | 'unknown';

/**
 * Configuration options for the ModelCropEngine
 */
export interface ModelCropEngineConfig {
  readonly antialias?: boolean;
  readonly alpha?: boolean;
  readonly preserveDrawingBuffer?: boolean;
}

/**
 * Result of a crop operation
 */
export interface CropResult {
  readonly success: boolean;
  readonly trianglesRemoved: number;
  readonly trianglesKept: number;
  readonly meshesProcessed: number;
}

/**
 * Default crop box configuration
 */
export const DEFAULT_CROP_BOX: CropBoxConfig = {
  minX: -1,
  minY: -1,
  minZ: -1,
  maxX: 1,
  maxY: 1,
  maxZ: 1,
};

/**
 * Default mesh transform configuration (identity transform)
 */
export const DEFAULT_MESH_TRANSFORM: MeshTransformConfig = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

/**
 * Creates a new CropBoxConfig with updated values
 */
export function updateCropBox(
  current: CropBoxConfig,
  updates: Partial<CropBoxConfig>
): CropBoxConfig {
  return { ...current, ...updates };
}

/**
 * Creates a new MeshTransformConfig with updated values
 */
export function updateMeshTransform(
  current: MeshTransformConfig,
  updates: Partial<{ position: Partial<Vec3>; rotation: Partial<Vec3> }>
): MeshTransformConfig {
  return {
    position: { ...current.position, ...updates.position },
    rotation: { ...current.rotation, ...updates.rotation },
  };
}

/**
 * Determines the model file type from a URL or filename
 */
export function getModelFileType(url: string): ModelFileType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.glb')) return 'glb';
  if (lowerUrl.endsWith('.gltf')) return 'gltf';
  if (lowerUrl.endsWith('.fbx')) return 'fbx';
  return 'unknown';
}

/**
 * Checks if a point is inside the crop box
 */
export function isPointInCropBox(x: number, y: number, z: number, box: CropBoxConfig): boolean {
  return (
    x >= box.minX &&
    x <= box.maxX &&
    y >= box.minY &&
    y <= box.maxY &&
    z >= box.minZ &&
    z <= box.maxZ
  );
}
