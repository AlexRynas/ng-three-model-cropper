/**
 * UI Context interface for template-based customization
 * This provides the host application with access to the cropper's state and actions
 */

import {
  CropBoxConfig,
  MeshTransformConfig,
  LoadingState,
  LoadingProgress,
  Vec3,
  AngleUnit,
} from './types';

/**
 * Context object passed to custom UI templates
 * Contains readonly state values and action methods
 */
export interface ModelCropperUiContext {
  // State (readonly)
  readonly cropBox: CropBoxConfig;
  /** Unit used by setRotation and meshTransformUi rotation values */
  readonly rotationUnit: AngleUnit;
  readonly meshTransform: MeshTransformConfig;
  /**
   * UI-friendly transform values.
   * - position is identical to meshTransform.position
   * - rotation is expressed in rotationUnit (degrees/radians) and rounded for stable numeric inputs
   */
  readonly meshTransformUi: MeshTransformConfig;
  readonly loadingState: LoadingState;
  /** Detailed loading progress information */
  readonly loadingProgress: LoadingProgress;
  readonly errorMessage: string | null;
  readonly boxVisible: boolean;
  readonly cropBoxColor: string;
  readonly gridVisible: boolean;
  readonly viewHelperVisible: boolean;
  /** Whether a crop can be applied (model is loaded) */
  readonly canApplyCrop: boolean;
  /**
   * Whether export is available.
   * Export is only available after a crop has been applied.
   * Changing crop box parameters or mesh transformation invalidates the crop,
   * requiring re-application before export is available again.
   */
  readonly canExport: boolean;

  // Actions
  setCropBox(box: CropBoxConfig): void;
  setCropBoxValue(key: keyof CropBoxConfig, value: number): void;
  setMeshTransform(transform: MeshTransformConfig): void;
  setPosition(position: Partial<Vec3>): void;
  setRotation(rotation: Partial<Vec3>): void;
  toggleBoxVisibility(visible: boolean): void;
  setCropBoxColor(color: string): void;
  toggleGridVisibility(visible: boolean): void;
  toggleViewHelperVisibility(visible: boolean): void;
  applyCrop(): void;
  download(): void;
  resetCropBox(): void;
  resetTransform(): void;
}

/**
 * Label configuration for the cropper component
 */
export interface ModelCropperLabels {
  readonly applyCropLabel?: string;
  readonly downloadLabel?: string;
  readonly resetLabel?: string;
  readonly cropBoxTitle?: string;
  readonly transformTitle?: string;
  readonly positionLabel?: string;
  readonly rotationLabel?: string;
  readonly boxVisibleLabel?: string;
  readonly minXLabel?: string;
  readonly maxXLabel?: string;
  readonly minYLabel?: string;
  readonly maxYLabel?: string;
  readonly minZLabel?: string;
  readonly maxZLabel?: string;
  readonly loadingLabel?: string;
  readonly errorLabel?: string;
  readonly boxColorLabel?: string;
  readonly gridVisibleLabel?: string;
  readonly viewHelperVisibleLabel?: string;
}

/**
 * Default labels for the UI
 */
export const DEFAULT_LABELS: Required<ModelCropperLabels> = {
  applyCropLabel: 'Apply Crop',
  downloadLabel: 'Download GLB',
  resetLabel: 'Reset',
  cropBoxTitle: 'Crop Box',
  transformTitle: 'Transform',
  positionLabel: 'Position',
  rotationLabel: 'Rotation',
  boxVisibleLabel: 'Show Crop Box',
  minXLabel: 'Min X',
  maxXLabel: 'Max X',
  minYLabel: 'Min Y',
  maxYLabel: 'Max Y',
  minZLabel: 'Min Z',
  maxZLabel: 'Max Z',
  loadingLabel: 'Loading model...',
  errorLabel: 'Error loading model',
  boxColorLabel: 'Crop Box Color',
  gridVisibleLabel: 'Show Grid',
  viewHelperVisibleLabel: 'Show View Helper',
};
