# Changelog

All notable changes to this project will be documented in this file.

## [1.6.1] - 2025-12-17

### Fixed (1.6.1)

- **Stable rotation numeric inputs when using degrees**: Added UI-friendly rotation values to the template context so native number steppers (and custom arrow controls) no longer exhibit “jumping” behavior caused by repeated degrees↔radians conversions.
  - `ModelCropperUiContext` now exposes `rotationUnit` and `meshTransformUi` (rotation expressed in `rotationUnit` and rounded for display).
  - Default UI now binds rotation inputs to `meshTransformUi.rotation`.
  - Custom UIs can bind to `ctx.meshTransformUi.rotation` and call `ctx.setRotation(...)` without implementing a custom display-value helper.

## [1.6.0] - 2025-12-17

### Added (1.6.0)

- **Rotation Angle Unit Support**: Added support for specifying the unit of rotation values (radians or degrees) passed to the UI context's `setRotation` function.
  - New `AngleUnit` type: `'radians' | 'degrees'`.
  - New `rotationUnit` input on the component to control the unit for rotation values.
  - The `setRotation` function continues to accept only a single argument (the rotation value). To specify the unit (radians or degrees), use the `rotationUnit` input.
- **Scene Background Color**: Added `sceneBackgroundColor` input to control the 3D scene background color. Accepts any CSS color string (hex, rgb/rgba, named colors) and supports transparency (alpha).

### Changed (1.6.0)

- **Breaking**: If you pass degrees to `setRotation`, you must now set the `rotationUnit` input to `'degrees'`. The default remains radians for backward compatibility.

## [1.5.3] - 2025-12-16

### Fixed (1.5.3)

- **Intermittent Vite import resolution error during demo development**: Reduced occurrences of `[vite] Pre-transform error: Failed to resolve import "ng-three-model-cropper"` by switching the demo app's development build to resolve the library from source instead of the `dist/` output.

### Added (1.5.3)

- `npm run dev:dist` for optional validation against the built `dist/model-cropper` package output.
- Dev helper script `scripts/wait-for-lib-dist.mjs` to wait for library build artifacts before starting a dist-based dev session.

### Changed (1.5.3)

- `npm run dev` now starts the demo app using the development tsconfig that maps `ng-three-model-cropper` to `projects/model-cropper/src/public-api.ts`.

## [1.5.2] - 2025-12-15

### Fixed (1.5.2)

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

### Fixed (1.5.1)

- Removed unused `LoadingProgress` import from `model-cropper.service.spec.ts`

## [1.5.0] - 2025-12-12

### Added (1.5.0)

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

### Changed (1.5.0)

- Loading overlay now shows percentage and progress bar when `showLoadingProgress` is enabled
- Spinner color can now be customized via `spinnerColor` input
- Users can now hide the default loading/error overlays to implement their own UI

## [1.4.0] - 2025-12-12

### Changed (1.4.0)

- **Breaking Change**: `canExport` now requires a crop to be applied before export is available
  - Previously, export was available as soon as a model was loaded
  - Now, export is only available after `applyCrop()` is called
  - Changing crop box parameters or mesh transformation invalidates the crop, requiring re-application before export
- Added `cropIsValid` signal to `ModelCropperService` to track crop validity state
- Updated documentation to reflect new `canExport` behavior

### Fixed (1.4.0)

- Export functionality now properly reflects the state of the cropped model

## [1.3.2] - 2025-12-12

### Fixed (1.3.2)

- Refactored `ModelCropperComponent` lifecycle to use `ngOnInit()` instead of constructor for initialization
- Reorganized test structure to properly separate "Component Creation" and "Lifecycle Hooks" test suites in `model-cropper.component.spec.ts`

### Changed (1.3.2)

- Demo app now showcases `showGrid`, `showViewHelper`, and `cropBoxColor` inputs
- Added `exportError` event handler to demo app for better error handling examples

## [1.3.1] - 2025-12-12

### Fixed (1.3.1)

- Resolved ESLint errors causing CI build failures:
  - Removed unused imports across test files
  - Removed trivially inferred type annotations
  - Fixed unused variables in catch blocks and test setup
  - Fixed Prettier formatting issues

## [1.3.0] - 2024-12-12

### Added (1.3.0)

- Comprehensive unit test suite with 241 tests covering:
  - Core types and utility functions (`types.spec.ts`)
  - CheapCropper triangle pruning logic (`cheap-cropper.spec.ts`)
  - UI context and labels (`ui-context.spec.ts`)
  - ModelCropEngine Three.js service (`model-crop-engine.spec.ts`)
  - ModelCropperService Angular adapter (`model-cropper.service.spec.ts`)
  - ModelCropperComponent Angular component (`model-cropper.component.spec.ts`)
- Test runner npm scripts: `test:lib` and `test:lib:watch`

## [1.2.0] - 2024-12-11

### Added (1.2.0)

- Crop box color customization via `cropBoxColor` input
- Grid helper visibility toggle via `showGrid` input
- View helper (axis indicator) via `showViewHelper` input

## [1.1.0] - 2024-12-11

### Added (1.1.0)

- Support for various model source types
- Enhanced model loading capabilities

## [1.0.0] - 2024-12-11

### Added (1.0.0)

- Initial release
- GLB/GLTF/FBX model loading
- Cheap triangle-pruning cropping
- GLB export functionality
- Customizable UI template system
- Angular 17-20 compatibility
- Signal-based state management
