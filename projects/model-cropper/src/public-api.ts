/**
 * ng-three-model-cropper
 * Public API Surface
 *
 * Angular 17+ Three.js 3D Model Cropper Library
 * GLB/FBX input with cheap geometry cropping, GLB output
 */

// Core types and utilities (framework-agnostic)
export {
  CropBoxConfig,
  MeshTransformConfig,
  DownloadMode,
  LoadingState,
  LoadingProgress,
  ModelFileType,
  CropResult,
  Vec3,
  ModelCropEngineConfig,
  AngleUnit,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
  updateCropBox,
  updateMeshTransform,
  getModelFileType,
  isPointInCropBox,
} from './lib/core/types';

export { ModelCropperUiContext, ModelCropperLabels, DEFAULT_LABELS } from './lib/core/ui-context';

export { ModelCropEngine, StateChangeCallback } from './lib/core/model-crop-engine';

export { CheapCropper, CheapCropOptions, TriangleTestStrategy } from './lib/core/cheap-cropper';

// Angular adapter (Angular 17+ components and services)
export { ModelCropperService } from './lib/ng/model-cropper.service';
export { ModelCropperComponent } from './lib/ng/model-cropper.component';
