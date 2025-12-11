/**
 * UI Context interface for template-based customization
 * This provides the host application with access to the cropper's state and actions
 */

import { CropBoxConfig, MeshTransformConfig, LoadingState, Vec3 } from './types';

/**
 * Context object passed to custom UI templates
 * Contains readonly state values and action methods
 */
export interface ModelCropperUiContext {
  // State (readonly)
  readonly cropBox: CropBoxConfig;
  readonly meshTransform: MeshTransformConfig;
  readonly loadingState: LoadingState;
  readonly errorMessage: string | null;
  readonly boxVisible: boolean;
  readonly canApplyCrop: boolean;
  readonly canExport: boolean;

  // Actions
  setCropBox(box: CropBoxConfig): void;
  setCropBoxValue(key: keyof CropBoxConfig, value: number): void;
  setMeshTransform(transform: MeshTransformConfig): void;
  setPosition(position: Partial<Vec3>): void;
  setRotation(rotation: Partial<Vec3>): void;
  toggleBoxVisibility(visible: boolean): void;
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
};
