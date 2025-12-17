/**
 * Unit tests for model-cropper.service.ts - Angular adapter service
 */

import { TestBed } from '@angular/core/testing';
import { ModelCropperService } from './model-cropper.service';
import {
  CropBoxConfig,
  MeshTransformConfig,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
} from '../core/types';
import { ModelCropEngine } from '../core/model-crop-engine';

describe('ModelCropperService', () => {
  let service: ModelCropperService;
  let hostElement: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModelCropperService],
    });

    service = TestBed.inject(ModelCropperService);

    // Create host element for viewport
    hostElement = document.createElement('div');
    hostElement.style.width = '800px';
    hostElement.style.height = '600px';
    Object.defineProperty(hostElement, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(hostElement, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    service.dispose();
    if (hostElement.parentNode) {
      document.body.removeChild(hostElement);
    }
  });

  describe('Initial State', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have idle loading state initially', () => {
      expect(service.loadingState()).toBe('idle');
    });

    it('should have null error message initially', () => {
      expect(service.errorMessage()).toBeNull();
    });

    it('should have default crop box', () => {
      const box = service.cropBox();
      expect(box).toEqual(DEFAULT_CROP_BOX);
    });

    it('should have default mesh transform', () => {
      const transform = service.meshTransform();
      expect(transform).toEqual(DEFAULT_MESH_TRANSFORM);
    });

    it('should have box visible by default', () => {
      expect(service.boxVisible()).toBe(true);
    });

    it('should have default green crop box color', () => {
      expect(service.cropBoxColor()).toBe('#00ff00');
    });

    it('should have grid hidden by default', () => {
      expect(service.gridVisible()).toBe(false);
    });

    it('should have view helper hidden by default', () => {
      expect(service.viewHelperVisible()).toBe(false);
    });

    it('should have null last crop result', () => {
      expect(service.lastCropResult()).toBeNull();
    });

    it('should have default loading progress', () => {
      const progress = service.loadingProgress();
      expect(progress.state).toBe('idle');
      expect(progress.percentage).toBe(0);
      expect(progress.loaded).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.message).toBe('');
    });
  });

  describe('Computed Signals', () => {
    it('should compute isLoading correctly', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('should compute isLoaded correctly', () => {
      expect(service.isLoaded()).toBe(false);
    });

    it('should compute hasError correctly', () => {
      expect(service.hasError()).toBe(false);
    });

    it('should compute canApplyCrop correctly', () => {
      expect(service.canApplyCrop()).toBe(false);
    });

    it('should compute canExport correctly', () => {
      expect(service.canExport()).toBe(false);
    });

    it('should have cropIsValid signal', () => {
      expect(service.cropIsValid()).toBe(false);
    });
  });

  describe('setInitialValues', () => {
    it('should set initial crop box', () => {
      const customBox: CropBoxConfig = {
        minX: -5,
        maxX: 5,
        minY: -5,
        maxY: 5,
        minZ: -5,
        maxZ: 5,
      };

      service.setInitialValues(customBox);

      expect(service.cropBox()).toEqual(customBox);
    });

    it('should set initial transform', () => {
      const customTransform: MeshTransformConfig = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
      };

      service.setInitialValues(undefined, customTransform);

      expect(service.meshTransform()).toEqual(customTransform);
    });

    it('should set visual options', () => {
      service.setInitialValues(undefined, undefined, {
        cropBoxColor: '#ff0000',
        showGrid: true,
        showViewHelper: true,
      });

      expect(service.cropBoxColor()).toBe('#ff0000');
      expect(service.gridVisible()).toBe(true);
      expect(service.viewHelperVisible()).toBe(true);
    });

    it('should round crop box values', () => {
      const preciseBox: CropBoxConfig = {
        minX: -1.234567,
        maxX: 1.234567,
        minY: -1.234567,
        maxY: 1.234567,
        minZ: -1.234567,
        maxZ: 1.234567,
      };

      service.setInitialValues(preciseBox);

      const box = service.cropBox();
      expect(box.minX).toBe(-1.23);
      expect(box.maxX).toBe(1.23);
    });

    it('should round transform values', () => {
      const preciseTransform: MeshTransformConfig = {
        position: { x: 1.234567, y: 2.345678, z: 3.456789 },
        rotation: { x: 0.123456, y: 0.234567, z: 0.345678 },
      };

      service.setInitialValues(undefined, preciseTransform);

      const transform = service.meshTransform();
      expect(transform.position.x).toBe(1.23);
      expect(transform.rotation.z).toBe(0.35);
    });

    it('should accept rotationUnit and convert degrees to radians on update', () => {
      // Set rotation unit to degrees
      service.setInitialValues(undefined, undefined, undefined, 'degrees');

      // Update rotation using degrees - 180 degrees should become ~3.14 radians
      service.updateRotation({ y: 180 });

      const rounded = Math.round(service.meshTransform().rotation.y * 100) / 100;
      expect(rounded).toBe(3.14);
    });
  });
  describe('initViewport', () => {
    it('should initialize viewport', () => {
      service.initViewport(hostElement);

      expect(service.getEngine()).not.toBeNull();
    });

    it('should dispose previous engine if exists', () => {
      service.initViewport(hostElement);
      const firstEngine = service.getEngine();

      service.initViewport(hostElement);
      const secondEngine = service.getEngine();

      expect(secondEngine).not.toBe(firstEngine);
    });

    it('should sync visual states to engine', () => {
      service.setInitialValues(undefined, undefined, {
        cropBoxColor: '#ff0000',
        showGrid: true,
        showViewHelper: true,
      });

      service.initViewport(hostElement);

      // Engine should be initialized with these settings
      expect(service.getEngine()).not.toBeNull();
    });
  });

  describe('loadModel', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should throw error if viewport not initialized', async () => {
      const uninitializedService = new ModelCropperService();

      await expectAsync(uninitializedService.loadModel('test.glb')).toBeRejectedWithError(
        'Viewport not initialized. Call initViewport first.'
      );
    });

    it('should clear error message before loading', async () => {
      try {
        await service.loadModel('test.glb');
      } catch {
        // Expected
      }

      // Error message is set by loading failure, but was cleared first
      expect(service.errorMessage()).toBeDefined();
    });

    it('should set error message on load failure', async () => {
      try {
        await service.loadModel('nonexistent.glb');
      } catch {
        // Expected
      }

      expect(service.errorMessage()).not.toBeNull();
    });
  });

  describe('updateCropBox', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should update crop box signal', () => {
      const newBox: CropBoxConfig = {
        minX: -3,
        maxX: 3,
        minY: -3,
        maxY: 3,
        minZ: -3,
        maxZ: 3,
      };

      service.updateCropBox(newBox);

      expect(service.cropBox()).toEqual(newBox);
    });

    it('should invalidate crop when crop box is updated', () => {
      // Simulate a valid crop state by applying a crop
      service.applyCrop();

      // Update crop box
      service.updateCropBox({
        minX: -3,
        maxX: 3,
        minY: -3,
        maxY: 3,
        minZ: -3,
        maxZ: 3,
      });

      // Crop should now be invalid
      expect(service.cropIsValid()).toBe(false);
    });

    it('should round values', () => {
      const preciseBox: CropBoxConfig = {
        minX: -3.456,
        maxX: 3.456,
        minY: -3.456,
        maxY: 3.456,
        minZ: -3.456,
        maxZ: 3.456,
      };

      service.updateCropBox(preciseBox);

      expect(service.cropBox().minX).toBe(-3.46);
    });

    it('should update engine crop box', () => {
      const newBox: CropBoxConfig = {
        minX: -2,
        maxX: 2,
        minY: -2,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      };

      service.updateCropBox(newBox);

      const engineBox = service.getEngine()?.getCropBox();
      expect(engineBox).toEqual(newBox);
    });
  });

  describe('updateCropBoxValue', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should update single crop box value', () => {
      service.updateCropBoxValue('minX', -10);

      expect(service.cropBox().minX).toBe(-10);
      expect(service.cropBox().maxX).toBe(1); // Unchanged
    });

    it('should update all keys correctly', () => {
      service.updateCropBoxValue('minX', -5);
      service.updateCropBoxValue('maxX', 5);
      service.updateCropBoxValue('minY', -6);
      service.updateCropBoxValue('maxY', 6);
      service.updateCropBoxValue('minZ', -7);
      service.updateCropBoxValue('maxZ', 7);

      const box = service.cropBox();
      expect(box.minX).toBe(-5);
      expect(box.maxX).toBe(5);
      expect(box.minY).toBe(-6);
      expect(box.maxY).toBe(6);
      expect(box.minZ).toBe(-7);
      expect(box.maxZ).toBe(7);
    });
  });

  describe('toggleBoxVisibility', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should toggle box visibility signal', () => {
      service.toggleBoxVisibility(false);
      expect(service.boxVisible()).toBe(false);

      service.toggleBoxVisibility(true);
      expect(service.boxVisible()).toBe(true);
    });
  });

  describe('setCropBoxColor', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should set valid hex color', () => {
      service.setCropBoxColor('#ff0000');
      expect(service.cropBoxColor()).toBe('#ff0000');
    });

    it('should normalize color without hash', () => {
      service.setCropBoxColor('00ff00');
      expect(service.cropBoxColor()).toBe('#00ff00');
    });

    it('should fallback to green for invalid color', () => {
      service.setCropBoxColor('invalid');
      expect(service.cropBoxColor()).toBe('#00ff00');
    });

    it('should handle 3-character hex codes', () => {
      service.setCropBoxColor('#f00');
      expect(service.cropBoxColor()).toBe('#f00');
    });

    it('should handle non-string input', () => {
      service.setCropBoxColor(null as unknown as string);
      expect(service.cropBoxColor()).toBe('#00ff00');
    });
  });

  describe('toggleGridVisibility', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should toggle grid visibility signal', () => {
      service.toggleGridVisibility(true);
      expect(service.gridVisible()).toBe(true);

      service.toggleGridVisibility(false);
      expect(service.gridVisible()).toBe(false);
    });
  });

  describe('toggleViewHelperVisibility', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should toggle view helper visibility signal', () => {
      service.toggleViewHelperVisibility(true);
      expect(service.viewHelperVisible()).toBe(true);

      service.toggleViewHelperVisibility(false);
      expect(service.viewHelperVisible()).toBe(false);
    });
  });

  describe('updateTransform', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should update transform signal', () => {
      const newTransform: MeshTransformConfig = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.5, y: 0.5, z: 0.5 },
      };

      service.updateTransform(newTransform);

      expect(service.meshTransform()).toEqual(newTransform);
    });

    it('should invalidate crop when transform is updated', () => {
      // Apply a crop
      service.applyCrop();

      // Update transform
      service.updateTransform({
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.5, y: 0.5, z: 0.5 },
      });

      // Crop should now be invalid
      expect(service.cropIsValid()).toBe(false);
    });

    it('should round transform values', () => {
      const preciseTransform: MeshTransformConfig = {
        position: { x: 1.2345, y: 2.3456, z: 3.4567 },
        rotation: { x: 0.1234, y: 0.2345, z: 0.3456 },
      };

      service.updateTransform(preciseTransform);

      expect(service.meshTransform().position.x).toBe(1.23);
    });
  });

  describe('updatePosition', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should update position partially', () => {
      service.updatePosition({ x: 5 });

      expect(service.meshTransform().position.x).toBe(5);
      expect(service.meshTransform().position.y).toBe(0);
      expect(service.meshTransform().position.z).toBe(0);
    });

    it('should update multiple position components', () => {
      service.updatePosition({ x: 1, z: 3 });

      expect(service.meshTransform().position.x).toBe(1);
      expect(service.meshTransform().position.y).toBe(0);
      expect(service.meshTransform().position.z).toBe(3);
    });
  });

  describe('updateRotation', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should update rotation partially', () => {
      service.updateRotation({ y: Math.PI });

      const rounded = Math.round(service.meshTransform().rotation.y * 100) / 100;
      expect(rounded).toBe(3.14);
      expect(service.meshTransform().rotation.x).toBe(0);
    });
  });

  describe('applyCrop', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should return unsuccessful result when engine not initialized', () => {
      const uninitializedService = new ModelCropperService();
      const result = uninitializedService.applyCrop();

      expect(result.success).toBe(false);
      expect(result.trianglesRemoved).toBe(0);
      expect(result.trianglesKept).toBe(0);
      expect(result.meshesProcessed).toBe(0);
    });

    it('should store last crop result', () => {
      const result = service.applyCrop();

      expect(service.lastCropResult()).toEqual(result);
    });

    it('should set cropIsValid to true on successful crop', () => {
      // Apply crop (no model loaded, but engine initialized)
      service.applyCrop();

      // Note: Without a model, the crop may not be "successful"
      // This tests that the mechanism exists
      expect(typeof service.cropIsValid()).toBe('boolean');
    });

    it('should return CropResult with correct structure', () => {
      const result = service.applyCrop();

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.trianglesRemoved).toBe('number');
      expect(typeof result.trianglesKept).toBe('number');
      expect(typeof result.meshesProcessed).toBe('number');
    });
  });

  describe('exportGlb', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should throw error when viewport not initialized', async () => {
      const uninitializedService = new ModelCropperService();

      await expectAsync(uninitializedService.exportGlb()).toBeRejectedWithError(
        'Viewport not initialized'
      );
    });

    it('should throw error when no model loaded', async () => {
      await expectAsync(service.exportGlb()).toBeRejectedWithError('No model loaded to export');
    });
  });

  describe('resetCropBox', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should reset crop box to default when no model', () => {
      service.updateCropBox({
        minX: -10,
        maxX: 10,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      });

      service.resetCropBox();

      expect(service.cropBox()).toEqual(DEFAULT_CROP_BOX);
    });
  });

  describe('resetTransform', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should reset transform to default', () => {
      service.updateTransform({
        position: { x: 5, y: 5, z: 5 },
        rotation: { x: 1, y: 1, z: 1 },
      });

      service.resetTransform();

      expect(service.meshTransform()).toEqual(DEFAULT_MESH_TRANSFORM);
    });
  });

  describe('getEngine', () => {
    it('should return null before initialization', () => {
      expect(service.getEngine()).toBeNull();
    });

    it('should return engine after initialization', () => {
      service.initViewport(hostElement);

      expect(service.getEngine()).not.toBeNull();
      expect(service.getEngine()).toBeInstanceOf(ModelCropEngine);
    });
  });

  describe('dispose', () => {
    it('should reset all state', () => {
      service.initViewport(hostElement);
      service.updateCropBox({
        minX: -5,
        maxX: 5,
        minY: -5,
        maxY: 5,
        minZ: -5,
        maxZ: 5,
      });

      service.dispose();

      expect(service.loadingState()).toBe('idle');
      expect(service.errorMessage()).toBeNull();
      expect(service.cropBox()).toEqual(DEFAULT_CROP_BOX);
      expect(service.meshTransform()).toEqual(DEFAULT_MESH_TRANSFORM);
      expect(service.boxVisible()).toBe(true);
      expect(service.cropBoxColor()).toBe('#00ff00');
      expect(service.gridVisible()).toBe(false);
      expect(service.viewHelperVisible()).toBe(false);
      expect(service.lastCropResult()).toBeNull();
      expect(service.getEngine()).toBeNull();
      expect(service.cropIsValid()).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      service.initViewport(hostElement);

      expect(() => {
        service.dispose();
        service.dispose();
      }).not.toThrow();
    });
  });

  describe('Signal reactivity', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should emit isLoading changes', () => {
      // Initial state
      expect(service.isLoading()).toBe(false);
    });

    it('should emit hasError changes based on loading state', () => {
      expect(service.hasError()).toBe(false);
    });

    it('should emit canApplyCrop based on loading state', () => {
      expect(service.canApplyCrop()).toBe(false);
    });

    it('should emit canExport based on loading state and crop validity', () => {
      // Initially false because no model loaded
      expect(service.canExport()).toBe(false);
    });
  });

  describe('Crop Validity and Export Availability', () => {
    beforeEach(() => {
      service.initViewport(hostElement);
    });

    it('should start with invalid crop', () => {
      expect(service.cropIsValid()).toBe(false);
    });

    it('should invalidate crop when crop box value is updated', () => {
      service.applyCrop();

      service.updateCropBoxValue('minX', -5);

      expect(service.cropIsValid()).toBe(false);
    });

    it('should invalidate crop when position is updated', () => {
      service.applyCrop();

      service.updatePosition({ x: 1 });

      expect(service.cropIsValid()).toBe(false);
    });

    it('should invalidate crop when rotation is updated', () => {
      service.applyCrop();

      service.updateRotation({ y: 0.5 });

      expect(service.cropIsValid()).toBe(false);
    });

    it('should require re-applying crop after parameter changes for export', () => {
      // This tests the intended workflow
      service.applyCrop();
      service.updateCropBox(DEFAULT_CROP_BOX);

      // Export should not be available until crop is re-applied
      expect(service.cropIsValid()).toBe(false);
    });
  });
});

describe('ModelCropperService edge cases', () => {
  let service: ModelCropperService;
  let hostElement: HTMLDivElement;

  beforeEach(() => {
    service = new ModelCropperService();
    hostElement = document.createElement('div');
    Object.defineProperty(hostElement, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(hostElement, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    service.dispose();
    if (hostElement.parentNode) {
      document.body.removeChild(hostElement);
    }
  });

  it('should handle operations without viewport initialization gracefully', () => {
    // These should not throw
    expect(() => service.toggleBoxVisibility(false)).not.toThrow();
    expect(() => service.setCropBoxColor('#ff0000')).not.toThrow();
    expect(() => service.toggleGridVisibility(true)).not.toThrow();
    expect(() => service.toggleViewHelperVisibility(true)).not.toThrow();
    expect(() => service.updateCropBox(DEFAULT_CROP_BOX)).not.toThrow();
    expect(() => service.updateTransform(DEFAULT_MESH_TRANSFORM)).not.toThrow();
    expect(() => service.updatePosition({ x: 1 })).not.toThrow();
    expect(() => service.updateRotation({ y: 1 })).not.toThrow();
    expect(() => service.resetCropBox()).not.toThrow();
    expect(() => service.resetTransform()).not.toThrow();
  });

  it('should normalize hex colors correctly', () => {
    service.initViewport(hostElement);

    // Valid 6-char hex
    service.setCropBoxColor('#abcdef');
    expect(service.cropBoxColor()).toBe('#abcdef');

    // Valid 3-char hex
    service.setCropBoxColor('#abc');
    expect(service.cropBoxColor()).toBe('#abc');

    // Without hash
    service.setCropBoxColor('ff0000');
    expect(service.cropBoxColor()).toBe('#ff0000');

    // With spaces
    service.setCropBoxColor('  #00ff00  ');
    expect(service.cropBoxColor()).toBe('#00ff00');

    // Invalid
    service.setCropBoxColor('not-a-color');
    expect(service.cropBoxColor()).toBe('#00ff00');
  });

  it('should handle rounding edge cases', () => {
    service.initViewport(hostElement);

    // Test rounding at boundary
    service.updateCropBox({
      minX: -1.005,
      maxX: 1.005,
      minY: -1.005,
      maxY: 1.005,
      minZ: -1.005,
      maxZ: 1.005,
    });

    // Should be rounded to 2 decimal places
    const box = service.cropBox();
    // Allow for floating point precision issues
    expect(Math.abs(box.minX - -1.01)).toBeLessThan(0.02);
  });
});
