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
  OnDestroy,
  TemplateRef,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  effect,
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
  template: `
    <div class="ntmc-container">
      <!-- Left: 3D Viewport -->
      <div class="ntmc-viewport-container">
        <div #viewport class="ntmc-viewport"></div>

        <!-- Loading overlay -->
        @if (service.isLoading()) {
          <div class="ntmc-loading-overlay">
            <div class="ntmc-spinner"></div>
            <span>{{ labels().loadingLabel }}</span>
          </div>
        }

        <!-- Error overlay -->
        @if (service.hasError()) {
          <div class="ntmc-error-overlay">
            <span class="ntmc-error-icon">⚠️</span>
            <span>{{ labels().errorLabel }}: {{ service.errorMessage() }}</span>
          </div>
        }
      </div>

      <!-- Right: UI Panel -->
      <div class="ntmc-ui-panel">
        @if (uiTemplate()) {
          <!-- Custom template -->
          <ng-container
            [ngTemplateOutlet]="uiTemplate()!"
            [ngTemplateOutletContext]="{ $implicit: uiContext() }"
          ></ng-container>
        } @else {
          <!-- Default UI -->
          <div class="ntmc-default-ui">
            <!-- Crop Box Section -->
            <section class="ntmc-section">
              <h3>{{ labels().cropBoxTitle }}</h3>

              <div class="ntmc-checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    [checked]="service.boxVisible()"
                    (change)="onBoxVisibilityChange($event)"
                  />
                  {{ labels().boxVisibleLabel }}
                </label>
              </div>

              <div class="ntmc-input-grid">
                <div class="ntmc-input-row">
                  <label for="ntmc-minX">{{ labels().minXLabel }}</label>
                  <input
                    id="ntmc-minX"
                    type="number"
                    step="0.1"
                    [value]="service.cropBox().minX"
                    (input)="onCropBoxChange('minX', $event)"
                  />
                </div>
                <div class="ntmc-input-row">
                  <label for="ntmc-maxX">{{ labels().maxXLabel }}</label>
                  <input
                    id="ntmc-maxX"
                    type="number"
                    step="0.1"
                    [value]="service.cropBox().maxX"
                    (input)="onCropBoxChange('maxX', $event)"
                  />
                </div>
                <div class="ntmc-input-row">
                  <label for="ntmc-minY">{{ labels().minYLabel }}</label>
                  <input
                    id="ntmc-minY"
                    type="number"
                    step="0.1"
                    [value]="service.cropBox().minY"
                    (input)="onCropBoxChange('minY', $event)"
                  />
                </div>
                <div class="ntmc-input-row">
                  <label for="ntmc-maxY">{{ labels().maxYLabel }}</label>
                  <input
                    id="ntmc-maxY"
                    type="number"
                    step="0.1"
                    [value]="service.cropBox().maxY"
                    (input)="onCropBoxChange('maxY', $event)"
                  />
                </div>
                <div class="ntmc-input-row">
                  <label for="ntmc-minZ">{{ labels().minZLabel }}</label>
                  <input
                    id="ntmc-minZ"
                    type="number"
                    step="0.1"
                    [value]="service.cropBox().minZ"
                    (input)="onCropBoxChange('minZ', $event)"
                  />
                </div>
                <div class="ntmc-input-row">
                  <label for="ntmc-maxZ">{{ labels().maxZLabel }}</label>
                  <input
                    id="ntmc-maxZ"
                    type="number"
                    step="0.1"
                    [value]="service.cropBox().maxZ"
                    (input)="onCropBoxChange('maxZ', $event)"
                  />
                </div>
              </div>
            </section>

            <!-- Transform Section -->
            <section class="ntmc-section">
              <h3>{{ labels().transformTitle }}</h3>

              <!-- Position -->
              <div class="ntmc-subsection">
                <h4>{{ labels().positionLabel }}</h4>
                <div class="ntmc-input-grid ntmc-input-grid-3">
                  <div class="ntmc-input-row">
                    <label for="ntmc-posX">X</label>
                    <input
                      id="ntmc-posX"
                      type="number"
                      step="0.1"
                      [value]="service.meshTransform().position.x"
                      (input)="onPositionChange('x', $event)"
                    />
                  </div>
                  <div class="ntmc-input-row">
                    <label for="ntmc-posY">Y</label>
                    <input
                      id="ntmc-posY"
                      type="number"
                      step="0.1"
                      [value]="service.meshTransform().position.y"
                      (input)="onPositionChange('y', $event)"
                    />
                  </div>
                  <div class="ntmc-input-row">
                    <label for="ntmc-posZ">Z</label>
                    <input
                      id="ntmc-posZ"
                      type="number"
                      step="0.1"
                      [value]="service.meshTransform().position.z"
                      (input)="onPositionChange('z', $event)"
                    />
                  </div>
                </div>
              </div>

              <!-- Rotation -->
              <div class="ntmc-subsection">
                <h4>{{ labels().rotationLabel }}</h4>
                <div class="ntmc-input-grid ntmc-input-grid-3">
                  <div class="ntmc-input-row">
                    <label for="ntmc-rotX">X</label>
                    <input
                      id="ntmc-rotX"
                      type="number"
                      step="0.1"
                      [value]="service.meshTransform().rotation.x"
                      (input)="onRotationChange('x', $event)"
                    />
                  </div>
                  <div class="ntmc-input-row">
                    <label for="ntmc-rotY">Y</label>
                    <input
                      id="ntmc-rotY"
                      type="number"
                      step="0.1"
                      [value]="service.meshTransform().rotation.y"
                      (input)="onRotationChange('y', $event)"
                    />
                  </div>
                  <div class="ntmc-input-row">
                    <label for="ntmc-rotZ">Z</label>
                    <input
                      id="ntmc-rotZ"
                      type="number"
                      step="0.1"
                      [value]="service.meshTransform().rotation.z"
                      (input)="onRotationChange('z', $event)"
                    />
                  </div>
                </div>
              </div>
            </section>

            <!-- Actions -->
            <section class="ntmc-section ntmc-actions">
              <button
                class="ntmc-btn ntmc-btn-primary"
                [disabled]="!service.canApplyCrop()"
                (click)="onApplyCrop()"
              >
                {{ labels().applyCropLabel }}
              </button>
              <button
                class="ntmc-btn ntmc-btn-secondary"
                [disabled]="!service.canExport()"
                (click)="onDownload()"
              >
                {{ labels().downloadLabel }}
              </button>
            </section>
          </div>
        }

        <!-- Content projection slot -->
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .ntmc-container {
        display: flex;
        width: 100%;
        height: 100%;
        min-height: 400px;
        background: #1a1a1a;
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .ntmc-viewport-container {
        flex: 1;
        position: relative;
        min-width: 300px;
        background: #2a2a2a;
      }

      .ntmc-viewport {
        width: 100%;
        height: 100%;
      }

      .ntmc-loading-overlay,
      .ntmc-error-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.7);
        gap: 12px;
      }

      .ntmc-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: #4caf50;
        border-radius: 50%;
        animation: ntmc-spin 1s linear infinite;
      }

      @keyframes ntmc-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .ntmc-error-overlay {
        color: #ff5252;
      }

      .ntmc-error-icon {
        font-size: 32px;
      }

      .ntmc-ui-panel {
        width: 280px;
        min-width: 280px;
        padding: 16px;
        background: #252525;
        overflow-y: auto;
        border-left: 1px solid #333;
      }

      .ntmc-default-ui {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .ntmc-section {
        background: #2a2a2a;
        border-radius: 8px;
        padding: 12px;
      }

      .ntmc-section h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #4caf50;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ntmc-subsection {
        margin-bottom: 12px;
      }

      .ntmc-subsection:last-child {
        margin-bottom: 0;
      }

      .ntmc-subsection h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: 500;
        color: #888;
      }

      .ntmc-checkbox-row {
        margin-bottom: 12px;
      }

      .ntmc-checkbox-row label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        cursor: pointer;
      }

      .ntmc-checkbox-row input[type='checkbox'] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .ntmc-input-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .ntmc-input-grid-3 {
        grid-template-columns: 1fr 1fr 1fr;
      }

      .ntmc-input-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .ntmc-input-row label {
        font-size: 11px;
        color: #888;
        text-transform: uppercase;
      }

      .ntmc-input-row input[type='number'] {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #444;
        border-radius: 4px;
        background: #1a1a1a;
        color: #e0e0e0;
        font-size: 13px;
        box-sizing: border-box;
      }

      .ntmc-input-row input[type='number']:focus {
        outline: none;
        border-color: #4caf50;
      }

      .ntmc-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ntmc-btn {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition:
          background-color 0.2s,
          opacity 0.2s;
      }

      .ntmc-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ntmc-btn-primary {
        background: #4caf50;
        color: white;
      }

      .ntmc-btn-primary:hover:not(:disabled) {
        background: #45a049;
      }

      .ntmc-btn-secondary {
        background: #555;
        color: white;
      }

      .ntmc-btn-secondary:hover:not(:disabled) {
        background: #666;
      }
    `,
  ],
})
export class ModelCropperComponent implements AfterViewInit, OnDestroy {
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
    canApplyCrop: this.service.canApplyCrop(),
    canExport: this.service.canExport(),
    setCropBox: (box: CropBoxConfig) => this.service.updateCropBox(box),
    setCropBoxValue: (key: keyof CropBoxConfig, value: number) =>
      this.service.updateCropBoxValue(key, value),
    setMeshTransform: (transform: MeshTransformConfig) => this.service.updateTransform(transform),
    setPosition: (position) => this.service.updatePosition(position),
    setRotation: (rotation) => this.service.updateRotation(rotation),
    toggleBoxVisibility: (visible: boolean) => this.service.toggleBoxVisibility(visible),
    applyCrop: () => this.onApplyCrop(),
    download: () => this.onDownload(),
    resetCropBox: () => this.service.resetCropBox(),
    resetTransform: () => this.service.resetTransform(),
  }));

  readonly service = inject(ModelCropperService);

  constructor() {
    // Set initial values before viewport initialization
    // This is done in constructor to read input signals once at initialization
    const initialBox = this.initialCropBox();
    const initialTrans = this.initialTransform();
    this.service.setInitialValues(initialBox, initialTrans);
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
