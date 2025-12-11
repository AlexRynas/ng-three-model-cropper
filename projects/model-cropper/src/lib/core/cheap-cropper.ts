/**
 * CheapCropper - Triangle pruning based geometry cropping
 *
 * This module provides "cheap" cropping functionality that removes triangles
 * outside a defined bounding box without performing boolean CSG operations.
 *
 * The cropping is performed in world-space coordinates.
 */

import * as THREE from 'three';
import { CropBoxConfig, CropResult, isPointInCropBox } from './types';

/**
 * Strategy for determining if a triangle should be kept
 */
export type TriangleTestStrategy = 'centroid' | 'all-vertices' | 'any-vertex';

/**
 * Options for the cheap crop operation
 */
export interface CheapCropOptions {
  /** Strategy for testing triangles against the crop box */
  readonly strategy?: TriangleTestStrategy;
  /** Whether to recompute normals after cropping */
  readonly recomputeNormals?: boolean;
}

const DEFAULT_CROP_OPTIONS: Required<CheapCropOptions> = {
  strategy: 'centroid',
  recomputeNormals: true,
};

/**
 * CheapCropper class for performing triangle-pruning based cropping
 */
export class CheapCropper {
  /**
   * Apply cheap cropping to an Object3D hierarchy
   * Modifies geometries in place by removing triangles outside the crop box
   *
   * @param root - The root Object3D to crop (typically the loaded model)
   * @param cropBox - The bounding box configuration in world-space
   * @param options - Cropping options
   * @returns CropResult with statistics about the operation
   */
  static applyCrop(
    root: THREE.Object3D,
    cropBox: CropBoxConfig,
    options: CheapCropOptions = {}
  ): CropResult {
    const opts = { ...DEFAULT_CROP_OPTIONS, ...options };
    let totalTrianglesRemoved = 0;
    let totalTrianglesKept = 0;
    let meshesProcessed = 0;

    root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        const geometry = object.geometry as THREE.BufferGeometry;
        const result = CheapCropper.cropGeometry(geometry, object.matrixWorld, cropBox, opts);

        if (result) {
          object.geometry = result.geometry;
          totalTrianglesRemoved += result.trianglesRemoved;
          totalTrianglesKept += result.trianglesKept;
          meshesProcessed++;

          // Dispose old geometry
          geometry.dispose();
        }
      }
    });

    return {
      success: true,
      trianglesRemoved: totalTrianglesRemoved,
      trianglesKept: totalTrianglesKept,
      meshesProcessed,
    };
  }

  /**
   * Crop a single BufferGeometry
   *
   * @param geometry - The geometry to crop
   * @param worldMatrix - The world transformation matrix of the mesh
   * @param cropBox - The crop box in world-space
   * @param options - Cropping options
   * @returns Object with new geometry and statistics, or null if no changes needed
   */
  private static cropGeometry(
    geometry: THREE.BufferGeometry,
    worldMatrix: THREE.Matrix4,
    cropBox: CropBoxConfig,
    options: Required<CheapCropOptions>
  ): { geometry: THREE.BufferGeometry; trianglesRemoved: number; trianglesKept: number } | null {
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    if (!positionAttr) return null;

    const isIndexed = geometry.index !== null;
    const indices = isIndexed ? geometry.index!.array : null;
    const vertexCount = positionAttr.count;
    const triangleCount = isIndexed ? indices!.length / 3 : vertexCount / 3;

    // Arrays to store kept triangle data
    const keptTriangles: number[] = [];
    const tempVec = new THREE.Vector3();

    // Process each triangle
    for (let i = 0; i < triangleCount; i++) {
      const i0 = isIndexed ? indices![i * 3] : i * 3;
      const i1 = isIndexed ? indices![i * 3 + 1] : i * 3 + 1;
      const i2 = isIndexed ? indices![i * 3 + 2] : i * 3 + 2;

      const shouldKeep = CheapCropper.testTriangle(
        positionAttr,
        i0,
        i1,
        i2,
        worldMatrix,
        cropBox,
        options.strategy,
        tempVec
      );

      if (shouldKeep) {
        keptTriangles.push(i0, i1, i2);
      }
    }

    const trianglesKept = keptTriangles.length / 3;
    const trianglesRemoved = triangleCount - trianglesKept;

    // If no triangles were removed, return null (no changes needed)
    if (trianglesRemoved === 0) {
      return { geometry, trianglesRemoved: 0, trianglesKept };
    }

    // Build new geometry from kept triangles
    const newGeometry = CheapCropper.buildNewGeometry(geometry, keptTriangles, isIndexed);

    if (options.recomputeNormals) {
      newGeometry.computeVertexNormals();
    }

    return {
      geometry: newGeometry,
      trianglesRemoved,
      trianglesKept,
    };
  }

  /**
   * Test if a triangle should be kept based on the crop box
   */
  private static testTriangle(
    positionAttr: THREE.BufferAttribute,
    i0: number,
    i1: number,
    i2: number,
    worldMatrix: THREE.Matrix4,
    cropBox: CropBoxConfig,
    strategy: TriangleTestStrategy,
    tempVec: THREE.Vector3
  ): boolean {
    // Get world-space positions of vertices
    const v0 = CheapCropper.getWorldPosition(positionAttr, i0, worldMatrix, tempVec.clone());
    const v1 = CheapCropper.getWorldPosition(positionAttr, i1, worldMatrix, tempVec.clone());
    const v2 = CheapCropper.getWorldPosition(positionAttr, i2, worldMatrix, tempVec.clone());

    switch (strategy) {
      case 'centroid': {
        // Test triangle centroid
        const cx = (v0.x + v1.x + v2.x) / 3;
        const cy = (v0.y + v1.y + v2.y) / 3;
        const cz = (v0.z + v1.z + v2.z) / 3;
        return isPointInCropBox(cx, cy, cz, cropBox);
      }
      case 'all-vertices': {
        // All vertices must be inside
        return (
          isPointInCropBox(v0.x, v0.y, v0.z, cropBox) &&
          isPointInCropBox(v1.x, v1.y, v1.z, cropBox) &&
          isPointInCropBox(v2.x, v2.y, v2.z, cropBox)
        );
      }
      case 'any-vertex': {
        // At least one vertex must be inside
        return (
          isPointInCropBox(v0.x, v0.y, v0.z, cropBox) ||
          isPointInCropBox(v1.x, v1.y, v1.z, cropBox) ||
          isPointInCropBox(v2.x, v2.y, v2.z, cropBox)
        );
      }
      default:
        return true;
    }
  }

  /**
   * Get world-space position of a vertex
   */
  private static getWorldPosition(
    positionAttr: THREE.BufferAttribute,
    index: number,
    worldMatrix: THREE.Matrix4,
    target: THREE.Vector3
  ): THREE.Vector3 {
    target.fromBufferAttribute(positionAttr, index);
    target.applyMatrix4(worldMatrix);
    return target;
  }

  /**
   * Build a new BufferGeometry from kept triangles
   */
  private static buildNewGeometry(
    originalGeometry: THREE.BufferGeometry,
    keptTriangleIndices: number[],
    wasIndexed: boolean
  ): THREE.BufferGeometry {
    const newGeometry = new THREE.BufferGeometry();

    // Get all attribute names from original geometry
    const attributeNames = Object.keys(originalGeometry.attributes);

    if (wasIndexed) {
      // For indexed geometry, we need to remap vertices
      const vertexMap = new Map<number, number>();
      const newIndices: number[] = [];
      let newVertexIndex = 0;

      // Create mapping of old indices to new indices
      for (const oldIndex of keptTriangleIndices) {
        if (!vertexMap.has(oldIndex)) {
          vertexMap.set(oldIndex, newVertexIndex++);
        }
        newIndices.push(vertexMap.get(oldIndex)!);
      }

      // Copy attribute data for used vertices
      for (const name of attributeNames) {
        const oldAttr = originalGeometry.getAttribute(name) as THREE.BufferAttribute;
        const itemSize = oldAttr.itemSize;
        const newArray = new Float32Array(vertexMap.size * itemSize);

        vertexMap.forEach((newIdx, oldIdx) => {
          for (let i = 0; i < itemSize; i++) {
            newArray[newIdx * itemSize + i] = oldAttr.array[oldIdx * itemSize + i];
          }
        });

        newGeometry.setAttribute(name, new THREE.BufferAttribute(newArray, itemSize));
      }

      // Set new indices
      newGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(newIndices), 1));
    } else {
      // For non-indexed geometry, copy vertex data directly
      const uniqueIndices = [...new Set(keptTriangleIndices)];
      const indexMap = new Map<number, number>();
      uniqueIndices.forEach((idx, newIdx) => indexMap.set(idx, newIdx));

      for (const name of attributeNames) {
        const oldAttr = originalGeometry.getAttribute(name) as THREE.BufferAttribute;
        const itemSize = oldAttr.itemSize;
        const newArray = new Float32Array(keptTriangleIndices.length * itemSize);

        keptTriangleIndices.forEach((oldIdx, i) => {
          for (let j = 0; j < itemSize; j++) {
            newArray[i * itemSize + j] = oldAttr.array[oldIdx * itemSize + j];
          }
        });

        newGeometry.setAttribute(name, new THREE.BufferAttribute(newArray, itemSize));
      }
    }

    // Copy morph attributes if present
    if (originalGeometry.morphAttributes) {
      for (const name of Object.keys(originalGeometry.morphAttributes)) {
        newGeometry.morphAttributes[name] = [];
        // Note: morph attribute copying would need similar index remapping
        // Simplified here - full implementation would iterate morph targets
      }
    }

    // Copy groups if present
    // Note: groups would need adjustment based on new indices
    // Simplified here - kept triangles may span multiple groups

    return newGeometry;
  }
}
