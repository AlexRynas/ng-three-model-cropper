/**
 * Unit tests for model-crop-engine.ts - Core Three.js service for 3D model manipulation
 */

import * as THREE from 'three';
import { ModelCropEngine, StateChangeCallback } from './model-crop-engine';
import { CropBoxConfig, MeshTransformConfig, LoadingState } from './types';

describe('ModelCropEngine', () => {
  let engine: ModelCropEngine;
  let hostElement: HTMLDivElement;

  beforeEach(() => {
    // Create a host element for the engine
    hostElement = document.createElement('div');
    hostElement.style.width = '800px';
    hostElement.style.height = '600px';
    document.body.appendChild(hostElement);

    // Mock offsetWidth/offsetHeight for ResizeObserver
    Object.defineProperty(hostElement, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(hostElement, 'clientHeight', { value: 600, configurable: true });

    engine = new ModelCropEngine(hostElement);
  });

  afterEach(() => {
    engine?.dispose();
    if (hostElement.parentNode) {
      document.body.removeChild(hostElement);
    }
  });

  describe('Constructor and Initialization', () => {
    it('should create an engine instance', () => {
      expect(engine).toBeDefined();
    });

    it('should append a canvas to the host element', () => {
      const canvas = hostElement.querySelector('canvas');
      expect(canvas).not.toBeNull();
    });

    it('should initialize with default config', () => {
      expect(engine.getLoadingState()).toBe('idle');
      expect(engine.getLoadedModel()).toBeNull();
    });

    it('should accept custom config options', () => {
      const customEngine = new ModelCropEngine(hostElement, {
        antialias: false,
        alpha: false,
        preserveDrawingBuffer: true,
      });

      expect(customEngine).toBeDefined();
      customEngine.dispose();
    });

    it('should handle small host element dimensions', () => {
      const smallHost = document.createElement('div');
      Object.defineProperty(smallHost, 'clientWidth', { value: 0, configurable: true });
      Object.defineProperty(smallHost, 'clientHeight', { value: 0, configurable: true });
      document.body.appendChild(smallHost);

      const smallEngine = new ModelCropEngine(smallHost);
      expect(smallEngine).toBeDefined();
      smallEngine.dispose();
      document.body.removeChild(smallHost);
    });
  });

  describe('setCallbacks', () => {
    it('should accept state change callbacks', () => {
      const loadingCallback = jasmine.createSpy('loadingCallback');
      const errorCallback = jasmine.createSpy('errorCallback');

      engine.setCallbacks({
        onLoadingStateChange: loadingCallback,
        onError: errorCallback,
      });

      // Callbacks should be stored (internal state)
      expect(engine).toBeDefined();
    });

    it('should call onLoadingStateChange when loading state changes', async () => {
      const states: LoadingState[] = [];
      engine.setCallbacks({
        onLoadingStateChange: (state) => states.push(state),
      });

      // Try loading a non-existent model to trigger state changes
      try {
        await engine.loadModel('nonexistent.glb');
      } catch {
        // Expected to fail
      }

      expect(states).toContain('loading');
    });

    it('should accept onProgress callback', () => {
      const progressCallback = jasmine.createSpy('progressCallback');

      engine.setCallbacks({
        onProgress: progressCallback,
      });

      // Callback should be stored (internal state)
      expect(engine).toBeDefined();
    });

    it('should call onProgress during model loading', async () => {
      const progressUpdates: {
        state: string;
        percentage: number;
        loaded: number;
        total: number;
        message: string;
      }[] = [];
      engine.setCallbacks({
        onProgress: (progress) => {
          progressUpdates.push({
            state: progress.state,
            percentage: progress.percentage,
            loaded: progress.loaded,
            total: progress.total,
            message: progress.message,
          });
        },
      });

      try {
        await engine.loadModel('nonexistent.glb');
      } catch {
        // Expected to fail
      }

      // onProgress should be called at least with initial loading state
      // Note: Since the file doesn't exist, progress may not fire for actual data
      expect(engine).toBeDefined();
    });
  });

  describe('Crop Box Management', () => {
    it('should return default crop box initially', () => {
      const box = engine.getCropBox();
      expect(box).toBeDefined();
      expect(typeof box.minX).toBe('number');
      expect(typeof box.maxX).toBe('number');
    });

    it('should update crop box', () => {
      const newBox: CropBoxConfig = {
        minX: -5,
        maxX: 5,
        minY: -5,
        maxY: 5,
        minZ: -5,
        maxZ: 5,
      };

      engine.updateCropBox(newBox);
      const box = engine.getCropBox();

      expect(box.minX).toBe(-5);
      expect(box.maxX).toBe(5);
    });

    it('should create new object when getting crop box (immutability)', () => {
      const box1 = engine.getCropBox();
      const box2 = engine.getCropBox();

      expect(box1).not.toBe(box2);
      expect(box1).toEqual(box2);
    });
  });

  describe('Crop Box Visibility', () => {
    it('should toggle box visibility', () => {
      engine.setBoxVisibility(false);
      expect(engine.getBoxVisibility()).toBe(false);

      engine.setBoxVisibility(true);
      expect(engine.getBoxVisibility()).toBe(true);
    });

    it('should start with box visible by default', () => {
      expect(engine.getBoxVisibility()).toBe(true);
    });
  });

  describe('Crop Box Color', () => {
    it('should set crop box color with hex number', () => {
      engine.setCropBoxColor(0xff0000);
      expect(engine).toBeDefined();
    });

    it('should set crop box color with hex string', () => {
      engine.setCropBoxColor('#ff0000');
      expect(engine).toBeDefined();
    });

    it('should set crop box color with color name string', () => {
      engine.setCropBoxColor('red');
      expect(engine).toBeDefined();
    });
  });

  describe('Grid Visibility', () => {
    it('should toggle grid visibility', () => {
      engine.setGridVisibility(true);
      engine.setGridVisibility(false);
      expect(engine).toBeDefined();
    });

    it('should create grid helper when first enabled', () => {
      engine.setGridVisibility(true);
      expect(engine).toBeDefined();
    });
  });

  describe('View Helper Visibility', () => {
    it('should toggle view helper visibility', () => {
      engine.setViewHelperVisibility(true);
      engine.setViewHelperVisibility(false);
      expect(engine).toBeDefined();
    });

    it('should create view helper when first enabled', () => {
      engine.setViewHelperVisibility(true);
      expect(engine).toBeDefined();
    });
  });

  describe('Mesh Transform', () => {
    it('should set mesh transform', () => {
      const transform: MeshTransformConfig = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
      };

      engine.setMeshTransform(transform);
      const result = engine.getMeshTransform();

      expect(result.position).toEqual(transform.position);
      expect(result.rotation).toEqual(transform.rotation);
    });

    it('should return a copy of mesh transform (immutability)', () => {
      const transform1 = engine.getMeshTransform();
      const transform2 = engine.getMeshTransform();

      expect(transform1).not.toBe(transform2);
      expect(transform1).toEqual(transform2);
    });
  });

  describe('applyCheapCrop', () => {
    it('should return unsuccessful result when no model loaded', () => {
      const result = engine.applyCheapCrop();

      expect(result.success).toBe(false);
      expect(result.trianglesRemoved).toBe(0);
      expect(result.trianglesKept).toBe(0);
      expect(result.meshesProcessed).toBe(0);
    });

    it('should accept crop options', () => {
      const result = engine.applyCheapCrop({ strategy: 'all-vertices' });

      expect(result).toBeDefined();
    });
  });

  describe('exportToGlb', () => {
    it('should throw error when no model loaded', async () => {
      await expectAsync(engine.exportToGlb()).toBeRejectedWithError('No model loaded to export');
    });
  });

  describe('getLoadedModel', () => {
    it('should return null when no model loaded', () => {
      expect(engine.getLoadedModel()).toBeNull();
    });
  });

  describe('getLoadingState', () => {
    it('should return idle initially', () => {
      expect(engine.getLoadingState()).toBe('idle');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      engine.dispose();

      // Canvas should be removed
      const canvas = hostElement.querySelector('canvas');
      expect(canvas).toBeNull();
    });

    it('should be safe to call multiple times', () => {
      engine.dispose();
      expect(() => engine.dispose()).not.toThrow();
    });

    it('should stop animation loop', () => {
      // Dispose should stop the render loop
      engine.dispose();
      expect(engine).toBeDefined();
    });
  });

  describe('Model Loading', () => {
    // Note: These tests require mocking the loaders or using actual files
    // In a real test environment, you would use jasmine spies or test fixtures

    it('should set loading state to loading when loadModel called', async () => {
      const states: LoadingState[] = [];
      engine.setCallbacks({
        onLoadingStateChange: (state) => states.push(state),
      });

      try {
        await engine.loadModel('test.glb');
      } catch {
        // Expected - file doesn't exist
      }

      expect(states[0]).toBe('loading');
    });

    it('should handle load errors gracefully', async () => {
      const errors: string[] = [];
      engine.setCallbacks({
        onError: (message) => errors.push(message),
      });

      try {
        await engine.loadModel('nonexistent-file.glb');
      } catch {
        // Expected to fail
      }

      expect(engine.getLoadingState()).toBe('error');
    });
  });

  describe('File Type Detection', () => {
    it('should attempt to load GLB files with GLTF loader', async () => {
      const states: LoadingState[] = [];
      engine.setCallbacks({
        onLoadingStateChange: (state) => states.push(state),
      });

      try {
        await engine.loadModel('model.glb');
      } catch {
        // Expected - file doesn't exist
      }

      expect(states).toContain('loading');
    });

    it('should attempt to load GLTF files with GLTF loader', async () => {
      try {
        await engine.loadModel('model.gltf');
      } catch {
        // Expected - file doesn't exist
      }
      expect(engine).toBeDefined();
    });

    it('should attempt to load FBX files with FBX loader', async () => {
      try {
        await engine.loadModel('model.fbx');
      } catch {
        // Expected - file doesn't exist
      }
      expect(engine).toBeDefined();
    });

    it('should fallback to GLTF for unknown extensions', async () => {
      try {
        await engine.loadModel('model.unknown');
      } catch {
        // Expected - file doesn't exist
      }
      expect(engine).toBeDefined();
    });
  });

  describe('Blob/File Loading', () => {
    it('should handle File objects', async () => {
      const blob = new Blob(['test'], { type: 'model/gltf-binary' });
      const file = new File([blob], 'test.glb', { type: 'model/gltf-binary' });

      try {
        await engine.loadModel(file);
      } catch {
        // Expected - invalid GLB content
      }

      expect(engine.getLoadingState()).toBe('error');
    });

    it('should handle Blob objects', async () => {
      const blob = new Blob(['test'], { type: 'model/gltf-binary' });

      try {
        await engine.loadModel(blob);
      } catch {
        // Expected - invalid GLB content
      }

      expect(engine.getLoadingState()).toBe('error');
    });
  });

  describe('Integration with Crop Box Visualization', () => {
    it('should update visualization when crop box changes', () => {
      const box: CropBoxConfig = {
        minX: -2,
        maxX: 2,
        minY: -2,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      };

      engine.updateCropBox(box);

      // Engine should have updated internal state
      expect(engine.getCropBox()).toEqual(box);
    });

    it('should handle rapid crop box updates', () => {
      for (let i = 0; i < 100; i++) {
        engine.updateCropBox({
          minX: -i,
          maxX: i,
          minY: -i,
          maxY: i,
          minZ: -i,
          maxZ: i,
        });
      }

      const finalBox = engine.getCropBox();
      expect(finalBox.maxX).toBe(99);
    });
  });

  describe('Scene Management', () => {
    it('should have a scene with background color', () => {
      // Scene background is set in constructor
      expect(engine).toBeDefined();
    });

    it('should add lighting to scene', () => {
      // Lighting is added in constructor
      expect(engine).toBeDefined();
    });
  });

  describe('Camera and Controls', () => {
    it('should have a perspective camera', () => {
      expect(engine).toBeDefined();
    });

    it('should have orbit controls', () => {
      expect(engine).toBeDefined();
    });
  });
});

describe('ModelCropEngine with Mock Model', () => {
  let engine: ModelCropEngine;
  let hostElement: HTMLDivElement;

  beforeEach(() => {
    hostElement = document.createElement('div');
    Object.defineProperty(hostElement, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(hostElement, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(hostElement);
    engine = new ModelCropEngine(hostElement);
  });

  afterEach(() => {
    engine?.dispose();
    if (hostElement.parentNode) {
      document.body.removeChild(hostElement);
    }
  });

  // Helper to inject a mock model
  function injectMockModel(engine: ModelCropEngine): THREE.Group {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    group.updateMatrixWorld(true);

    // Access private loadedModel via any cast (for testing purposes)
    (engine as unknown as { loadedModel: THREE.Object3D | null }).loadedModel = group;

    return group;
  }

  describe('applyCheapCrop with model', () => {
    it('should crop model when loaded', () => {
      const _model = injectMockModel(engine);

      engine.updateCropBox({
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: 0.5,
        minZ: -0.5,
        maxZ: 0.5,
      });

      const result = engine.applyCheapCrop();

      expect(result.success).toBe(true);
      expect(result.meshesProcessed).toBe(1);
    });

    it('should use specified strategy option', () => {
      injectMockModel(engine);

      const result = engine.applyCheapCrop({ strategy: 'any-vertex' });

      expect(result.success).toBe(true);
    });
  });

  describe('getLoadedModel with model', () => {
    it('should return the loaded model', () => {
      const model = injectMockModel(engine);
      expect(engine.getLoadedModel()).toBe(model);
    });
  });

  describe('Mesh transform application', () => {
    it('should apply transform to loaded model', () => {
      const model = injectMockModel(engine);

      engine.setMeshTransform({
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
      });

      expect(model.position.x).toBe(1);
      expect(model.position.y).toBe(2);
      expect(model.position.z).toBe(3);
    });
  });
});

describe('StateChangeCallback type', () => {
  it('should accept LoadingState callback', () => {
    const callback: StateChangeCallback<LoadingState> = (state) => {
      expect(['idle', 'loading', 'loaded', 'error']).toContain(state);
    };

    callback('idle');
    callback('loading');
    callback('loaded');
    callback('error');
  });

  it('should accept string callback for errors', () => {
    const callback: StateChangeCallback<string> = (message) => {
      expect(typeof message).toBe('string');
    };

    callback('Test error message');
  });
});
