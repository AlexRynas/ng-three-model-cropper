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
  CropResult,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
} from '../core/types';
import { ModelCropEngine } from '../core/model-crop-engine';

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
  private readonly _errorMessage: WritableSignal<string | null> = signal(null);
  private readonly _cropBox: WritableSignal<CropBoxConfig> = signal(DEFAULT_CROP_BOX);
  private readonly _meshTransform: WritableSignal<MeshTransformConfig> =
    signal(DEFAULT_MESH_TRANSFORM);
  private readonly _boxVisible: WritableSignal<boolean> = signal(true);
  private readonly _lastCropResult: WritableSignal<CropResult | null> = signal(null);

  /**
   * Set initial values (must be called before initViewport)
   */
  setInitialValues(cropBox?: CropBoxConfig, transform?: MeshTransformConfig): void {
    if (cropBox) {
      this._cropBox.set(this.roundCropBox(cropBox));
    }
    if (transform) {
      this._meshTransform.set(this.roundTransform(transform));
    }
  }

  // Public readonly signals
  readonly loadingState: Signal<LoadingState> = this._loadingState.asReadonly();
  readonly errorMessage: Signal<string | null> = this._errorMessage.asReadonly();
  readonly cropBox: Signal<CropBoxConfig> = this._cropBox.asReadonly();
  readonly meshTransform: Signal<MeshTransformConfig> = this._meshTransform.asReadonly();
  readonly boxVisible: Signal<boolean> = this._boxVisible.asReadonly();
  readonly lastCropResult: Signal<CropResult | null> = this._lastCropResult.asReadonly();

  // Computed signals
  readonly isLoading: Signal<boolean> = computed(() => this._loadingState() === 'loading');
  readonly isLoaded: Signal<boolean> = computed(() => this._loadingState() === 'loaded');
  readonly hasError: Signal<boolean> = computed(() => this._loadingState() === 'error');
  readonly canApplyCrop: Signal<boolean> = computed(() => this._loadingState() === 'loaded');
  readonly canExport: Signal<boolean> = computed(() => this._loadingState() === 'loaded');

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
      onLoadingStateChange: (state: LoadingState) => this._loadingState.set(state),
      onError: (message: string) => this._errorMessage.set(message),
    });
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
   */
  updateCropBox(box: CropBoxConfig): void {
    const rounded = this.roundCropBox(box);
    this._cropBox.set(rounded);
    this.engine?.updateCropBox(rounded);
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
   * Update mesh transformation
   */
  updateTransform(transform: MeshTransformConfig): void {
    const rounded = this.roundTransform(transform);
    this._meshTransform.set(rounded);
    this.engine?.setMeshTransform(rounded);
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
   */
  updateRotation(rotation: Partial<{ x: number; y: number; z: number }>): void {
    const current = this._meshTransform();
    const updated: MeshTransformConfig = {
      ...current,
      rotation: { ...current.rotation, ...rotation },
    };
    this.updateTransform(updated);
  }

  /**
   * Apply cheap cropping to the loaded model
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
    this._errorMessage.set(null);
    this._cropBox.set(DEFAULT_CROP_BOX);
    this._meshTransform.set(DEFAULT_MESH_TRANSFORM);
    this._boxVisible.set(true);
    this._lastCropResult.set(null);
  }
}
