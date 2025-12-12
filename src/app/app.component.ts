import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelCropperComponent, CropResult } from 'ng-three-model-cropper';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ModelCropperComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Model Cropper Demo';
  modelUrl = ''; // Add your model URL here
  showCropper = false;

  loadModel(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.modelUrl = URL.createObjectURL(file);
      this.showCropper = true;
    }
  }

  onCropApplied(result: CropResult) {
    console.log('Crop applied:', result);
    console.log('Triangles removed:', result.trianglesRemoved);
    console.log('Triangles kept:', result.trianglesKept);
    console.log('Meshes processed:', result.meshesProcessed);
  }

  onFileReady(arrayBuffer: ArrayBuffer) {
    console.log('File ready for download:', arrayBuffer);
    console.log('File size:', arrayBuffer.byteLength, 'bytes');
  }

  onLoadError(error: any) {
    console.error('Model load error:', error);
    alert('Failed to load model: ' + error.message);
  }

  onExportError(error: any) {
    console.error('Model export error:', error);
    alert('Failed to export model: ' + error.message);
  }
}
