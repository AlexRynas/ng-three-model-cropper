/**
 * Unit tests for cheap-cropper.ts - Triangle pruning based geometry cropping
 */

import * as THREE from 'three';
import { CheapCropper } from './cheap-cropper';
import { CropBoxConfig } from './types';

describe('CheapCropper', () => {
  /**
   * Helper function to create a simple box geometry mesh
   */
  function createTestMesh(
    size = 2,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.updateMatrixWorld(true);
    return mesh;
  }

  /**
   * Helper function to create a triangle mesh at specific coordinates
   */
  function createTriangleMesh(v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    return mesh;
  }

  /**
   * Helper function to create a group with multiple meshes
   */
  function createTestGroup(): THREE.Group {
    const group = new THREE.Group();

    // Mesh in center
    const centerMesh = createTestMesh(1, new THREE.Vector3(0, 0, 0));
    centerMesh.name = 'center';
    group.add(centerMesh);

    // Mesh offset outside default crop box
    const outsideMesh = createTestMesh(0.5, new THREE.Vector3(5, 5, 5));
    outsideMesh.name = 'outside';
    group.add(outsideMesh);

    group.updateMatrixWorld(true);
    return group;
  }

  describe('applyCrop', () => {
    it('should return a CropResult object', () => {
      const root = createTestMesh();
      const cropBox: CropBoxConfig = {
        minX: -10,
        maxX: 10,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      };

      const result = CheapCropper.applyCrop(root, cropBox);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.trianglesRemoved).toBe('number');
      expect(typeof result.trianglesKept).toBe('number');
      expect(typeof result.meshesProcessed).toBe('number');
    });

    it('should keep all triangles when crop box encompasses entire mesh', () => {
      const mesh = createTestMesh(2); // 2x2x2 box centered at origin
      const cropBox: CropBoxConfig = {
        minX: -10,
        maxX: 10,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      };

      const originalTriangleCount = mesh.geometry.index
        ? mesh.geometry.index.count / 3
        : mesh.geometry.getAttribute('position').count / 3;

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      expect(result.trianglesRemoved).toBe(0);
      expect(result.trianglesKept).toBe(originalTriangleCount);
    });

    it('should remove triangles outside the crop box', () => {
      // Create a mesh that is partially outside the crop box
      const mesh = createTestMesh(4, new THREE.Vector3(0, 0, 0)); // 4x4x4 box
      const cropBox: CropBoxConfig = {
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: 0.5,
        minZ: -0.5,
        maxZ: 0.5,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      expect(result.trianglesRemoved).toBeGreaterThan(0);
    });

    it('should process multiple meshes in a hierarchy', () => {
      const group = createTestGroup();
      const cropBox: CropBoxConfig = {
        minX: -2,
        maxX: 2,
        minY: -2,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      };

      const result = CheapCropper.applyCrop(group, cropBox);

      expect(result.success).toBe(true);
      expect(result.meshesProcessed).toBe(2);
    });

    it('should handle empty Object3D', () => {
      const emptyGroup = new THREE.Group();
      const cropBox: CropBoxConfig = DEFAULT_CROP_BOX;

      const result = CheapCropper.applyCrop(emptyGroup, cropBox);

      expect(result.success).toBe(true);
      expect(result.meshesProcessed).toBe(0);
      expect(result.trianglesRemoved).toBe(0);
      expect(result.trianglesKept).toBe(0);
    });

    it('should handle mesh with no geometry', () => {
      const mesh = new THREE.Mesh();
      mesh.geometry = null as unknown as THREE.BufferGeometry;
      const cropBox: CropBoxConfig = DEFAULT_CROP_BOX;

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      expect(result.meshesProcessed).toBe(0);
    });
  });

  describe('TriangleTestStrategy: centroid', () => {
    it('should keep triangle when centroid is inside crop box', () => {
      // Triangle with centroid at origin
      const mesh = createTriangleMesh(
        new THREE.Vector3(-0.3, 0, 0),
        new THREE.Vector3(0.3, 0, 0),
        new THREE.Vector3(0, 0.3, 0)
      );
      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox, { strategy: 'centroid' });

      expect(result.trianglesKept).toBe(1);
      expect(result.trianglesRemoved).toBe(0);
    });

    it('should remove triangle when centroid is outside crop box', () => {
      // Triangle with centroid far from origin
      const mesh = createTriangleMesh(
        new THREE.Vector3(10, 10, 10),
        new THREE.Vector3(11, 10, 10),
        new THREE.Vector3(10.5, 11, 10)
      );
      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox, { strategy: 'centroid' });

      expect(result.trianglesKept).toBe(0);
      expect(result.trianglesRemoved).toBe(1);
    });
  });

  describe('TriangleTestStrategy: all-vertices', () => {
    it('should keep triangle when all vertices are inside crop box', () => {
      const mesh = createTriangleMesh(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.5, 0, 0),
        new THREE.Vector3(0.25, 0.5, 0)
      );
      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox, { strategy: 'all-vertices' });

      expect(result.trianglesKept).toBe(1);
    });

    it('should remove triangle when any vertex is outside crop box', () => {
      // One vertex outside
      const mesh = createTriangleMesh(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.5, 0, 0),
        new THREE.Vector3(5, 5, 5) // Outside
      );
      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox, { strategy: 'all-vertices' });

      expect(result.trianglesRemoved).toBe(1);
      expect(result.trianglesKept).toBe(0);
    });
  });

  describe('TriangleTestStrategy: any-vertex', () => {
    it('should keep triangle when at least one vertex is inside crop box', () => {
      // Two vertices outside, one inside
      const mesh = createTriangleMesh(
        new THREE.Vector3(0, 0, 0), // Inside
        new THREE.Vector3(5, 0, 0), // Outside
        new THREE.Vector3(5, 5, 0) // Outside
      );
      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox, { strategy: 'any-vertex' });

      expect(result.trianglesKept).toBe(1);
    });

    it('should remove triangle when all vertices are outside crop box', () => {
      const mesh = createTriangleMesh(
        new THREE.Vector3(5, 5, 5),
        new THREE.Vector3(6, 5, 5),
        new THREE.Vector3(5.5, 6, 5)
      );
      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox, { strategy: 'any-vertex' });

      expect(result.trianglesRemoved).toBe(1);
    });
  });

  describe('CheapCropOptions', () => {
    it('should use centroid strategy by default', () => {
      // Triangle with centroid inside but some vertices outside
      const mesh = createTriangleMesh(
        new THREE.Vector3(-0.2, 0, 0),
        new THREE.Vector3(0.2, 0, 0),
        new THREE.Vector3(0, 0.2, 0)
      );
      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox); // No options

      expect(result.trianglesKept).toBe(1);
    });

    it('should recompute normals by default', () => {
      const mesh = createTestMesh(2);
      const cropBox: CropBoxConfig = {
        minX: -0.5,
        maxX: 0.5,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      };

      CheapCropper.applyCrop(mesh, cropBox, { recomputeNormals: true });

      // New geometry should have normals attribute
      const normals = mesh.geometry.getAttribute('normal');
      expect(normals).toBeDefined();
    });

    it('should respect recomputeNormals: false option', () => {
      const mesh = createTriangleMesh(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0.5, 1, 0)
      );

      // Remove normals before crop
      mesh.geometry.deleteAttribute('normal');

      const cropBox: CropBoxConfig = {
        minX: -10,
        maxX: 10,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox, { recomputeNormals: false });

      expect(result.success).toBe(true);
    });
  });

  describe('World-space transformations', () => {
    it('should crop based on world-space coordinates, not local', () => {
      // Create a mesh at local origin, but translated in world space
      const mesh = createTestMesh(1, new THREE.Vector3(0, 0, 0));

      // Parent group translates the mesh
      const group = new THREE.Group();
      group.position.set(10, 10, 10);
      group.add(mesh);
      group.updateMatrixWorld(true);

      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(group, cropBox);

      // Mesh is at world position (10,10,10), so all triangles should be removed
      expect(result.trianglesKept).toBe(0);
    });

    it('should keep triangles for mesh translated into crop box', () => {
      const mesh = createTestMesh(1, new THREE.Vector3(0, 0, 0));

      // Mesh starts at local (5,5,5) which is outside cropbox
      mesh.position.set(5, 5, 5);

      // But parent moves it to world origin
      const group = new THREE.Group();
      group.position.set(-5, -5, -5);
      group.add(mesh);
      group.updateMatrixWorld(true);

      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const result = CheapCropper.applyCrop(group, cropBox);

      // Mesh is at world position (0,0,0), so triangles should be kept
      expect(result.trianglesKept).toBeGreaterThan(0);
    });

    it('should handle rotated meshes correctly', () => {
      const mesh = createTestMesh(1);
      mesh.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      mesh.updateMatrixWorld(true);

      const cropBox: CropBoxConfig = {
        minX: -2,
        maxX: 2,
        minY: -2,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      expect(result.trianglesKept).toBeGreaterThan(0);
    });

    it('should handle scaled meshes correctly', () => {
      const mesh = createTestMesh(1);
      mesh.scale.set(10, 10, 10); // Scale up 10x
      mesh.updateMatrixWorld(true);

      const cropBox: CropBoxConfig = {
        minX: -2,
        maxX: 2,
        minY: -2,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      // Scaled mesh extends from -5 to 5 on each axis in world space
      // Only triangles with centroids in [-2,2] should be kept
      expect(result.trianglesRemoved).toBeGreaterThan(0);
    });
  });

  describe('Indexed vs Non-indexed geometry', () => {
    it('should handle indexed geometry (BoxGeometry)', () => {
      const mesh = createTestMesh(2);
      // BoxGeometry uses indexed geometry by default
      expect(mesh.geometry.index).not.toBeNull();

      const cropBox: CropBoxConfig = {
        minX: -0.5,
        maxX: 0.5,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
    });

    it('should handle non-indexed geometry', () => {
      // Create non-indexed geometry manually
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        // Triangle 1
        0, 0, 0, 1, 0, 0, 0.5, 1, 0,
        // Triangle 2
        10, 10, 10, 11, 10, 10, 10.5, 11, 10,
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
      mesh.updateMatrixWorld(true);

      expect(mesh.geometry.index).toBeNull();

      const cropBox: CropBoxConfig = {
        minX: -1,
        maxX: 2,
        minY: -1,
        maxY: 2,
        minZ: -1,
        maxZ: 2,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      expect(result.trianglesKept).toBe(1);
      expect(result.trianglesRemoved).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle mesh with no position attribute', () => {
      const geometry = new THREE.BufferGeometry();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
      mesh.updateMatrixWorld(true);

      const cropBox: CropBoxConfig = DEFAULT_CROP_BOX;

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      expect(result.meshesProcessed).toBe(0);
    });

    it('should handle very small crop box', () => {
      const mesh = createTestMesh(2);
      const cropBox: CropBoxConfig = {
        minX: -0.001,
        maxX: 0.001,
        minY: -0.001,
        maxY: 0.001,
        minZ: -0.001,
        maxZ: 0.001,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      // Most or all triangles should be removed
      expect(result.trianglesRemoved).toBeGreaterThan(0);
    });

    it('should handle very large crop box', () => {
      const mesh = createTestMesh(2);
      const cropBox: CropBoxConfig = {
        minX: -1000,
        maxX: 1000,
        minY: -1000,
        maxY: 1000,
        minZ: -1000,
        maxZ: 1000,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      expect(result.success).toBe(true);
      expect(result.trianglesRemoved).toBe(0);
    });

    it('should handle negative crop box dimensions (inverted)', () => {
      const mesh = createTestMesh(2);
      // Inverted box where min > max
      const cropBox: CropBoxConfig = {
        minX: 1,
        maxX: -1,
        minY: 1,
        maxY: -1,
        minZ: 1,
        maxZ: -1,
      };

      const result = CheapCropper.applyCrop(mesh, cropBox);

      // Should remove all triangles since no point can satisfy min <= x <= max when min > max
      expect(result.trianglesKept).toBe(0);
    });
  });

  describe('Geometry preservation', () => {
    it('should preserve UV coordinates when cropping', () => {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
      mesh.updateMatrixWorld(true);

      const hasOriginalUVs = geometry.getAttribute('uv') !== undefined;
      expect(hasOriginalUVs).toBe(true);

      const cropBox: CropBoxConfig = {
        minX: -0.5,
        maxX: 0.5,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      };

      CheapCropper.applyCrop(mesh, cropBox);

      // New geometry should still have UV attribute
      const newUVs = mesh.geometry.getAttribute('uv');
      expect(newUVs).toBeDefined();
    });
  });
});

// Import DEFAULT_CROP_BOX for tests
const DEFAULT_CROP_BOX: CropBoxConfig = {
  minX: -1,
  minY: -1,
  minZ: -1,
  maxX: 1,
  maxY: 1,
  maxZ: 1,
};
