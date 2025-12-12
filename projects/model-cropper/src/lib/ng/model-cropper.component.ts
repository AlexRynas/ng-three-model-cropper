/**
 * ModelCropperComponent - Main Angular component for 3D model cropping
 *
 * A standalone Angular 17+ component that provides a 3D viewport for
 * loading, transforming, cropping, and exporting GLB/FBX models.
 *
 * Features:
 * - Signal-based state management (zoneless-friendly)
 * - Template customization via uiTemplate input
 * - Configurable labels and download modes
 * - Content projection support
 */

import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy,
  TemplateRef,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  Signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  CropBoxConfig,
  MeshTransformConfig,
  DownloadMode,
  CropResult,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
} from '../core/types';
import { ModelCropperUiContext, ModelCropperLabels, DEFAULT_LABELS } from '../core/ui-context';
import { ModelCropperService } from './model-cropper.service';

/**
 * Main model cropper component
 * Use inside MatDialog or any other dialog system
 */
@Component({
  selector: 'ntmc-model-cropper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [ModelCropperService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './model-cropper.component.html',
  styleUrls: ['./model-cropper.component.scss'],
})
export class ModelCropperComponent implements OnInit, AfterViewInit, OnDestroy {
  // ViewChild for viewport element
  @ViewChild('viewport', { static: true })
  private viewportRef!: ElementRef<HTMLDivElement>;

  // Inputs using signal-based input()
  readonly srcUrl = input.required<string>();
  readonly initialCropBox = input<CropBoxConfig>(DEFAULT_CROP_BOX);
  readonly initialTransform = input<MeshTransformConfig>(DEFAULT_MESH_TRANSFORM);
  readonly downloadMode = input<DownloadMode>('download');
  readonly filename = input<string>('cropped-model.glb');
  readonly uiTemplate = input<TemplateRef<{ $implicit: ModelCropperUiContext }>>();
  readonly labelsConfig = input<Partial<ModelCropperLabels>>({});
  readonly cropBoxColor = input<string>('#00ff00');
  readonly showGrid = input<boolean>(false);
  readonly showViewHelper = input<boolean>(false);

  // Outputs using signal-based output()
  readonly cropApplied = output<CropResult>();
  readonly fileReady = output<ArrayBuffer>();
  readonly loadError = output<string>();
  readonly exportError = output<string>();

  // Merged labels computed signal
  readonly labels: Signal<Required<ModelCropperLabels>> = computed(() => ({
    ...DEFAULT_LABELS,
    ...this.labelsConfig(),
  }));

  // UI Context for template customization
  readonly uiContext: Signal<ModelCropperUiContext> = computed(() => ({
    cropBox: this.service.cropBox(),
    meshTransform: this.service.meshTransform(),
    loadingState: this.service.loadingState(),
    errorMessage: this.service.errorMessage(),
    boxVisible: this.service.boxVisible(),
    cropBoxColor: this.service.cropBoxColor(),
    gridVisible: this.service.gridVisible(),
    viewHelperVisible: this.service.viewHelperVisible(),
    canApplyCrop: this.service.canApplyCrop(),
    canExport: this.service.canExport(),
    setCropBox: (box: CropBoxConfig) => this.service.updateCropBox(box),
    setCropBoxValue: (key: keyof CropBoxConfig, value: number) =>
      this.service.updateCropBoxValue(key, value),
    setMeshTransform: (transform: MeshTransformConfig) => this.service.updateTransform(transform),
    setPosition: (position) => this.service.updatePosition(position),
    setRotation: (rotation) => this.service.updateRotation(rotation),
    toggleBoxVisibility: (visible: boolean) => this.service.toggleBoxVisibility(visible),
    setCropBoxColor: (color: string) => this.service.setCropBoxColor(color),
    toggleGridVisibility: (visible: boolean) => this.service.toggleGridVisibility(visible),
    toggleViewHelperVisibility: (visible: boolean) =>
      this.service.toggleViewHelperVisibility(visible),
    applyCrop: () => this.onApplyCrop(),
    download: () => this.onDownload(),
    resetCropBox: () => this.service.resetCropBox(),
    resetTransform: () => this.service.resetTransform(),
  }));

  readonly service = inject(ModelCropperService);

  ngOnInit(): void {
    // Set initial values from inputs
    const initialBox = this.initialCropBox();
    const initialTrans = this.initialTransform();
    this.service.setInitialValues(initialBox, initialTrans, {
      cropBoxColor: this.cropBoxColor(),
      showGrid: this.showGrid(),
      showViewHelper: this.showViewHelper(),
    });
  }

  ngAfterViewInit(): void {
    // Initialize viewport
    this.service.initViewport(this.viewportRef.nativeElement);

    // Load model
    this.loadModelFromUrl();
  }

  private async loadModelFromUrl(): Promise<void> {
    const url = this.srcUrl();
    if (!url) return;

    try {
      await this.service.loadModel(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.loadError.emit(message);
    }
  }

  ngOnDestroy(): void {
    this.service.dispose();
  }

  // Event handlers for default UI
  onBoxVisibilityChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.service.toggleBoxVisibility(checked);
  }

  onGridVisibilityChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.service.toggleGridVisibility(checked);
  }

  onViewHelperVisibilityChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.service.toggleViewHelperVisibility(checked);
  }

  onCropBoxColorChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.service.setCropBoxColor(value);
  }

  onCropBoxChange(key: keyof CropBoxConfig, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value)) {
      this.service.updateCropBoxValue(key, value);
    }
  }

  onPositionChange(axis: 'x' | 'y' | 'z', event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value)) {
      this.service.updatePosition({ [axis]: value });
    }
  }

  onRotationChange(axis: 'x' | 'y' | 'z', event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value)) {
      this.service.updateRotation({ [axis]: value });
    }
  }

  onApplyCrop(): void {
    const result = this.service.applyCrop();
    this.cropApplied.emit(result);
  }

  async onDownload(): Promise<void> {
    try {
      const arrayBuffer = await this.service.exportGlb();

      if (this.downloadMode() === 'download') {
        this.triggerDownload(arrayBuffer);
      } else {
        this.fileReady.emit(arrayBuffer);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      this.exportError.emit(message);
    }
  }

  private triggerDownload(arrayBuffer: ArrayBuffer): void {
    const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.filename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
