/**
 * ModelCropEngine - Core Three.js service for 3D model manipulation
 *
 * This class is framework-agnostic and handles all Three.js operations:
 * - Scene setup, camera, renderer, lighting, controls
 * - Model loading (GLB/GLTF/FBX)
 * - Crop box visualization
 * - Mesh transformations
 * - Cheap cropping via CheapCropper
 * - GLB export
 *
 * Can be used by any Angular adapter version (17, 19, 20, etc.)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

import {
  CropBoxConfig,
  MeshTransformConfig,
  ModelCropEngineConfig,
  CropResult,
  LoadingState,
  LoadingProgress,
  DEFAULT_CROP_BOX,
  DEFAULT_MESH_TRANSFORM,
  getModelFileType,
} from './types';
import { CheapCropper, CheapCropOptions } from './cheap-cropper';

/**
 * Callback type for state changes
 */
export type StateChangeCallback<T> = (state: T) => void;

/**
 * ModelCropEngine configuration defaults
 */
const DEFAULT_ENGINE_CONFIG: Required<ModelCropEngineConfig> = {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: false,
};

/**
 * Core Three.js engine for model cropping
 */
export class ModelCropEngine {
  // Three.js core objects
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  // Model and crop box
  private loadedModel: THREE.Object3D | null = null;
  private cropBoxMesh: THREE.Mesh | null = null;
  private cropBoxHelper: THREE.Box3Helper | null = null;
  private cropBoxColor: THREE.Color = new THREE.Color(0x00ff00);
  private gridHelper: THREE.GridHelper | null = null;
  private viewHelper: ViewHelper | null = null;

  // State
  private currentCropBox: CropBoxConfig = DEFAULT_CROP_BOX;
  private currentTransform: MeshTransformConfig = DEFAULT_MESH_TRANSFORM;
  private loadingState: LoadingState = 'idle';
  private boxVisible = true;
  private gridVisible = false;
  private viewHelperVisible = false;

  // Timing
  private clock = new THREE.Clock();

  // Animation
  private animationFrameId: number | null = null;
  private isDisposed = false;

  // Host element
  private hostElement: HTMLElement;

  // Callbacks for state changes
  private onLoadingStateChange?: StateChangeCallback<LoadingState>;
  private onError?: StateChangeCallback<string>;
  private onProgress?: StateChangeCallback<LoadingProgress>;

  constructor(hostElement: HTMLElement, config: ModelCropEngineConfig = {}) {
    this.hostElement = hostElement;
    const cfg = { ...DEFAULT_ENGINE_CONFIG, ...config };

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a2a);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      hostElement.clientWidth / hostElement.clientHeight || 1,
      0.1,
      1000
    );
    this.camera.position.set(3, 3, 3);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: cfg.antialias,
      alpha: cfg.alpha,
      preserveDrawingBuffer: cfg.preserveDrawingBuffer,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(hostElement.clientWidth || 100, hostElement.clientHeight || 100);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false; // we clear manually to overlay view helper
    hostElement.appendChild(this.renderer.domElement);

    // Create controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;

    // Setup lighting
    this.setupLighting();

    // Setup resize observer
    this.setupResizeObserver();

    // Pointer handling for view helper clicking (use pointerup per official Three.js editor pattern)
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Set callbacks for state changes
   */
  setCallbacks(callbacks: {
    onLoadingStateChange?: StateChangeCallback<LoadingState>;
    onError?: StateChangeCallback<string>;
    onProgress?: StateChangeCallback<LoadingProgress>;
  }): void {
    this.onLoadingStateChange = callbacks.onLoadingStateChange;
    this.onError = callbacks.onError;
    this.onProgress = callbacks.onProgress;
  }

  /**
   * Set crop box color (hex string or number)
   */
  setCropBoxColor(color: string | number): void {
    this.cropBoxColor = new THREE.Color(color as THREE.ColorRepresentation);
    this.updateCropBoxVisualization();
  }

  /**
   * Toggle grid helper visibility
   */
  setGridVisibility(visible: boolean): void {
    this.gridVisible = visible;
    if (visible && !this.gridHelper) {
      // 10 unit grid with 10 divisions for modest default
      this.gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
      this.scene.add(this.gridHelper);
    }
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  /**
   * Toggle view helper visibility
   */
  setViewHelperVisibility(visible: boolean): void {
    this.viewHelperVisible = visible;

    if (visible && !this.viewHelper) {
      this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement);
      // Initialize center to current controls target
      this.viewHelper.center.copy(this.controls.target);
      // Three.js r166+ requires explicit setLabels call to display axis labels
      // Check if method exists for backward compatibility with older versions
      if (
        typeof (
          this.viewHelper as ViewHelper & { setLabels?: (x: string, y: string, z: string) => void }
        ).setLabels === 'function'
      ) {
        (
          this.viewHelper as ViewHelper & { setLabels: (x: string, y: string, z: string) => void }
        ).setLabels('X', 'Y', 'Z');
      }
    }

    if (this.viewHelper) {
      this.viewHelper.visible = visible;
      // Reset animation state when toggling visibility
      if (!visible) {
        this.viewHelper.animating = false;
      }
    }
  }

  /**
   * Set scene background color. Accepts CSS color strings (hex, rgb(a), rgba, named colors).
   * If the color has transparency (alpha < 1), the scene background is kept null so the
   * canvas can be rendered with transparency; the renderer clear color's alpha is set
   * so compositing works as expected.
   */
  setSceneBackgroundColor(color: string): void {
    const parsed = this.parseCssColor(color);
    this.renderer.setClearColor(parsed.color.getHex(), parsed.alpha);
    if (parsed.alpha < 1) {
      // Keep scene.background null to allow renderer alpha transparency
      this.scene.background = null;
    } else {
      // When fully opaque, set scene.background to the color for potential postprocessing
      this.scene.background = parsed.color;
    }
  }

  /**
   * Parse simple CSS color strings into a THREE.Color and alpha value.
   * Supports: hex (#RGB, #RRGGBB, #RRGGBBAA), rgb(...), rgba(...), and named colors.
   */
  private parseCssColor(input: string): { color: THREE.Color; alpha: number } {
    const s = (input || '').trim();

    // rgba(...) or rgb(...)
    const rgbaMatch = s.match(
      /rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)/i
    );
    if (rgbaMatch) {
      const r = Math.min(255, parseInt(rgbaMatch[1], 10));
      const g = Math.min(255, parseInt(rgbaMatch[2], 10));
      const b = Math.min(255, parseInt(rgbaMatch[3], 10));
      const a = rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1;
      return { color: new THREE.Color(r / 255, g / 255, b / 255), alpha: a };
    }

    // Hex formats: #RRGGBB, #RGB, #RRGGBBAA
    if (s.startsWith('#')) {
      const hex = s.slice(1);
      if (/^[0-9a-fA-F]{8}$/.test(hex)) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = parseInt(hex.slice(6, 8), 16) / 255;
        return { color: new THREE.Color(r / 255, g / 255, b / 255), alpha: a };
      }
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        return { color: new THREE.Color('#' + hex), alpha: 1 };
      }
      if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { color: new THREE.Color(r / 255, g / 255, b / 255), alpha: 1 };
      }
    }

    // Fallback: let THREE try to parse named colors and other formats; alpha = 1
    try {
      const c = new THREE.Color(s || '#000000');
      return { color: c, alpha: 1 };
    } catch {
      return { color: new THREE.Color(0x000000), alpha: 1 };
    }
  }

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Hemisphere light for ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Directional light for shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    this.scene.add(dirLight);

    // Add a subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
  }

  /**
   * Setup resize observer for responsive rendering
   */
  private setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      if (this.isDisposed) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height);
        }
      }
    });

    resizeObserver.observe(this.hostElement);
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    const animate = (): void => {
      if (this.isDisposed) return;

      const delta = this.clock.getDelta();
      this.animationFrameId = requestAnimationFrame(animate);

      // Handle view helper animation
      if (this.viewHelper && this.viewHelper.animating) {
        this.viewHelper.update(delta);
        // Disable controls while animating
        this.controls.enabled = false;
      } else if (this.viewHelper && !this.viewHelper.animating) {
        // Re-enable controls when not animating
        this.controls.enabled = true;
      }

      this.controls.update();
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      if (this.viewHelper && this.viewHelperVisible) {
        this.viewHelper.render(this.renderer);
      }
    };

    animate();
  }

  /**
   * Load a 3D model from URL
   */
  async loadModel(src: string | Blob | File): Promise<THREE.Object3D> {
    this.setLoadingState('loading');

    // Resolve source to a URL the loaders can consume (supports plain URL, Blob URL, File, or Blob)
    const { url, fileType, revokeUrl } = await this.resolveModelSource(src);

    try {
      // Remove existing model
      if (this.loadedModel) {
        this.scene.remove(this.loadedModel);
        this.disposeObject(this.loadedModel);
        this.loadedModel = null;
      }

      let model: THREE.Object3D;

      switch (fileType) {
        case 'glb':
        case 'gltf':
          model = await this.loadGLTF(url);
          break;
        case 'fbx':
          model = await this.loadFBX(url);
          break;
        default:
          // Fallback to GLTF loader for unknown sources (e.g., Blob URLs without extensions)
          model = await this.loadGLTF(url);
      }

      this.loadedModel = model;
      this.scene.add(model);

      // Fit model in view
      this.fitModelInView(model);

      // Apply current transform
      this.applyTransform();

      // Update crop box visualization
      this.updateCropBoxVisualization();

      this.setLoadingState('loaded');
      return model;
    } catch (error) {
      this.setLoadingState('error');
      const message = error instanceof Error ? error.message : 'Unknown error loading model';
      this.onError?.(message);
      throw error;
    } finally {
      revokeUrl?.();
    }
  }

  /**
   * Normalize incoming source (URL, Blob URL, File, Blob) into a loader-friendly URL and detected type
   */
  private async resolveModelSource(src: string | Blob | File): Promise<{
    url: string;
    fileType: ReturnType<typeof getModelFileType>;
    revokeUrl?: () => void;
  }> {
    // Plain URL string (non-blob)
    if (typeof src === 'string' && !src.startsWith('blob:')) {
      return { url: src, fileType: getModelFileType(src) };
    }

    // File instance carries a name and mime type
    if (src instanceof File) {
      const fileType = await this.inferFileType(src.name, src.type, src);
      const objectUrl = URL.createObjectURL(src);
      return { url: objectUrl, fileType, revokeUrl: () => URL.revokeObjectURL(objectUrl) };
    }

    // Blob instance or blob URL string
    const blob: Blob = src instanceof Blob ? src : await this.fetchBlobFromUrl(src);
    const inferredType = await this.inferFileType(undefined, blob.type, blob);
    const objectUrl = URL.createObjectURL(blob);
    return {
      url: objectUrl,
      fileType: inferredType,
      revokeUrl: () => URL.revokeObjectURL(objectUrl),
    };
  }

  /**
   * Infer model file type from optional filename, MIME type, or file content (magic bytes)
   */
  private async inferFileType(
    filename?: string,
    mimeType?: string,
    blob?: Blob
  ): Promise<ReturnType<typeof getModelFileType>> {
    // First, try by filename extension
    if (filename) {
      const byName = getModelFileType(filename);
      if (byName !== 'unknown') return byName;
    }

    // Then try by MIME type (but ignore unreliable types)
    if (mimeType) {
      const lower = mimeType.toLowerCase();
      // Skip unreliable MIME types that don't actually indicate file format
      const unreliableMimeTypes = ['text/plain', 'application/octet-stream', 'binary/octet-stream'];
      if (!unreliableMimeTypes.includes(lower)) {
        if (lower.includes('fbx')) return 'fbx';
        if (lower.includes('gltf') || lower.includes('glb')) return 'glb';
      }
    }

    // Finally, try detecting from file content (magic bytes)
    if (blob) {
      const detectedType = await this.detectFileTypeFromContent(blob);
      if (detectedType !== 'unknown') return detectedType;
    }

    return 'unknown';
  }

  /**
   * Detect file type by reading magic bytes from the blob content
   */
  private async detectFileTypeFromContent(
    blob: Blob
  ): Promise<ReturnType<typeof getModelFileType>> {
    try {
      // Read the first 64 bytes to check magic signatures
      const headerSlice = blob.slice(0, 64);
      const buffer = await headerSlice.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // GLB: starts with "glTF" magic (0x67 0x6C 0x54 0x46)
      if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
        return 'glb';
      }

      // FBX Binary: starts with "Kaydara FBX Binary" followed by null bytes
      const fbxMagic = 'Kaydara FBX Binary';
      const headerString = new TextDecoder('ascii').decode(bytes.slice(0, fbxMagic.length));
      if (headerString === fbxMagic) {
        return 'fbx';
      }

      // GLTF (JSON): starts with '{' (possibly with leading whitespace)
      const textStart = new TextDecoder('utf-8').decode(bytes.slice(0, 32)).trim();
      if (textStart.startsWith('{')) {
        return 'gltf';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Fetches a Blob from a blob: URL
   */
  private async fetchBlobFromUrl(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob source: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }

  /**
   * Load GLTF/GLB model
   */
  private loadGLTF(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        (progress) => this.handleLoadProgress(progress, 'Loading GLTF/GLB model...'),
        (error) => reject(error)
      );
    });
  }

  /**
   * Load FBX model
   */
  private loadFBX(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new FBXLoader();
      loader.load(
        url,
        (fbx) => resolve(fbx),
        (progress) => this.handleLoadProgress(progress, 'Loading FBX model...'),
        (error) => reject(error)
      );
    });
  }

  /**
   * Handle loading progress and emit progress callback
   */
  private handleLoadProgress(progress: ProgressEvent, message: string): void {
    const percentage =
      progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
    this.onProgress?.({
      state: 'loading',
      percentage,
      loaded: progress.loaded,
      total: progress.total,
      message,
    });
  }

  /**
   * Fit model into camera view
   */
  private fitModelInView(model: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    cameraDistance *= 1.5; // Add some padding

    // Position camera to look at the model's center (without moving the model)
    this.camera.position.set(
      center.x + cameraDistance,
      center.y + cameraDistance,
      center.z + cameraDistance
    );
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();

    if (this.viewHelper) {
      this.viewHelper.center.copy(this.controls.target);
    }

    // Update default crop box based on actual model bounds (model stays at its original position)
    const padding = 0.1;
    this.currentCropBox = {
      minX: box.min.x - padding,
      minY: box.min.y - padding,
      minZ: box.min.z - padding,
      maxX: box.max.x + padding,
      maxY: box.max.y + padding,
      maxZ: box.max.z + padding,
    };
  }

  /**
   * Update crop box configuration
   */
  updateCropBox(box: CropBoxConfig): void {
    this.currentCropBox = box;
    this.updateCropBoxVisualization();
  }

  /**
   * Get current crop box configuration
   */
  getCropBox(): CropBoxConfig {
    return { ...this.currentCropBox };
  }

  /**
   * Toggle crop box visibility
   */
  setBoxVisibility(visible: boolean): void {
    this.boxVisible = visible;
    if (this.cropBoxMesh) {
      this.cropBoxMesh.visible = visible;
    }
    if (this.cropBoxHelper) {
      this.cropBoxHelper.visible = visible;
    }
  }

  /**
   * Get crop box visibility state
   */
  getBoxVisibility(): boolean {
    return this.boxVisible;
  }

  /**
   * Update crop box visualization mesh
   */
  private updateCropBoxVisualization(): void {
    // Remove existing crop box mesh
    if (this.cropBoxMesh) {
      this.scene.remove(this.cropBoxMesh);
      this.cropBoxMesh.geometry.dispose();
      (this.cropBoxMesh.material as THREE.Material).dispose();
    }
    if (this.cropBoxHelper) {
      this.scene.remove(this.cropBoxHelper);
    }

    const box = this.currentCropBox;
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const depth = box.maxZ - box.minZ;

    // Create translucent box mesh
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
      color: this.cropBoxColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.cropBoxMesh = new THREE.Mesh(geometry, material);
    this.cropBoxMesh.position.set(
      (box.minX + box.maxX) / 2,
      (box.minY + box.maxY) / 2,
      (box.minZ + box.maxZ) / 2
    );
    this.cropBoxMesh.visible = this.boxVisible;
    this.scene.add(this.cropBoxMesh);

    // Create box helper for wireframe edges
    const box3 = new THREE.Box3(
      new THREE.Vector3(box.minX, box.minY, box.minZ),
      new THREE.Vector3(box.maxX, box.maxY, box.maxZ)
    );
    this.cropBoxHelper = new THREE.Box3Helper(box3, this.cropBoxColor.clone());
    this.cropBoxHelper.visible = this.boxVisible;
    this.scene.add(this.cropBoxHelper);
  }

  /**
   * Set mesh transformation
   */
  setMeshTransform(transform: MeshTransformConfig): void {
    this.currentTransform = transform;
    this.applyTransform();
  }

  /**
   * Get current mesh transformation
   */
  getMeshTransform(): MeshTransformConfig {
    return { ...this.currentTransform };
  }

  /**
   * Apply current transformation to loaded model
   */
  private applyTransform(): void {
    if (!this.loadedModel) return;

    const { position, rotation } = this.currentTransform;
    this.loadedModel.position.set(position.x, position.y, position.z);
    this.loadedModel.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  /**
   * Apply cheap cropping to the loaded model
   */
  applyCheapCrop(options?: CheapCropOptions): CropResult {
    if (!this.loadedModel) {
      return {
        success: false,
        trianglesRemoved: 0,
        trianglesKept: 0,
        meshesProcessed: 0,
      };
    }

    // Update world matrices before cropping
    this.loadedModel.updateMatrixWorld(true);

    return CheapCropper.applyCrop(this.loadedModel, this.currentCropBox, options);
  }

  /**
   * Export current model to GLB format
   */
  async exportToGlb(): Promise<ArrayBuffer> {
    if (!this.loadedModel) {
      throw new Error('No model loaded to export');
    }

    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();

      exporter.parse(
        this.loadedModel!,
        (result) => {
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            // If JSON result, convert to binary
            const jsonString = JSON.stringify(result);
            const encoder = new TextEncoder();
            resolve(encoder.encode(jsonString).buffer);
          }
        },
        (error) => reject(error),
        { binary: true }
      );
    });
  }

  /**
   * Get the current loading state
   */
  getLoadingState(): LoadingState {
    return this.loadingState;
  }

  /**
   * Get the loaded model (for advanced use)
   */
  getLoadedModel(): THREE.Object3D | null {
    return this.loadedModel;
  }

  /**
   * Set loading state and notify callback
   */
  private setLoadingState(state: LoadingState): void {
    this.loadingState = state;
    this.onLoadingStateChange?.(state);
  }

  /**
   * Dispose of a Three.js object and its children
   */
  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.isDisposed = true;

    // Stop animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Dispose model
    if (this.loadedModel) {
      this.scene.remove(this.loadedModel);
      this.disposeObject(this.loadedModel);
      this.loadedModel = null;
    }

    // Dispose crop box mesh
    if (this.cropBoxMesh) {
      this.scene.remove(this.cropBoxMesh);
      this.cropBoxMesh.geometry.dispose();
      (this.cropBoxMesh.material as THREE.Material).dispose();
      this.cropBoxMesh = null;
    }

    // Dispose crop box helper
    if (this.cropBoxHelper) {
      this.scene.remove(this.cropBoxHelper);
      this.cropBoxHelper = null;
    }

    // Dispose controls
    this.controls.dispose();

    // Remove listeners
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);

    // Dispose grid helper
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper = null;
    }

    // Dispose view helper
    if (this.viewHelper) {
      this.viewHelper.dispose();
      this.viewHelper = null;
    }

    // Dispose renderer
    this.renderer.dispose();
    this.renderer.domElement.remove();

    // Clear scene
    this.scene.clear();
  }

  /**
   * Handle pointer events to drive the view helper interactions
   * Using pointerup per official Three.js editor pattern
   */
  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.viewHelper || !this.viewHelperVisible) return;

    // Set the center to current controls target before handling click
    // This ensures the camera orbits around the correct point
    this.viewHelper.center.copy(this.controls.target);

    const handled = this.viewHelper.handleClick(event);
    if (handled) {
      event.stopPropagation();
      this.controls.enabled = false;
    }
  };
}
