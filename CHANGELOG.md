# Changelog

All notable changes to this project will be documented in this file.

## [1.5.2] - 2025-12-15

### Fixed

- **ViewHelper compatibility with Three.js r166+**: Axis labels (X, Y, Z) are now properly displayed when using Three.js version 166 or higher
  - Three.js r166 introduced a breaking change requiring explicit `setLabels()` call
  - Added runtime check for backward compatibility with older Three.js versions
- **FBX file loading with incorrect MIME types**: Fixed model loading failing when servers return unreliable MIME types like `text/plain` or `application/octet-stream`
  - Added magic byte detection to identify file formats (GLB, FBX, GLTF) from content
  - `inferFileType` now checks file headers when MIME type is unreliable
- **Crop box calculation for offset models**: Fixed crop box not aligning with model geometry when the model is positioned above the world origin (e.g., standing on the ground plane)
  - Crop box now correctly wraps around the model's actual bounding box instead of assuming the model is centered at origin
  - Model position is no longer automatically modified; only the crop box position and dimensions are calculated
  - Camera now orbits around the model's actual center for better viewing experience

## [1.5.1] - 2025-12-12

### Fixed

- Removed unused `LoadingProgress` import from `model-cropper.service.spec.ts`

## [1.5.0] - 2025-12-12

### Added

- **Loading Progress Tracking**: New `LoadingProgress` interface for detailed progress information
  - `percentage`: Loading progress (0-100)
  - `loaded`: Bytes loaded
  - `total`: Total bytes to load
  - `message`: Human-readable status message
- **`loadingProgressChange` output**: Emits `LoadingProgress` updates during model loading
- **`showLoadingOverlay` input**: Control visibility of the loading overlay (default: `true`)
- **`showErrorOverlay` input**: Control visibility of the error overlay (default: `true`)
- **`showLoadingProgress` input**: Toggle loading percentage display (default: `true`)
- **`spinnerColor` input**: Customize spinner color in the default UI (default: `'#4caf50'`)
- **Progress bar UI**: Visual progress bar during model loading with configurable color
- Added `loadingProgress` to `ModelCropperUiContext` for custom templates
- Added `loadingProgress` signal to `ModelCropperService`

### Changed

- Loading overlay now shows percentage and progress bar when `showLoadingProgress` is enabled
- Spinner color can now be customized via `spinnerColor` input
- Users can now hide the default loading/error overlays to implement their own UI

## [1.4.0] - 2025-12-12

### Changed

- **Breaking Change**: `canExport` now requires a crop to be applied before export is available
  - Previously, export was available as soon as a model was loaded
  - Now, export is only available after `applyCrop()` is called
  - Changing crop box parameters or mesh transformation invalidates the crop, requiring re-application before export
- Added `cropIsValid` signal to `ModelCropperService` to track crop validity state
- Updated documentation to reflect new `canExport` behavior

### Fixed

- Export functionality now properly reflects the state of the cropped model

## [1.3.2] - 2025-12-12

### Fixed

- Refactored `ModelCropperComponent` lifecycle to use `ngOnInit()` instead of constructor for initialization
- Reorganized test structure to properly separate "Component Creation" and "Lifecycle Hooks" test suites in `model-cropper.component.spec.ts`

### Changed

- Demo app now showcases `showGrid`, `showViewHelper`, and `cropBoxColor` inputs
- Added `exportError` event handler to demo app for better error handling examples

## [1.3.1] - 2025-12-12

### Fixed

- Resolved ESLint errors causing CI build failures:
  - Removed unused imports across test files
  - Removed trivially inferred type annotations
  - Fixed unused variables in catch blocks and test setup
  - Fixed Prettier formatting issues

## [1.3.0] - 2024-12-12

### Added

- Comprehensive unit test suite with 241 tests covering:
  - Core types and utility functions (`types.spec.ts`)
  - CheapCropper triangle pruning logic (`cheap-cropper.spec.ts`)
  - UI context and labels (`ui-context.spec.ts`)
  - ModelCropEngine Three.js service (`model-crop-engine.spec.ts`)
  - ModelCropperService Angular adapter (`model-cropper.service.spec.ts`)
  - ModelCropperComponent Angular component (`model-cropper.component.spec.ts`)
- Test runner npm scripts: `test:lib` and `test:lib:watch`

## [1.2.0] - 2024-12-11

### Added

- Crop box color customization via `cropBoxColor` input
- Grid helper visibility toggle via `showGrid` input
- View helper (axis indicator) via `showViewHelper` input

## [1.1.0] - 2024-12-11

### Added

- Support for various model source types
- Enhanced model loading capabilities

## [1.0.0] - 2024-12-11

### Added

- Initial release
- GLB/GLTF/FBX model loading
- Cheap triangle-pruning cropping
- GLB export functionality
- Customizable UI template system
- Angular 17-20 compatibility
- Signal-based state management
