# ng-three-model-cropper

Angular 17+ Three.js 3D Model Cropper Library with cheap geometry cropping.

[![npm version](https://img.shields.io/npm/v/ng-three-model-cropper.svg)](https://www.npmjs.com/package/ng-three-model-cropper)
[![npm downloads](https://img.shields.io/npm/dm/ng-three-model-cropper.svg)](https://www.npmjs.com/package/ng-three-model-cropper)
[![CI](https://github.com/AlexRynas/ng-three-model-cropper/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexRynas/ng-three-model-cropper/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/AlexRynas/ng-three-model-cropper/branch/main/graph/badge.svg)](https://codecov.io/gh/AlexRynas/ng-three-model-cropper)
[![License](https://img.shields.io/npm/l/ng-three-model-cropper.svg)](https://github.com/AlexRynas/ng-three-model-cropper/blob/main/LICENSE)
[![Angular](https://img.shields.io/badge/Angular-17--20-red.svg)](https://angular.io/)
[![Three.js](https://img.shields.io/badge/Three.js-0.150+-black.svg)](https://threejs.org/)

## Overview

A highly configurable, UI-agnostic 3D model cropper component for Angular applications. Load GLB/FBX models, define a crop box, apply "cheap" triangle-pruning cropping, and export the result as GLB.

### Key Features

- **Multi-format Support**: Load GLB, GLTF, and FBX 3D models
- **Cheap Cropping**: Triangle-pruning based cropping (no boolean CSG operations)
- **GLB Export**: Export cropped models as binary GLB files
- **Visual Helpers**: Configurable crop box color, grid helper, and view helper (axis indicator)
- **Angular 17-20 Compatible**: Built with Angular 17, works with apps 17-20
- **Zoneless Friendly**: Signal-based state management, no zone.js dependency
- **Highly Configurable**: Template customization, content projection, label overrides
- **UI Agnostic**: Works with MatDialog or any dialog/container system
- **Partial Ivy**: Published with partial compilation for broad compatibility

## Installation

```bash
npm install ng-three-model-cropper three
npm install -D @types/three
```

## Quick Start

```typescript
import { Component } from '@angular/core';
import { ModelCropperComponent, CropResult } from 'ng-three-model-cropper';

@Component({
  selector: 'app-model-editor',
  standalone: true,
  imports: [ModelCropperComponent],
  template: `
    <ntmc-model-cropper
      [srcUrl]="modelUrl"
      [downloadMode]="'download'"
      [filename]="'my-cropped-model.glb'"
      (cropApplied)="onCropApplied($event)"
      (fileReady)="onFileReady($event)"
      (loadError)="onLoadError($event)"
    />
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 600px;
      }
    `,
  ],
})
export class ModelEditorComponent {
  modelUrl = 'assets/models/sample.glb';

  onCropApplied(result: CropResult): void {
    console.log(`Removed ${result.trianglesRemoved} triangles`);
  }

  onFileReady(buffer: ArrayBuffer): void {
    // Handle the exported GLB ArrayBuffer (e.g., upload to server)
  }

  onLoadError(message: string): void {
    console.error('Failed to load model:', message);
  }
}
```

## Component API

### Inputs

| Input                 | Type                          | Default               | Description                             |
| --------------------- | ----------------------------- | --------------------- | --------------------------------------- |
| `srcUrl`              | `string`                      | **required**          | URL to the 3D model file (GLB/GLTF/FBX) |
| `initialCropBox`      | `CropBoxConfig`               | auto-calculated       | Initial crop box bounds                 |
| `initialTransform`    | `MeshTransformConfig`         | identity              | Initial position/rotation               |
| `downloadMode`        | `'download' \| 'emit'`        | `'download'`          | Export behavior                         |
| `filename`            | `string`                      | `'cropped-model.glb'` | Download filename                       |
| `cropBoxColor`        | `string`                      | `'#00ff00'`           | Hex color for crop box visualization    |
| `showGrid`            | `boolean`                     | `false`               | Show grid helper in the scene           |
| `showViewHelper`      | `boolean`                     | `false`               | Show view helper (axis indicator)       |
| `showLoadingOverlay`  | `boolean`                     | `true`                | Show the loading overlay with spinner   |
| `showErrorOverlay`    | `boolean`                     | `true`                | Show the error overlay                  |
| `showLoadingProgress` | `boolean`                     | `true`                | Show loading progress percentage        |
| `spinnerColor`        | `string`                      | `'#4caf50'`           | Hex color for the loading spinner       |
| `uiTemplate`          | `TemplateRef`                 | -                     | Custom UI template                      |
| `labelsConfig`        | `Partial<ModelCropperLabels>` | defaults              | UI label overrides                      |

### Outputs

| Output                  | Type              | Description                            |
| ----------------------- | ----------------- | -------------------------------------- |
| `cropApplied`           | `CropResult`      | Emitted after cropping with statistics |
| `fileReady`             | `ArrayBuffer`     | Emitted with GLB data (emit mode only) |
| `loadError`             | `string`          | Emitted when model loading fails       |
| `exportError`           | `string`          | Emitted when export fails              |
| `loadingProgressChange` | `LoadingProgress` | Emitted during model loading progress  |

## Custom UI Template

Override the default UI panel with your own template:

```typescript
@Component({
  template: `
    <ntmc-model-cropper [srcUrl]="modelUrl" [uiTemplate]="customUI">
      <ng-template #customUI let-ctx>
        <!-- ctx is ModelCropperUiContext -->
        <div class="my-custom-panel">
          <mat-slider
            [value]="ctx.cropBox.minX"
            (input)="ctx.setCropBoxValue('minX', $event.value)"
          />
          <button mat-raised-button (click)="ctx.applyCrop()">Crop Model</button>
          <button mat-button (click)="ctx.download()">Export</button>
        </div>
      </ng-template>
    </ntmc-model-cropper>
  `,
})
export class CustomUiComponent {}
```

### UI Context API (`ModelCropperUiContext`)

| Property/Method                       | Description                                          |
| ------------------------------------- | ---------------------------------------------------- |
| `cropBox`                             | Current crop box configuration                       |
| `meshTransform`                       | Current position/rotation values                     |
| `loadingState`                        | `'idle' \| 'loading' \| 'loaded' \| 'error'`         |
| `loadingProgress`                     | Detailed loading progress information                |
| `errorMessage`                        | Error message if any                                 |
| `boxVisible`                          | Crop box visibility state                            |
| `cropBoxColor`                        | Current crop box color (hex string)                  |
| `gridVisible`                         | Grid helper visibility state                         |
| `viewHelperVisible`                   | View helper visibility state                         |
| `canApplyCrop`                        | Whether cropping is available (model loaded)         |
| `canExport`                           | Whether export is available (crop applied and valid) |
| `setCropBox(box)`                     | Set entire crop box                                  |
| `setCropBoxValue(key, value)`         | Set single crop box value                            |
| `setMeshTransform(transform)`         | Set entire transform                                 |
| `setPosition(partial)`                | Update position values                               |
| `setRotation(partial)`                | Update rotation values                               |
| `toggleBoxVisibility(visible)`        | Show/hide crop box                                   |
| `setCropBoxColor(color)`              | Set crop box color (hex string)                      |
| `toggleGridVisibility(visible)`       | Show/hide grid helper                                |
| `toggleViewHelperVisibility(visible)` | Show/hide view helper                                |
| `applyCrop()`                         | Execute cropping                                     |
| `download()`                          | Trigger export                                       |
| `resetCropBox()`                      | Reset crop box to defaults                           |
| `resetTransform()`                    | Reset transform to identity                          |

## Using with MatDialog

```typescript
import { MatDialog } from '@angular/material/dialog';
import { ModelCropperComponent } from 'ng-three-model-cropper';

@Component({...})
export class AppComponent {
  constructor(private dialog: MatDialog) {}

  openCropper(): void {
    const dialogRef = this.dialog.open(ModelCropperDialogComponent, {
      width: '90vw',
      height: '80vh',
      data: { modelUrl: 'assets/model.glb' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.fileBuffer) {
        // Handle exported GLB
      }
    });
  }
}

@Component({
  standalone: true,
  imports: [ModelCropperComponent, MatDialogModule],
  template: `
    <mat-dialog-content>
      <ntmc-model-cropper
        [srcUrl]="data.modelUrl"
        [downloadMode]="'emit'"
        (fileReady)="onFileReady($event)"
        (cropApplied)="onCropApplied($event)"
      />
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-button [mat-dialog-close]="result">Save</button>
    </mat-dialog-actions>
  `
})
export class ModelCropperDialogComponent {
  result: { fileBuffer?: ArrayBuffer; cropResult?: CropResult } = {};

  constructor(@Inject(MAT_DIALOG_DATA) public data: { modelUrl: string }) {}

  onFileReady(buffer: ArrayBuffer): void {
    this.result.fileBuffer = buffer;
  }

  onCropApplied(cropResult: CropResult): void {
    this.result.cropResult = cropResult;
  }
}
```

## Types

```typescript
interface CropBoxConfig {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

interface MeshTransformConfig {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

interface CropResult {
  success: boolean;
  trianglesRemoved: number;
  trianglesKept: number;
  meshesProcessed: number;
}

interface LoadingProgress {
  state: LoadingState;
  percentage: number;
  loaded: number;
  total: number;
  message: string;
}

type DownloadMode = 'download' | 'emit';
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';
```

## Architecture

The library is organized for multi-version compatibility:

```text
src/lib/
├── core/                 # Framework-agnostic (Three.js only)
│   ├── types.ts          # Interfaces and type definitions
│   ├── ui-context.ts     # UI context interface
│   ├── model-crop-engine.ts  # Main Three.js engine
│   └── cheap-cropper.ts  # Triangle-pruning cropper
└── ng/                   # Angular 17 adapter
    ├── model-cropper.service.ts   # Angular service wrapper
    └── model-cropper.component.ts # Standalone component
```

## Testing

The library includes a comprehensive test suite covering all modules. Code coverage is tracked via [Codecov](https://codecov.io/gh/AlexRynas/ng-three-model-cropper).

### Running Tests

```bash
# Run library tests (headless, single run)
npm run test:lib

# Run library tests (watch mode for development)
npm run test:lib:watch

# Run demo app tests
npm test
```

### Future Angular Versions

The `core/` folder is framework-agnostic. To support Angular 19/20+:

1. Create a new branch (e.g., `angular-20`)
2. Update workspace to Angular 20
3. Create `ng/adapter-angular20/` with updated components
4. Publish as `ng-three-model-cropper@2.x` with updated peer dependencies

## Build & Publish

```bash
# Build library
ng build model-cropper --configuration production

# Publish to npm
cd dist/model-cropper
npm publish
```

## Requirements

- Angular 17-20
- Three.js >= 0.150.0
- TypeScript 5.x

## License

Apache License 2.0
