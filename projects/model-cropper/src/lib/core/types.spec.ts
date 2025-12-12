/**
 * Unit tests for types.ts - Core types and utility functions
 */

import {
  CropBoxConfig,
  MeshTransformConfig,
  Vec3,
  LoadingState,
  LoadingProgress,
  ModelFileType,
  DownloadMode,
  CropResult,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
  updateCropBox,
  updateMeshTransform,
  getModelFileType,
  isPointInCropBox,
} from './types';

describe('types', () => {
  describe('DEFAULT_CROP_BOX', () => {
    it('should have symmetric default values', () => {
      expect(DEFAULT_CROP_BOX.minX).toBe(-1);
      expect(DEFAULT_CROP_BOX.maxX).toBe(1);
      expect(DEFAULT_CROP_BOX.minY).toBe(-1);
      expect(DEFAULT_CROP_BOX.maxY).toBe(1);
      expect(DEFAULT_CROP_BOX.minZ).toBe(-1);
      expect(DEFAULT_CROP_BOX.maxZ).toBe(1);
    });

    it('should be a valid crop box configuration', () => {
      expect(DEFAULT_CROP_BOX.minX).toBeLessThan(DEFAULT_CROP_BOX.maxX);
      expect(DEFAULT_CROP_BOX.minY).toBeLessThan(DEFAULT_CROP_BOX.maxY);
      expect(DEFAULT_CROP_BOX.minZ).toBeLessThan(DEFAULT_CROP_BOX.maxZ);
    });
  });

  describe('DEFAULT_MESH_TRANSFORM', () => {
    it('should have zero position', () => {
      expect(DEFAULT_MESH_TRANSFORM.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should have zero rotation', () => {
      expect(DEFAULT_MESH_TRANSFORM.rotation).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('updateCropBox', () => {
    it('should update a single value', () => {
      const original: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };
      const updated = updateCropBox(original, { minX: -2 });

      expect(updated.minX).toBe(-2);
      expect(updated.maxX).toBe(1);
      expect(updated.minY).toBe(-1);
      expect(updated.maxY).toBe(1);
      expect(updated.minZ).toBe(-1);
      expect(updated.maxZ).toBe(1);
    });

    it('should update multiple values', () => {
      const original: CropBoxConfig = DEFAULT_CROP_BOX;
      const updated = updateCropBox(original, { minX: -5, maxY: 10, minZ: -3 });

      expect(updated.minX).toBe(-5);
      expect(updated.maxX).toBe(1);
      expect(updated.minY).toBe(-1);
      expect(updated.maxY).toBe(10);
      expect(updated.minZ).toBe(-3);
      expect(updated.maxZ).toBe(1);
    });

    it('should not mutate the original object', () => {
      const original: CropBoxConfig = { ...DEFAULT_CROP_BOX };
      const updated = updateCropBox(original, { minX: -5 });

      expect(original.minX).toBe(-1);
      expect(updated.minX).toBe(-5);
      expect(original).not.toBe(updated);
    });

    it('should return identical values when no updates provided', () => {
      const original: CropBoxConfig = DEFAULT_CROP_BOX;
      const updated = updateCropBox(original, {});

      expect(updated).toEqual(original);
    });
  });

  describe('updateMeshTransform', () => {
    it('should update position partially', () => {
      const original: MeshTransformConfig = DEFAULT_MESH_TRANSFORM;
      const updated = updateMeshTransform(original, {
        position: { x: 5 },
      });

      expect(updated.position).toEqual({ x: 5, y: 0, z: 0 });
      expect(updated.rotation).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should update rotation partially', () => {
      const original: MeshTransformConfig = DEFAULT_MESH_TRANSFORM;
      const updated = updateMeshTransform(original, {
        rotation: { y: Math.PI },
      });

      expect(updated.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(updated.rotation).toEqual({ x: 0, y: Math.PI, z: 0 });
    });

    it('should update both position and rotation', () => {
      const original: MeshTransformConfig = DEFAULT_MESH_TRANSFORM;
      const updated = updateMeshTransform(original, {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
      });

      expect(updated.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(updated.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
    });

    it('should not mutate the original object', () => {
      const original: MeshTransformConfig = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      };
      const updated = updateMeshTransform(original, {
        position: { x: 10 },
      });

      expect(original.position.x).toBe(0);
      expect(updated.position.x).toBe(10);
    });

    it('should handle empty updates', () => {
      const original: MeshTransformConfig = DEFAULT_MESH_TRANSFORM;
      const updated = updateMeshTransform(original, {});

      expect(updated.position).toEqual(original.position);
      expect(updated.rotation).toEqual(original.rotation);
    });
  });

  describe('getModelFileType', () => {
    it('should detect GLB files', () => {
      expect(getModelFileType('model.glb')).toBe('glb');
      expect(getModelFileType('path/to/model.glb')).toBe('glb');
      expect(getModelFileType('MODEL.GLB')).toBe('glb');
      expect(getModelFileType('/assets/my-model.glb')).toBe('glb');
    });

    it('should detect GLTF files', () => {
      expect(getModelFileType('model.gltf')).toBe('gltf');
      expect(getModelFileType('path/to/model.gltf')).toBe('gltf');
      expect(getModelFileType('MODEL.GLTF')).toBe('gltf');
    });

    it('should detect FBX files', () => {
      expect(getModelFileType('model.fbx')).toBe('fbx');
      expect(getModelFileType('path/to/model.fbx')).toBe('fbx');
      expect(getModelFileType('MODEL.FBX')).toBe('fbx');
    });

    it('should return unknown for unsupported extensions', () => {
      expect(getModelFileType('model.obj')).toBe('unknown');
      expect(getModelFileType('model.stl')).toBe('unknown');
      expect(getModelFileType('model.3ds')).toBe('unknown');
      expect(getModelFileType('model.txt')).toBe('unknown');
    });

    it('should return unknown for files without extension', () => {
      expect(getModelFileType('model')).toBe('unknown');
      expect(getModelFileType('/path/to/file')).toBe('unknown');
    });

    it('should handle URLs with query parameters', () => {
      // Note: current implementation checks endsWith, so query params would break detection
      expect(getModelFileType('model.glb?version=1')).toBe('unknown');
    });
  });

  describe('isPointInCropBox', () => {
    const box: CropBoxConfig = {
      minX: -1,
      maxX: 1,
      minY: -2,
      maxY: 2,
      minZ: -3,
      maxZ: 3,
    };

    it('should return true for point at center of box', () => {
      expect(isPointInCropBox(0, 0, 0, box)).toBe(true);
    });

    it('should return true for point inside box', () => {
      expect(isPointInCropBox(0.5, 0.5, 0.5, box)).toBe(true);
      expect(isPointInCropBox(-0.5, -1, -2, box)).toBe(true);
    });

    it('should return true for points on box boundary (inclusive)', () => {
      expect(isPointInCropBox(-1, 0, 0, box)).toBe(true); // minX
      expect(isPointInCropBox(1, 0, 0, box)).toBe(true); // maxX
      expect(isPointInCropBox(0, -2, 0, box)).toBe(true); // minY
      expect(isPointInCropBox(0, 2, 0, box)).toBe(true); // maxY
      expect(isPointInCropBox(0, 0, -3, box)).toBe(true); // minZ
      expect(isPointInCropBox(0, 0, 3, box)).toBe(true); // maxZ
    });

    it('should return true for corner points', () => {
      expect(isPointInCropBox(-1, -2, -3, box)).toBe(true);
      expect(isPointInCropBox(1, 2, 3, box)).toBe(true);
      expect(isPointInCropBox(-1, 2, -3, box)).toBe(true);
    });

    it('should return false for point outside box on X axis', () => {
      expect(isPointInCropBox(-1.5, 0, 0, box)).toBe(false);
      expect(isPointInCropBox(1.5, 0, 0, box)).toBe(false);
    });

    it('should return false for point outside box on Y axis', () => {
      expect(isPointInCropBox(0, -2.5, 0, box)).toBe(false);
      expect(isPointInCropBox(0, 2.5, 0, box)).toBe(false);
    });

    it('should return false for point outside box on Z axis', () => {
      expect(isPointInCropBox(0, 0, -3.5, box)).toBe(false);
      expect(isPointInCropBox(0, 0, 3.5, box)).toBe(false);
    });

    it('should return false for point completely outside', () => {
      expect(isPointInCropBox(10, 10, 10, box)).toBe(false);
      expect(isPointInCropBox(-10, -10, -10, box)).toBe(false);
    });

    it('should work with zero-volume box (degenerate case)', () => {
      const zeroBox: CropBoxConfig = {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        minZ: 0,
        maxZ: 0,
      };
      expect(isPointInCropBox(0, 0, 0, zeroBox)).toBe(true);
      expect(isPointInCropBox(0.1, 0, 0, zeroBox)).toBe(false);
    });
  });

  describe('Type definitions', () => {
    it('should allow valid LoadingState values', () => {
      const states: LoadingState[] = ['idle', 'loading', 'loaded', 'error'];
      expect(states.length).toBe(4);
    });

    it('should allow valid DownloadMode values', () => {
      const modes: DownloadMode[] = ['download', 'emit'];
      expect(modes.length).toBe(2);
    });

    it('should allow valid ModelFileType values', () => {
      const types: ModelFileType[] = ['glb', 'gltf', 'fbx', 'unknown'];
      expect(types.length).toBe(4);
    });

    it('should create valid CropResult object', () => {
      const result: CropResult = {
        success: true,
        trianglesRemoved: 100,
        trianglesKept: 500,
        meshesProcessed: 3,
      };

      expect(result.success).toBe(true);
      expect(result.trianglesRemoved).toBe(100);
      expect(result.trianglesKept).toBe(500);
      expect(result.meshesProcessed).toBe(3);
    });

    it('should create valid Vec3 object', () => {
      const vec: Vec3 = { x: 1, y: 2, z: 3 };
      expect(vec.x).toBe(1);
      expect(vec.y).toBe(2);
      expect(vec.z).toBe(3);
    });

    it('should create valid LoadingProgress object', () => {
      const progress: LoadingProgress = {
        state: 'loading',
        percentage: 50,
        loaded: 500000,
        total: 1000000,
        message: 'Loading model...',
      };

      expect(progress.state).toBe('loading');
      expect(progress.percentage).toBe(50);
      expect(progress.loaded).toBe(500000);
      expect(progress.total).toBe(1000000);
      expect(progress.message).toBe('Loading model...');
    });

    it('should allow LoadingProgress with zero total (unknown size)', () => {
      const progress: LoadingProgress = {
        state: 'loading',
        percentage: 0,
        loaded: 100000,
        total: 0,
        message: 'Loading...',
      };

      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should allow LoadingProgress with all loading states', () => {
      const states: LoadingState[] = ['idle', 'loading', 'loaded', 'error'];

      states.forEach((state) => {
        const progress: LoadingProgress = {
          state,
          percentage: state === 'loaded' ? 100 : 0,
          loaded: 0,
          total: 0,
          message: `State: ${state}`,
        };
        expect(progress.state).toBe(state);
      });
    });
  });
});
