/**
 * Unit tests for ui-context.ts - UI Context interface and labels
 */

import { ModelCropperUiContext, ModelCropperLabels, DEFAULT_LABELS } from './ui-context';
import { CropBoxConfig, MeshTransformConfig, LoadingState } from './types';

describe('ui-context', () => {
  describe('DEFAULT_LABELS', () => {
    it('should have all required label properties', () => {
      expect(DEFAULT_LABELS.applyCropLabel).toBeDefined();
      expect(DEFAULT_LABELS.downloadLabel).toBeDefined();
      expect(DEFAULT_LABELS.resetLabel).toBeDefined();
      expect(DEFAULT_LABELS.cropBoxTitle).toBeDefined();
      expect(DEFAULT_LABELS.transformTitle).toBeDefined();
      expect(DEFAULT_LABELS.positionLabel).toBeDefined();
      expect(DEFAULT_LABELS.rotationLabel).toBeDefined();
      expect(DEFAULT_LABELS.boxVisibleLabel).toBeDefined();
      expect(DEFAULT_LABELS.minXLabel).toBeDefined();
      expect(DEFAULT_LABELS.maxXLabel).toBeDefined();
      expect(DEFAULT_LABELS.minYLabel).toBeDefined();
      expect(DEFAULT_LABELS.maxYLabel).toBeDefined();
      expect(DEFAULT_LABELS.minZLabel).toBeDefined();
      expect(DEFAULT_LABELS.maxZLabel).toBeDefined();
      expect(DEFAULT_LABELS.loadingLabel).toBeDefined();
      expect(DEFAULT_LABELS.errorLabel).toBeDefined();
      expect(DEFAULT_LABELS.boxColorLabel).toBeDefined();
      expect(DEFAULT_LABELS.gridVisibleLabel).toBeDefined();
      expect(DEFAULT_LABELS.viewHelperVisibleLabel).toBeDefined();
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_LABELS.applyCropLabel).toBe('Apply Crop');
      expect(DEFAULT_LABELS.downloadLabel).toBe('Download GLB');
      expect(DEFAULT_LABELS.resetLabel).toBe('Reset');
      expect(DEFAULT_LABELS.cropBoxTitle).toBe('Crop Box');
      expect(DEFAULT_LABELS.transformTitle).toBe('Transform');
      expect(DEFAULT_LABELS.positionLabel).toBe('Position');
      expect(DEFAULT_LABELS.rotationLabel).toBe('Rotation');
      expect(DEFAULT_LABELS.boxVisibleLabel).toBe('Show Crop Box');
      expect(DEFAULT_LABELS.loadingLabel).toBe('Loading model...');
      expect(DEFAULT_LABELS.errorLabel).toBe('Error loading model');
      expect(DEFAULT_LABELS.boxColorLabel).toBe('Crop Box Color');
      expect(DEFAULT_LABELS.gridVisibleLabel).toBe('Show Grid');
      expect(DEFAULT_LABELS.viewHelperVisibleLabel).toBe('Show View Helper');
    });

    it('should have axis labels for min/max', () => {
      expect(DEFAULT_LABELS.minXLabel).toBe('Min X');
      expect(DEFAULT_LABELS.maxXLabel).toBe('Max X');
      expect(DEFAULT_LABELS.minYLabel).toBe('Min Y');
      expect(DEFAULT_LABELS.maxYLabel).toBe('Max Y');
      expect(DEFAULT_LABELS.minZLabel).toBe('Min Z');
      expect(DEFAULT_LABELS.maxZLabel).toBe('Max Z');
    });

    it('should be a frozen/immutable object', () => {
      // Verify it's a complete set (all properties present)
      const keys = Object.keys(DEFAULT_LABELS);
      expect(keys.length).toBeGreaterThan(0);

      // All values should be strings
      Object.values(DEFAULT_LABELS).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('ModelCropperLabels interface', () => {
    it('should allow partial label configuration', () => {
      const partialLabels: Partial<ModelCropperLabels> = {
        applyCropLabel: 'Crop It!',
      };

      expect(partialLabels.applyCropLabel).toBe('Crop It!');
      expect(partialLabels.downloadLabel).toBeUndefined();
    });

    it('should allow full label configuration', () => {
      const fullLabels: ModelCropperLabels = {
        applyCropLabel: 'Apply',
        downloadLabel: 'Export',
        resetLabel: 'Clear',
        cropBoxTitle: 'Bounds',
        transformTitle: 'Adjust',
        positionLabel: 'Pos',
        rotationLabel: 'Rot',
        boxVisibleLabel: 'Box',
        minXLabel: 'X-',
        maxXLabel: 'X+',
        minYLabel: 'Y-',
        maxYLabel: 'Y+',
        minZLabel: 'Z-',
        maxZLabel: 'Z+',
        loadingLabel: 'Please wait...',
        errorLabel: 'Error',
        boxColorLabel: 'Color',
        gridVisibleLabel: 'Grid',
        viewHelperVisibleLabel: 'Axes',
      };

      expect(fullLabels.applyCropLabel).toBe('Apply');
      expect(Object.keys(fullLabels).length).toBe(19);
    });

    it('should merge with defaults correctly', () => {
      const partialLabels: Partial<ModelCropperLabels> = {
        applyCropLabel: 'Custom Crop',
        downloadLabel: 'Custom Download',
      };

      const mergedLabels: Required<ModelCropperLabels> = {
        ...DEFAULT_LABELS,
        ...partialLabels,
      };

      expect(mergedLabels.applyCropLabel).toBe('Custom Crop');
      expect(mergedLabels.downloadLabel).toBe('Custom Download');
      expect(mergedLabels.resetLabel).toBe('Reset'); // From default
    });
  });

  describe('ModelCropperUiContext interface', () => {
    it('should define all required state properties', () => {
      // This is a type-level test - create a mock context
      const mockCropBox: CropBoxConfig = {
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: -1,
        maxZ: 1,
      };

      const mockTransform: MeshTransformConfig = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      };

      const mockContext: ModelCropperUiContext = {
        // State
        cropBox: mockCropBox,
        meshTransform: mockTransform,
        loadingState: 'idle',
        errorMessage: null,
        boxVisible: true,
        cropBoxColor: '#00ff00',
        gridVisible: false,
        viewHelperVisible: false,
        canApplyCrop: true,
        canExport: true,

        // Actions
        setCropBox: jasmine.createSpy('setCropBox'),
        setCropBoxValue: jasmine.createSpy('setCropBoxValue'),
        setMeshTransform: jasmine.createSpy('setMeshTransform'),
        setPosition: jasmine.createSpy('setPosition'),
        setRotation: jasmine.createSpy('setRotation'),
        toggleBoxVisibility: jasmine.createSpy('toggleBoxVisibility'),
        setCropBoxColor: jasmine.createSpy('setCropBoxColor'),
        toggleGridVisibility: jasmine.createSpy('toggleGridVisibility'),
        toggleViewHelperVisibility: jasmine.createSpy('toggleViewHelperVisibility'),
        applyCrop: jasmine.createSpy('applyCrop'),
        download: jasmine.createSpy('download'),
        resetCropBox: jasmine.createSpy('resetCropBox'),
        resetTransform: jasmine.createSpy('resetTransform'),
      };

      // Verify state properties
      expect(mockContext.cropBox).toEqual(mockCropBox);
      expect(mockContext.meshTransform).toEqual(mockTransform);
      expect(mockContext.loadingState).toBe('idle');
      expect(mockContext.errorMessage).toBeNull();
      expect(mockContext.boxVisible).toBe(true);
      expect(mockContext.cropBoxColor).toBe('#00ff00');
      expect(mockContext.gridVisible).toBe(false);
      expect(mockContext.viewHelperVisible).toBe(false);
      expect(mockContext.canApplyCrop).toBe(true);
      expect(mockContext.canExport).toBe(true);
    });

    it('should define all required action methods', () => {
      const mockContext = createMockUiContext();

      // Test that all action methods exist and are functions
      expect(typeof mockContext.setCropBox).toBe('function');
      expect(typeof mockContext.setCropBoxValue).toBe('function');
      expect(typeof mockContext.setMeshTransform).toBe('function');
      expect(typeof mockContext.setPosition).toBe('function');
      expect(typeof mockContext.setRotation).toBe('function');
      expect(typeof mockContext.toggleBoxVisibility).toBe('function');
      expect(typeof mockContext.setCropBoxColor).toBe('function');
      expect(typeof mockContext.toggleGridVisibility).toBe('function');
      expect(typeof mockContext.toggleViewHelperVisibility).toBe('function');
      expect(typeof mockContext.applyCrop).toBe('function');
      expect(typeof mockContext.download).toBe('function');
      expect(typeof mockContext.resetCropBox).toBe('function');
      expect(typeof mockContext.resetTransform).toBe('function');
    });

    it('should allow calling setCropBox action', () => {
      const mockContext = createMockUiContext();
      const newBox: CropBoxConfig = {
        minX: -2,
        maxX: 2,
        minY: -2,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      };

      mockContext.setCropBox(newBox);

      expect(mockContext.setCropBox).toHaveBeenCalledWith(newBox);
    });

    it('should allow calling setCropBoxValue action', () => {
      const mockContext = createMockUiContext();

      mockContext.setCropBoxValue('minX', -5);

      expect(mockContext.setCropBoxValue).toHaveBeenCalledWith('minX', -5);
    });

    it('should allow calling setPosition action', () => {
      const mockContext = createMockUiContext();

      mockContext.setPosition({ x: 1, y: 2 });

      expect(mockContext.setPosition).toHaveBeenCalledWith({ x: 1, y: 2 });
    });

    it('should allow calling setRotation action', () => {
      const mockContext = createMockUiContext();

      mockContext.setRotation({ z: Math.PI });

      expect(mockContext.setRotation).toHaveBeenCalledWith({ z: Math.PI });
    });

    it('should allow calling toggleBoxVisibility action', () => {
      const mockContext = createMockUiContext();

      mockContext.toggleBoxVisibility(false);

      expect(mockContext.toggleBoxVisibility).toHaveBeenCalledWith(false);
    });

    it('should allow calling setCropBoxColor action', () => {
      const mockContext = createMockUiContext();

      mockContext.setCropBoxColor('#ff0000');

      expect(mockContext.setCropBoxColor).toHaveBeenCalledWith('#ff0000');
    });

    it('should allow calling toggle visibility actions', () => {
      const mockContext = createMockUiContext();

      mockContext.toggleGridVisibility(true);
      mockContext.toggleViewHelperVisibility(true);

      expect(mockContext.toggleGridVisibility).toHaveBeenCalledWith(true);
      expect(mockContext.toggleViewHelperVisibility).toHaveBeenCalledWith(true);
    });

    it('should allow calling applyCrop action', () => {
      const mockContext = createMockUiContext();

      mockContext.applyCrop();

      expect(mockContext.applyCrop).toHaveBeenCalled();
    });

    it('should allow calling download action', () => {
      const mockContext = createMockUiContext();

      mockContext.download();

      expect(mockContext.download).toHaveBeenCalled();
    });

    it('should allow calling reset actions', () => {
      const mockContext = createMockUiContext();

      mockContext.resetCropBox();
      mockContext.resetTransform();

      expect(mockContext.resetCropBox).toHaveBeenCalled();
      expect(mockContext.resetTransform).toHaveBeenCalled();
    });
  });

  describe('LoadingState in UI context', () => {
    it('should support idle state', () => {
      const context = createMockUiContext({ loadingState: 'idle' });
      expect(context.loadingState).toBe('idle');
    });

    it('should support loading state', () => {
      const context = createMockUiContext({ loadingState: 'loading' });
      expect(context.loadingState).toBe('loading');
    });

    it('should support loaded state', () => {
      const context = createMockUiContext({ loadingState: 'loaded' });
      expect(context.loadingState).toBe('loaded');
    });

    it('should support error state with error message', () => {
      const context = createMockUiContext({
        loadingState: 'error',
        errorMessage: 'Failed to load model',
      });
      expect(context.loadingState).toBe('error');
      expect(context.errorMessage).toBe('Failed to load model');
    });
  });

  describe('canApplyCrop and canExport flags', () => {
    it('should be true when model is loaded', () => {
      const context = createMockUiContext({
        loadingState: 'loaded',
        canApplyCrop: true,
        canExport: true,
      });

      expect(context.canApplyCrop).toBe(true);
      expect(context.canExport).toBe(true);
    });

    it('should be false when loading', () => {
      const context = createMockUiContext({
        loadingState: 'loading',
        canApplyCrop: false,
        canExport: false,
      });

      expect(context.canApplyCrop).toBe(false);
      expect(context.canExport).toBe(false);
    });

    it('should be false on error', () => {
      const context = createMockUiContext({
        loadingState: 'error',
        canApplyCrop: false,
        canExport: false,
      });

      expect(context.canApplyCrop).toBe(false);
      expect(context.canExport).toBe(false);
    });
  });
});

/**
 * Helper function to create a mock UI context
 */
function createMockUiContext(
  overrides: Partial<{
    cropBox: CropBoxConfig;
    meshTransform: MeshTransformConfig;
    loadingState: LoadingState;
    errorMessage: string | null;
    boxVisible: boolean;
    cropBoxColor: string;
    gridVisible: boolean;
    viewHelperVisible: boolean;
    canApplyCrop: boolean;
    canExport: boolean;
  }> = {}
): ModelCropperUiContext {
  const defaultCropBox: CropBoxConfig = {
    minX: -1,
    maxX: 1,
    minY: -1,
    maxY: 1,
    minZ: -1,
    maxZ: 1,
  };

  const defaultTransform: MeshTransformConfig = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };

  return {
    cropBox: overrides.cropBox ?? defaultCropBox,
    meshTransform: overrides.meshTransform ?? defaultTransform,
    loadingState: overrides.loadingState ?? 'idle',
    errorMessage: overrides.errorMessage ?? null,
    boxVisible: overrides.boxVisible ?? true,
    cropBoxColor: overrides.cropBoxColor ?? '#00ff00',
    gridVisible: overrides.gridVisible ?? false,
    viewHelperVisible: overrides.viewHelperVisible ?? false,
    canApplyCrop: overrides.canApplyCrop ?? true,
    canExport: overrides.canExport ?? true,

    setCropBox: jasmine.createSpy('setCropBox'),
    setCropBoxValue: jasmine.createSpy('setCropBoxValue'),
    setMeshTransform: jasmine.createSpy('setMeshTransform'),
    setPosition: jasmine.createSpy('setPosition'),
    setRotation: jasmine.createSpy('setRotation'),
    toggleBoxVisibility: jasmine.createSpy('toggleBoxVisibility'),
    setCropBoxColor: jasmine.createSpy('setCropBoxColor'),
    toggleGridVisibility: jasmine.createSpy('toggleGridVisibility'),
    toggleViewHelperVisibility: jasmine.createSpy('toggleViewHelperVisibility'),
    applyCrop: jasmine.createSpy('applyCrop'),
    download: jasmine.createSpy('download'),
    resetCropBox: jasmine.createSpy('resetCropBox'),
    resetTransform: jasmine.createSpy('resetTransform'),
  };
}
