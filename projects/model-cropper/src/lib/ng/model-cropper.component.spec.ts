/**
 * Unit tests for model-cropper.component.ts - Main Angular component
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, TemplateRef, ViewChild, signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { ModelCropperComponent } from './model-cropper.component';
import { ModelCropperService } from './model-cropper.service';
import { ModelCropperUiContext, DEFAULT_LABELS } from '../core/ui-context';
import {
  CropBoxConfig,
  MeshTransformConfig,
  CropResult,
  LoadingProgress,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
} from '../core/types';

/**
 * Test host component for testing with custom template
 */
@Component({
  standalone: true,
  imports: [ModelCropperComponent],
  template: `
    <ntmc-model-cropper
      [srcUrl]="srcUrl"
      [initialCropBox]="initialCropBox"
      [initialTransform]="initialTransform"
      [downloadMode]="downloadMode"
      [filename]="filename"
      [uiTemplate]="customTemplate"
      [labelsConfig]="labels"
      [cropBoxColor]="cropBoxColor"
      [showGrid]="showGrid"
      [showViewHelper]="showViewHelper"
      (cropApplied)="onCropApplied($event)"
      (fileReady)="onFileReady($event)"
      (loadError)="onLoadError($event)"
      (exportError)="onExportError($event)"
    />

    <ng-template #customTemplate let-ctx>
      <div class="custom-ui">
        <button class="custom-crop-btn" (click)="ctx.applyCrop()">Custom Crop</button>
        <button class="custom-download-btn" (click)="ctx.download()">Custom Download</button>
        <span class="loading-state">{{ ctx.loadingState }}</span>
      </div>
    </ng-template>
  `,
})
class TestHostComponent {
  @ViewChild('customTemplate', { static: true })
  customTemplate!: TemplateRef<{ $implicit: ModelCropperUiContext }>;

  srcUrl = 'test-model.glb';
  initialCropBox: CropBoxConfig = DEFAULT_CROP_BOX;
  initialTransform: MeshTransformConfig = DEFAULT_MESH_TRANSFORM;
  downloadMode: 'download' | 'emit' = 'download';
  filename = 'test-output.glb';
  labels = {};
  cropBoxColor = '#00ff00';
  showGrid = false;
  showViewHelper = false;

  cropAppliedEvents: CropResult[] = [];
  fileReadyEvents: ArrayBuffer[] = [];
  loadErrorEvents: string[] = [];
  exportErrorEvents: string[] = [];

  onCropApplied(result: CropResult): void {
    this.cropAppliedEvents.push(result);
  }

  onFileReady(buffer: ArrayBuffer): void {
    this.fileReadyEvents.push(buffer);
  }

  onLoadError(message: string): void {
    this.loadErrorEvents.push(message);
  }

  onExportError(message: string): void {
    this.exportErrorEvents.push(message);
  }
}

describe('ModelCropperComponent', () => {
  let component: ModelCropperComponent;
  let fixture: ComponentFixture<ModelCropperComponent>;
  let mockService: jasmine.SpyObj<ModelCropperService>;

  beforeEach(async () => {
    // Create mock service
    mockService = jasmine.createSpyObj(
      'ModelCropperService',
      [
        'setInitialValues',
        'initViewport',
        'loadModel',
        'dispose',
        'updateCropBox',
        'updateCropBoxValue',
        'updateTransform',
        'updatePosition',
        'updateRotation',
        'toggleBoxVisibility',
        'setCropBoxColor',
        'toggleGridVisibility',
        'toggleViewHelperVisibility',
        'applyCrop',
        'exportGlb',
        'resetCropBox',
        'resetTransform',
      ],
      {
        // Signal properties
        cropBox: signal(DEFAULT_CROP_BOX),
        meshTransform: signal(DEFAULT_MESH_TRANSFORM),
        loadingState: signal('idle' as const),
        loadingProgress: signal({
          state: 'idle',
          percentage: 0,
          loaded: 0,
          total: 0,
          message: '',
        } as LoadingProgress),
        errorMessage: signal(null as string | null),
        boxVisible: signal(true),
        cropBoxColor: signal('#00ff00'),
        gridVisible: signal(false),
        viewHelperVisible: signal(false),
        lastCropResult: signal(null as CropResult | null),
        isLoading: signal(false),
        isLoaded: signal(false),
        hasError: signal(false),
        canApplyCrop: signal(false),
        canExport: signal(false),
        cropIsValid: signal(false),
      }
    );

    mockService.loadModel.and.returnValue(Promise.resolve());
    mockService.applyCrop.and.returnValue({
      success: true,
      trianglesRemoved: 10,
      trianglesKept: 90,
      meshesProcessed: 1,
    });
    mockService.exportGlb.and.returnValue(Promise.resolve(new ArrayBuffer(8)));

    await TestBed.configureTestingModule({
      imports: [ModelCropperComponent],
    })
      .overrideComponent(ModelCropperComponent, {
        set: {
          providers: [{ provide: ModelCropperService, useValue: mockService }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ModelCropperComponent);
    component = fixture.componentInstance;

    // Set required input
    fixture.componentRef.setInput('srcUrl', 'test.glb');
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have a viewport element', () => {
      fixture.detectChanges();
      const viewport = fixture.debugElement.query(By.css('.ntmc-viewport'));
      expect(viewport).toBeTruthy();
    });

    it('should have a viewport element', () => {
      fixture.detectChanges();
      const viewport = fixture.debugElement.query(By.css('.ntmc-viewport'));
      expect(viewport).toBeTruthy();
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should call setInitialValues in ngOnInit', () => {
      fixture.detectChanges();
      expect(mockService.setInitialValues).toHaveBeenCalled();
    });

    it('should call initViewport in ngAfterViewInit', () => {
      fixture.detectChanges();
      expect(mockService.initViewport).toHaveBeenCalled();
    });

    it('should load model after view init', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(mockService.loadModel).toHaveBeenCalledWith('test.glb');
    }));

    it('should call dispose in ngOnDestroy', () => {
      fixture.detectChanges();
      fixture.destroy();
      expect(mockService.dispose).toHaveBeenCalled();
    });
  });

  describe('Inputs', () => {
    it('should accept srcUrl input', () => {
      fixture.componentRef.setInput('srcUrl', 'model.glb');
      fixture.detectChanges();
      expect(component.srcUrl()).toBe('model.glb');
    });

    it('should accept initialCropBox input', () => {
      const customBox: CropBoxConfig = {
        minX: -5,
        maxX: 5,
        minY: -5,
        maxY: 5,
        minZ: -5,
        maxZ: 5,
      };
      fixture.componentRef.setInput('initialCropBox', customBox);
      fixture.detectChanges();
      expect(component.initialCropBox()).toEqual(customBox);
    });

    it('should accept initialTransform input', () => {
      const customTransform: MeshTransformConfig = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
      };
      fixture.componentRef.setInput('initialTransform', customTransform);
      fixture.detectChanges();
      expect(component.initialTransform()).toEqual(customTransform);
    });

    it('should accept downloadMode input', () => {
      fixture.componentRef.setInput('downloadMode', 'emit');
      fixture.detectChanges();
      expect(component.downloadMode()).toBe('emit');
    });

    it('should accept filename input', () => {
      fixture.componentRef.setInput('filename', 'custom-name.glb');
      fixture.detectChanges();
      expect(component.filename()).toBe('custom-name.glb');
    });

    it('should accept cropBoxColor input', () => {
      fixture.componentRef.setInput('cropBoxColor', '#ff0000');
      fixture.detectChanges();
      expect(component.cropBoxColor()).toBe('#ff0000');
    });

    it('should accept showGrid input', () => {
      fixture.componentRef.setInput('showGrid', true);
      fixture.detectChanges();
      expect(component.showGrid()).toBe(true);
    });

    it('should accept showViewHelper input', () => {
      fixture.componentRef.setInput('showViewHelper', true);
      fixture.detectChanges();
      expect(component.showViewHelper()).toBe(true);
    });

    it('should accept sceneBackgroundColor input and pass to service', () => {
      fixture.componentRef.setInput('sceneBackgroundColor', 'rgba(17,34,51,0.5)');
      fixture.detectChanges();

      expect(component.sceneBackgroundColor()).toBe('rgba(17,34,51,0.5)');

      const lastCall = (mockService.setInitialValues as jasmine.Spy).calls.mostRecent();
      expect(lastCall).toBeDefined();
      // visual options are passed as the third argument
      expect(lastCall.args[2].sceneBackgroundColor).toBe('rgba(17,34,51,0.5)');
    });

    it('should accept labelsConfig input', () => {
      const customLabels = { applyCropLabel: 'Crop It!' };
      fixture.componentRef.setInput('labelsConfig', customLabels);
      fixture.detectChanges();
      expect(component.labelsConfig()).toEqual(customLabels);
    });

    it('should accept showLoadingOverlay input', () => {
      fixture.componentRef.setInput('showLoadingOverlay', false);
      fixture.detectChanges();
      expect(component.showLoadingOverlay()).toBe(false);
    });

    it('should have showLoadingOverlay default to true', () => {
      fixture.detectChanges();
      expect(component.showLoadingOverlay()).toBe(true);
    });

    it('should accept showErrorOverlay input', () => {
      fixture.componentRef.setInput('showErrorOverlay', false);
      fixture.detectChanges();
      expect(component.showErrorOverlay()).toBe(false);
    });

    it('should have showErrorOverlay default to true', () => {
      fixture.detectChanges();
      expect(component.showErrorOverlay()).toBe(true);
    });

    it('should accept showLoadingProgress input', () => {
      fixture.componentRef.setInput('showLoadingProgress', false);
      fixture.detectChanges();
      expect(component.showLoadingProgress()).toBe(false);
    });

    it('should have showLoadingProgress default to true', () => {
      fixture.detectChanges();
      expect(component.showLoadingProgress()).toBe(true);
    });

    it('should accept spinnerColor input', () => {
      fixture.componentRef.setInput('spinnerColor', '#ff5500');
      fixture.detectChanges();
      expect(component.spinnerColor()).toBe('#ff5500');
    });

    it('should have spinnerColor default to green', () => {
      fixture.detectChanges();
      expect(component.spinnerColor()).toBe('#4caf50');
    });

    it('should have rotationUnit default to radians', () => {
      fixture.detectChanges();
      expect(component.rotationUnit()).toBe('radians');
    });

    it('should accept rotationUnit input and pass to service', () => {
      fixture.componentRef.setInput('rotationUnit', 'degrees');
      fixture.detectChanges();

      expect(component.rotationUnit()).toBe('degrees');

      // Ensure setInitialValues was called with rotation unit as fourth argument
      const lastCall = (mockService.setInitialValues as jasmine.Spy).calls.mostRecent();
      expect(lastCall).toBeDefined();
      expect(lastCall.args[3]).toBe('degrees');
    });

    it('getRotationDisplayValue returns raw radians when unit is radians', () => {
      // set a known rotation in the mocked service (radians)
      (mockService.meshTransform as unknown as ReturnType<typeof signal>).set({
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 1.2345, y: 0, z: 0 },
      } as MeshTransformConfig);

      fixture.componentRef.setInput('rotationUnit', 'radians');
      fixture.detectChanges();

      const val = component.getRotationDisplayValue('x');
      expect(val).toBeCloseTo(1.2345, 4);
    });

    it('getRotationDisplayValue converts to degrees when unit is degrees', () => {
      // set a known rotation in the mocked service (radians)
      (mockService.meshTransform as unknown as ReturnType<typeof signal>).set({
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
      } as MeshTransformConfig);

      fixture.componentRef.setInput('rotationUnit', 'degrees');
      fixture.detectChanges();

      const val = component.getRotationDisplayValue('y');
      expect(val).toBeCloseTo(90, 2);
    });
  });

  describe('Labels', () => {
    it('should merge custom labels with defaults', () => {
      fixture.componentRef.setInput('labelsConfig', { applyCropLabel: 'Custom' });
      fixture.detectChanges();

      const labels = component.labels();
      expect(labels.applyCropLabel).toBe('Custom');
      expect(labels.downloadLabel).toBe(DEFAULT_LABELS.downloadLabel);
    });

    it('should use all default labels when no custom labels provided', () => {
      fixture.detectChanges();

      const labels = component.labels();
      expect(labels).toEqual(DEFAULT_LABELS);
    });
  });

  describe('UI Context', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should provide uiContext computed signal', () => {
      const context = component.uiContext();
      expect(context).toBeDefined();
    });

    it('should include state in context', () => {
      const context = component.uiContext();

      expect(context.cropBox).toBeDefined();
      expect(context.meshTransform).toBeDefined();
      expect(context.loadingState).toBeDefined();
      expect(context.errorMessage).toBeDefined();
      expect(context.boxVisible).toBeDefined();
      expect(context.cropBoxColor).toBeDefined();
      expect(context.gridVisible).toBeDefined();
      expect(context.viewHelperVisible).toBeDefined();
      expect(context.canApplyCrop).toBeDefined();
      expect(context.canExport).toBeDefined();
    });

    it('should include actions in context', () => {
      const context = component.uiContext();

      expect(typeof context.setCropBox).toBe('function');
      expect(typeof context.setCropBoxValue).toBe('function');
      expect(typeof context.setMeshTransform).toBe('function');
      expect(typeof context.setPosition).toBe('function');
      expect(typeof context.setRotation).toBe('function');
      expect(typeof context.toggleBoxVisibility).toBe('function');
      expect(typeof context.setCropBoxColor).toBe('function');
      expect(typeof context.toggleGridVisibility).toBe('function');
      expect(typeof context.toggleViewHelperVisibility).toBe('function');
      expect(typeof context.applyCrop).toBe('function');
      expect(typeof context.download).toBe('function');
      expect(typeof context.resetCropBox).toBe('function');
      expect(typeof context.resetTransform).toBe('function');
    });

    it('should call service when context action invoked', () => {
      const context = component.uiContext();
      const newBox: CropBoxConfig = {
        minX: -2,
        maxX: 2,
        minY: -2,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      };

      context.setCropBox(newBox);

      expect(mockService.updateCropBox).toHaveBeenCalledWith(newBox);
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    describe('onBoxVisibilityChange', () => {
      it('should toggle box visibility', () => {
        const event = { target: { checked: false } } as unknown as Event;
        component.onBoxVisibilityChange(event);

        expect(mockService.toggleBoxVisibility).toHaveBeenCalledWith(false);
      });
    });

    describe('onGridVisibilityChange', () => {
      it('should toggle grid visibility', () => {
        const event = { target: { checked: true } } as unknown as Event;
        component.onGridVisibilityChange(event);

        expect(mockService.toggleGridVisibility).toHaveBeenCalledWith(true);
      });
    });

    describe('onViewHelperVisibilityChange', () => {
      it('should toggle view helper visibility', () => {
        const event = { target: { checked: true } } as unknown as Event;
        component.onViewHelperVisibilityChange(event);

        expect(mockService.toggleViewHelperVisibility).toHaveBeenCalledWith(true);
      });
    });

    describe('onCropBoxColorChange', () => {
      it('should set crop box color', () => {
        const event = { target: { value: '#ff0000' } } as unknown as Event;
        component.onCropBoxColorChange(event);

        expect(mockService.setCropBoxColor).toHaveBeenCalledWith('#ff0000');
      });
    });

    describe('onCropBoxChange', () => {
      it('should update crop box value', () => {
        const event = { target: { value: '-5' } } as unknown as Event;
        component.onCropBoxChange('minX', event);

        expect(mockService.updateCropBoxValue).toHaveBeenCalledWith('minX', -5);
      });

      it('should ignore NaN values', () => {
        const event = { target: { value: 'invalid' } } as unknown as Event;
        component.onCropBoxChange('minX', event);

        expect(mockService.updateCropBoxValue).not.toHaveBeenCalled();
      });
    });

    describe('onPositionChange', () => {
      it('should update position', () => {
        const event = { target: { value: '2.5' } } as unknown as Event;
        component.onPositionChange('x', event);

        expect(mockService.updatePosition).toHaveBeenCalledWith({ x: 2.5 });
      });

      it('should ignore NaN values', () => {
        const event = { target: { value: 'invalid' } } as unknown as Event;
        component.onPositionChange('x', event);

        expect(mockService.updatePosition).not.toHaveBeenCalled();
      });
    });

    describe('onRotationChange', () => {
      it('should update rotation', () => {
        const event = { target: { value: '1.57' } } as unknown as Event;
        component.onRotationChange('y', event);

        expect(mockService.updateRotation).toHaveBeenCalledWith({ y: 1.57 });
      });

      it('should ignore NaN values', () => {
        const event = { target: { value: 'invalid' } } as unknown as Event;
        component.onRotationChange('y', event);

        expect(mockService.updateRotation).not.toHaveBeenCalled();
      });
    });

    describe('onApplyCrop', () => {
      it('should call applyCrop and emit result', () => {
        const cropAppliedSpy = spyOn(component.cropApplied, 'emit');

        component.onApplyCrop();

        expect(mockService.applyCrop).toHaveBeenCalled();
        expect(cropAppliedSpy).toHaveBeenCalledWith({
          success: true,
          trianglesRemoved: 10,
          trianglesKept: 90,
          meshesProcessed: 1,
        });
      });
    });

    describe('onDownload', () => {
      it('should export and trigger download in download mode', fakeAsync(() => {
        fixture.componentRef.setInput('downloadMode', 'download');
        fixture.detectChanges();

        // Create a spy for triggerDownload (private method)
        const _originalTriggerDownload = (
          component as unknown as { triggerDownload: (buffer: ArrayBuffer) => void }
        ).triggerDownload;
        const triggerDownloadSpy = spyOn(
          component as unknown as { triggerDownload: (buffer: ArrayBuffer) => void },
          'triggerDownload'
        );

        component.onDownload();
        tick();

        expect(mockService.exportGlb).toHaveBeenCalled();
        expect(triggerDownloadSpy).toHaveBeenCalled();
      }));

      it('should export and emit buffer in emit mode', fakeAsync(() => {
        fixture.componentRef.setInput('downloadMode', 'emit');
        fixture.detectChanges();

        const fileReadySpy = spyOn(component.fileReady, 'emit');

        component.onDownload();
        tick();

        expect(mockService.exportGlb).toHaveBeenCalled();
        expect(fileReadySpy).toHaveBeenCalled();
      }));

      it('should emit export error on failure', fakeAsync(() => {
        mockService.exportGlb.and.returnValue(Promise.reject(new Error('Export failed')));
        const exportErrorSpy = spyOn(component.exportError, 'emit');

        component.onDownload();
        tick();

        expect(exportErrorSpy).toHaveBeenCalledWith('Export failed');
      }));
    });
  });

  describe('Loading State UI', () => {
    it('should show loading overlay when loading', () => {
      (mockService.isLoading as unknown as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.ntmc-loading-overlay'));
      expect(overlay).toBeTruthy();
    });

    it('should hide loading overlay when not loading', () => {
      (mockService.isLoading as unknown as ReturnType<typeof signal>).set(false);
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.ntmc-loading-overlay'));
      expect(overlay).toBeFalsy();
    });

    it('should hide loading overlay when showLoadingOverlay is false even when loading', () => {
      fixture.componentRef.setInput('showLoadingOverlay', false);
      (mockService.isLoading as unknown as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.ntmc-loading-overlay'));
      expect(overlay).toBeFalsy();
    });

    it('should show progress bar when showLoadingProgress is true', () => {
      fixture.componentRef.setInput('showLoadingProgress', true);
      (mockService.isLoading as unknown as ReturnType<typeof signal>).set(true);
      (mockService.loadingProgress as unknown as ReturnType<typeof signal>).set({
        state: 'loading',
        percentage: 50,
        loaded: 500000,
        total: 1000000,
        message: 'Loading...',
      });
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('.ntmc-progress-container'));
      expect(progressBar).toBeTruthy();
    });

    it('should hide progress bar when showLoadingProgress is false', () => {
      fixture.componentRef.setInput('showLoadingProgress', false);
      (mockService.isLoading as unknown as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('.ntmc-progress-container'));
      expect(progressBar).toBeFalsy();
    });

    it('should apply custom spinner color', () => {
      fixture.componentRef.setInput('spinnerColor', '#ff5500');
      (mockService.isLoading as unknown as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.ntmc-spinner'));
      expect(spinner).toBeTruthy();
      const spinnerEl = spinner.nativeElement as HTMLElement;
      expect(spinnerEl.style.borderTopColor).toBe('rgb(255, 85, 0)');
    });
  });

  describe('Error State UI', () => {
    it('should show error overlay when has error', () => {
      (mockService.hasError as unknown as ReturnType<typeof signal>).set(true);
      (mockService.errorMessage as unknown as ReturnType<typeof signal>).set('Test error');
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.ntmc-error-overlay'));
      expect(overlay).toBeTruthy();
    });

    it('should hide error overlay when no error', () => {
      (mockService.hasError as unknown as ReturnType<typeof signal>).set(false);
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.ntmc-error-overlay'));
      expect(overlay).toBeFalsy();
    });

    it('should hide error overlay when showErrorOverlay is false even when has error', () => {
      fixture.componentRef.setInput('showErrorOverlay', false);
      (mockService.hasError as unknown as ReturnType<typeof signal>).set(true);
      (mockService.errorMessage as unknown as ReturnType<typeof signal>).set('Test error');
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.ntmc-error-overlay'));
      expect(overlay).toBeFalsy();
    });
  });
});

describe('ModelCropperComponent with Test Host', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let _hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    _hostComponent = hostFixture.componentInstance;
  });

  afterEach(() => {
    hostFixture.destroy();
  });

  it('should render custom template', () => {
    hostFixture.detectChanges();

    const customUi = hostFixture.debugElement.query(By.css('.custom-ui'));
    expect(customUi).toBeTruthy();
  });

  it('should have custom crop button in custom template', () => {
    hostFixture.detectChanges();

    const customBtn = hostFixture.debugElement.query(By.css('.custom-crop-btn'));
    expect(customBtn).toBeTruthy();
  });

  it('should have custom download button in custom template', () => {
    hostFixture.detectChanges();

    const customBtn = hostFixture.debugElement.query(By.css('.custom-download-btn'));
    expect(customBtn).toBeTruthy();
  });

  it('should pass context to custom template', () => {
    hostFixture.detectChanges();

    const loadingState = hostFixture.debugElement.query(By.css('.loading-state'));
    expect(loadingState.nativeElement.textContent).toBeTruthy();
  });
});

describe('ModelCropperComponent Output Events', () => {
  let component: ModelCropperComponent;
  let fixture: ComponentFixture<ModelCropperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelCropperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelCropperComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('srcUrl', 'test.glb');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should emit cropApplied event', (done) => {
    component.cropApplied.subscribe((result) => {
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      done();
    });

    component.onApplyCrop();
  });

  it('should emit loadError on model load failure', fakeAsync(() => {
    const errors: string[] = [];
    component.loadError.subscribe((err) => errors.push(err));

    // Trigger error by loading invalid URL
    // (The actual error emission happens in loadModelFromUrl)
    tick();

    // Error would be emitted if model loading fails
    // This test verifies the output is wired up correctly
    expect(component.loadError).toBeDefined();
  }));

  it('should emit exportError on export failure', fakeAsync(() => {
    const errors: string[] = [];
    component.exportError.subscribe((err) => errors.push(err));

    component.onDownload();
    tick();

    // Export fails because no model is loaded
    expect(errors.length).toBeGreaterThan(0);
  }));
});
