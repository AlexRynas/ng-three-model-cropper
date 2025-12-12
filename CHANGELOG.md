# Changelog

All notable changes to this project will be documented in this file.

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
