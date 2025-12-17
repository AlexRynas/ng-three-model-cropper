/**
 * ModelCropperService - Angular adapter service for ModelCropEngine
 *
 * This service wraps the framework-agnostic ModelCropEngine and provides
 * Angular-friendly APIs using signals for state management.
 *
 * Designed for Angular 17+ with zoneless-friendly signal-based updates.
 */

import { Injectable, signal, computed, Signal, WritableSignal } from '@angular/core';
import {
  CropBoxConfig,
  MeshTransformConfig,
  LoadingState,
  LoadingProgress,
  CropResult,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
  AngleUnit,
} from '../core/types';
import { ModelCropEngine } from '../core/model-crop-engine';

/**
 * Default loading progress state
 */
const DEFAULT_LOADING_PROGRESS: LoadingProgress = {
  state: 'idle',
  percentage: 0,
  loaded: 0,
  total: 0,
  message: '',
};

/**
 * Angular adapter service for the 3D model cropper
 * Provides signal-based state management and wraps ModelCropEngine
 */
@Injectable()
export class ModelCropperService {
  // Core engine instance
  private engine: ModelCropEngine | null = null;

  // State signals
  private readonly _loadingState: WritableSignal<LoadingState> = signal('idle');
  private readonly _loadingProgress: WritableSignal<LoadingProgress> =
    signal(DEFAULT_LOADING_PROGRESS);
  private readonly _errorMessage: WritableSignal<string | null> = signal(null);
  private readonly _cropBox: WritableSignal<CropBoxConfig> = signal(DEFAULT_CROP_BOX);
  private readonly _meshTransform: WritableSignal<MeshTransformConfig> =
    signal(DEFAULT_MESH_TRANSFORM);
  private readonly _boxVisible: WritableSignal<boolean> = signal(true);
  private readonly _cropBoxColor: WritableSignal<string> = signal('#00ff00');
  private readonly _gridVisible: WritableSignal<boolean> = signal(false);
  private readonly _viewHelperVisible: WritableSignal<boolean> = signal(false);
  private readonly _sceneBackgroundColor: WritableSignal<string> = signal('#2a2a2a');
  private readonly _lastCropResult: WritableSignal<CropResult | null> = signal(null);
  private readonly _cropIsValid: WritableSignal<boolean> = signal(false);
  private readonly _rotationUnit: WritableSignal<AngleUnit> = signal('radians');

  /**
   * Set initial values (must be called before initViewport)
   */
  setInitialValues(
    cropBox?: CropBoxConfig,
    transform?: MeshTransformConfig,
    visualOptions?: {
      cropBoxColor?: string;
      showGrid?: boolean;
      showViewHelper?: boolean;
      sceneBackgroundColor?: string;
    },
    rotationUnit?: AngleUnit
  ): void {
    if (cropBox) {
      this._cropBox.set(this.roundCropBox(cropBox));
    }
    if (transform) {
      this._meshTransform.set(this.roundTransform(transform));
    }
    if (visualOptions?.cropBoxColor) {
      this._cropBoxColor.set(visualOptions.cropBoxColor);
    }
    if (typeof visualOptions?.showGrid === 'boolean') {
      this._gridVisible.set(visualOptions.showGrid);
    }
    if (typeof visualOptions?.showViewHelper === 'boolean') {
      this._viewHelperVisible.set(visualOptions.showViewHelper);
    }
    if (rotationUnit) {
      this._rotationUnit.set(rotationUnit);
    }
    if (visualOptions?.sceneBackgroundColor) {
      this._sceneBackgroundColor.set(visualOptions.sceneBackgroundColor);
    }
  }

  // Public readonly signals
  readonly loadingState: Signal<LoadingState> = this._loadingState.asReadonly();
  readonly loadingProgress: Signal<LoadingProgress> = this._loadingProgress.asReadonly();
  readonly errorMessage: Signal<string | null> = this._errorMessage.asReadonly();
  readonly cropBox: Signal<CropBoxConfig> = this._cropBox.asReadonly();
  readonly meshTransform: Signal<MeshTransformConfig> = this._meshTransform.asReadonly();
  readonly boxVisible: Signal<boolean> = this._boxVisible.asReadonly();
  readonly cropBoxColor: Signal<string> = this._cropBoxColor.asReadonly();
  readonly gridVisible: Signal<boolean> = this._gridVisible.asReadonly();
  readonly viewHelperVisible: Signal<boolean> = this._viewHelperVisible.asReadonly();
  readonly sceneBackgroundColor: Signal<string> = this._sceneBackgroundColor.asReadonly();
  readonly lastCropResult: Signal<CropResult | null> = this._lastCropResult.asReadonly();

  // Computed signals
  readonly isLoading: Signal<boolean> = computed(() => this._loadingState() === 'loading');
  readonly isLoaded: Signal<boolean> = computed(() => this._loadingState() === 'loaded');
  readonly hasError: Signal<boolean> = computed(() => this._loadingState() === 'error');
  readonly canApplyCrop: Signal<boolean> = computed(() => this._loadingState() === 'loaded');
  readonly canExport: Signal<boolean> = computed(
    () => this._loadingState() === 'loaded' && this._cropIsValid()
  );
  readonly cropIsValid: Signal<boolean> = this._cropIsValid.asReadonly();

  /**
   * Initialize the viewport with the host element
   * This creates the ModelCropEngine instance
   */
  initViewport(hostElement: HTMLElement): void {
    if (this.engine) {
      this.engine.dispose();
    }

    this.engine = new ModelCropEngine(hostElement);

    // Set up callbacks for state synchronization
    this.engine.setCallbacks({
      onLoadingStateChange: (state: LoadingState) => {
        this._loadingState.set(state);
        // Update progress state when loading state changes
        if (state === 'loaded') {
          this._loadingProgress.set({
            state: 'loaded',
            percentage: 100,
            loaded: this._loadingProgress().total || 0,
            total: this._loadingProgress().total || 0,
            message: 'Model loaded successfully',
          });
        } else if (state === 'error') {
          this._loadingProgress.set({
            ...this._loadingProgress(),
            state: 'error',
            message: 'Failed to load model',
          });
        } else if (state === 'idle') {
          this._loadingProgress.set(DEFAULT_LOADING_PROGRESS);
        }
      },
      onError: (message: string) => this._errorMessage.set(message),
      onProgress: (progress: LoadingProgress) => this._loadingProgress.set(progress),
    });

    // Sync visual states to engine
    this.engine.updateCropBox(this._cropBox());
    this.engine.setMeshTransform(this._meshTransform());
    this.engine.setBoxVisibility(this._boxVisible());
    this.engine.setCropBoxColor(this._cropBoxColor());
    this.engine.setGridVisibility(this._gridVisible());
    this.engine.setViewHelperVisibility(this._viewHelperVisible());
    this.engine.setSceneBackgroundColor(this._sceneBackgroundColor());
  }

  /**
   * Update scene background color (accepts any CSS color string, including rgba/hex with alpha)
   */
  setSceneBackgroundColor(color: string): void {
    this._sceneBackgroundColor.set(color);
    this.engine?.setSceneBackgroundColor(color);
  }

  /**
   * Load a 3D model from URL
   */
  async loadModel(srcUrl: string): Promise<void> {
    if (!this.engine) {
      throw new Error('Viewport not initialized. Call initViewport first.');
    }

    this._errorMessage.set(null);

    try {
      await this.engine.loadModel(srcUrl);

      // Sync crop box from engine (may have been adjusted to model size)
      const box = this.engine.getCropBox();
      this._cropBox.set(this.roundCropBox(box));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load model';
      this._errorMessage.set(message);
      throw error;
    }
  }

  /**
   * Update the crop box configuration
   * Note: This invalidates the current crop, requiring re-application before export
   */
  updateCropBox(box: CropBoxConfig): void {
    const rounded = this.roundCropBox(box);
    this._cropBox.set(rounded);
    this.engine?.updateCropBox(rounded);
    this._cropIsValid.set(false);
  }

  /**
   * Update a single crop box value
   */
  updateCropBoxValue(key: keyof CropBoxConfig, value: number): void {
    const current = this._cropBox();
    const updated = { ...current, [key]: value };
    this.updateCropBox(updated);
  }

  /**
   * Toggle crop box visibility
   */
  toggleBoxVisibility(visible: boolean): void {
    this._boxVisible.set(visible);
    this.engine?.setBoxVisibility(visible);
  }

  /**
   * Update crop box color (hex string like #00ff00)
   */
  setCropBoxColor(color: string): void {
    const normalized = this.normalizeColor(color);
    this._cropBoxColor.set(normalized);
    this.engine?.setCropBoxColor(normalized);
  }

  /**
   * Toggle grid helper visibility
   */
  toggleGridVisibility(visible: boolean): void {
    this._gridVisible.set(visible);
    this.engine?.setGridVisibility(visible);
  }

  /**
   * Toggle view helper visibility
   */
  toggleViewHelperVisibility(visible: boolean): void {
    this._viewHelperVisible.set(visible);
    this.engine?.setViewHelperVisibility(visible);
  }

  /**
   * Update mesh transformation
   * Note: This invalidates the current crop, requiring re-application before export
   */
  updateTransform(transform: MeshTransformConfig): void {
    const rounded = this.roundTransform(transform);
    this._meshTransform.set(rounded);
    this.engine?.setMeshTransform(rounded);
    this._cropIsValid.set(false);
  }

  /**
   * Update position values
   */
  updatePosition(position: Partial<{ x: number; y: number; z: number }>): void {
    const current = this._meshTransform();
    const updated: MeshTransformConfig = {
      ...current,
      position: { ...current.position, ...position },
    };
    this.updateTransform(updated);
  }

  /**
   * Update rotation values
   * @param rotation - Partial rotation values for x, y, z axes
   */
  updateRotation(rotation: Partial<{ x: number; y: number; z: number }>): void {
    const effectiveUnit = this._rotationUnit();
    const current = this._meshTransform();

    // Convert to radians if degrees are provided
    const convertedRotation: Partial<{ x: number; y: number; z: number }> = {};
    if (rotation.x !== undefined) {
      convertedRotation.x =
        effectiveUnit === 'degrees' ? this.degreesToRadians(rotation.x) : rotation.x;
    }
    if (rotation.y !== undefined) {
      convertedRotation.y =
        effectiveUnit === 'degrees' ? this.degreesToRadians(rotation.y) : rotation.y;
    }
    if (rotation.z !== undefined) {
      convertedRotation.z =
        effectiveUnit === 'degrees' ? this.degreesToRadians(rotation.z) : rotation.z;
    }

    const updated: MeshTransformConfig = {
      ...current,
      rotation: { ...current.rotation, ...convertedRotation },
    };
    this.updateTransform(updated);
  }

  /**
   * Converts degrees to radians
   */
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Apply cheap cropping to the loaded model
   * After successful cropping, export becomes available until crop box or transform changes
   */
  applyCrop(): CropResult {
    if (!this.engine) {
      return {
        success: false,
        trianglesRemoved: 0,
        trianglesKept: 0,
        meshesProcessed: 0,
      };
    }

    const result = this.engine.applyCheapCrop();
    this._lastCropResult.set(result);
    if (result.success) {
      this._cropIsValid.set(true);
    }
    return result;
  }

  /**
   * Export the current model to GLB format
   */
  async exportGlb(): Promise<ArrayBuffer> {
    if (!this.engine) {
      throw new Error('Viewport not initialized');
    }

    return this.engine.exportToGlb();
  }

  /**
   * Reset crop box to default/model-fitted values
   */
  resetCropBox(): void {
    if (this.engine) {
      const model = this.engine.getLoadedModel();
      if (model) {
        // Re-calculate based on model bounds
        // For now, just get current from engine
        const box = this.engine.getCropBox();
        this._cropBox.set(this.roundCropBox(box));
      } else {
        const roundedDefault = this.roundCropBox(DEFAULT_CROP_BOX);
        this._cropBox.set(roundedDefault);
        this.engine.updateCropBox(roundedDefault);
      }
    } else {
      this._cropBox.set(this.roundCropBox(DEFAULT_CROP_BOX));
    }
  }

  /**
   * Reset transform to identity
   */
  resetTransform(): void {
    this.updateTransform(DEFAULT_MESH_TRANSFORM);
  }

  /**
   * Round a numeric value to at most two decimal places
   */
  private roundNumber(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Round all fields of the crop box
   */
  private roundCropBox(box: CropBoxConfig): CropBoxConfig {
    return {
      minX: this.roundNumber(box.minX),
      maxX: this.roundNumber(box.maxX),
      minY: this.roundNumber(box.minY),
      maxY: this.roundNumber(box.maxY),
      minZ: this.roundNumber(box.minZ),
      maxZ: this.roundNumber(box.maxZ),
    };
  }

  /**
   * Round all numeric fields of the mesh transform
   */
  private roundTransform(transform: MeshTransformConfig): MeshTransformConfig {
    return {
      position: {
        x: this.roundNumber(transform.position.x),
        y: this.roundNumber(transform.position.y),
        z: this.roundNumber(transform.position.z),
      },
      rotation: {
        x: this.roundNumber(transform.rotation.x),
        y: this.roundNumber(transform.rotation.y),
        z: this.roundNumber(transform.rotation.z),
      },
    };
  }

  /**
   * Normalize hex color strings (fallback to default green)
   */
  private normalizeColor(color: string): string {
    if (typeof color !== 'string') return '#00ff00';
    const trimmed = color.trim();
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const isValid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
    return isValid ? hex : '#00ff00';
  }

  /**
   * Get the underlying engine (for advanced use cases)
   */
  getEngine(): ModelCropEngine | null {
    return this.engine;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }

    // Reset state
    this._loadingState.set('idle');
    this._loadingProgress.set(DEFAULT_LOADING_PROGRESS);
    this._errorMessage.set(null);
    this._cropBox.set(DEFAULT_CROP_BOX);
    this._meshTransform.set(DEFAULT_MESH_TRANSFORM);
    this._boxVisible.set(true);
    this._cropBoxColor.set('#00ff00');
    this._gridVisible.set(false);
    this._viewHelperVisible.set(false);
    this._sceneBackgroundColor.set('#2a2a2a');
    this._lastCropResult.set(null);
    this._cropIsValid.set(false);
  }
}
