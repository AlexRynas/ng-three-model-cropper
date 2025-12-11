# ng-three-model-cropper

Angular 17+ Three.js 3D Model Cropper Library with cheap geometry cropping.

## Features

- **GLB/FBX Input**: Load 3D models in GLB, GLTF, or FBX format
- **Cheap Cropping**: Triangle-pruning based cropping (no boolean CSG)
- **GLB Export**: Export cropped models as GLB files
- **Visual Helpers**: Configurable crop box color, grid helper, and view helper (axis indicator)
- **Angular 17-20 Compatible**: Built with Angular 17, usable in Angular 17-20 apps
- **Zoneless Friendly**: Signal-based state management
- **Highly Configurable**: Template customization and label overrides
- **UI Agnostic**: Works with MatDialog or any dialog system

## Installation

```bash
npm install ng-three-model-cropper three
npm install -D @types/three
```

## Usage

```typescript
import { ModelCropperComponent } from 'ng-three-model-cropper';

@Component({
  standalone: true,
  imports: [ModelCropperComponent],
  template: \`
    <ntmc-model-cropper
      [srcUrl]="modelUrl"
      [downloadMode]="'download'"
      [cropBoxColor]="'#ff0000'"
      [showGrid]="true"
      [showViewHelper]="true"
      (cropApplied)="onCropApplied($event)"
      (fileReady)="onFileReady($event)"
    />
  \`
})
export class MyComponent {
  modelUrl = 'assets/model.glb';
  
  onCropApplied(result: CropResult) {
    console.log('Crop applied:', result);
  }
  
  onFileReady(buffer: ArrayBuffer) {
    // Handle exported GLB
  }
}
```

## API

See the main README for complete API documentation.

## Build

```bash
ng build model-cropper --configuration production
```

## Publishing

```bash
cd dist/model-cropper
npm publish
```
