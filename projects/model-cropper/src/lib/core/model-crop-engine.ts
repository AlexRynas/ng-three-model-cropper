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

import {
  CropBoxConfig,
  MeshTransformConfig,
  ModelCropEngineConfig,
  CropResult,
  LoadingState,
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

  // State
  private currentCropBox: CropBoxConfig = DEFAULT_CROP_BOX;
  private currentTransform: MeshTransformConfig = DEFAULT_MESH_TRANSFORM;
  private loadingState: LoadingState = 'idle';
  private boxVisible = true;

  // Animation
  private animationFrameId: number | null = null;
  private isDisposed = false;

  // Host element
  private hostElement: HTMLElement;

  // Callbacks for state changes
  private onLoadingStateChange?: StateChangeCallback<LoadingState>;
  private onError?: StateChangeCallback<string>;

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
    hostElement.appendChild(this.renderer.domElement);

    // Create controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Setup lighting
    this.setupLighting();

    // Setup resize observer
    this.setupResizeObserver();

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Set callbacks for state changes
   */
  setCallbacks(callbacks: {
    onLoadingStateChange?: StateChangeCallback<LoadingState>;
    onError?: StateChangeCallback<string>;
  }): void {
    this.onLoadingStateChange = callbacks.onLoadingStateChange;
    this.onError = callbacks.onError;
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

      this.animationFrameId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Load a 3D model from URL
   */
  async loadModel(srcUrl: string): Promise<THREE.Object3D> {
    this.setLoadingState('loading');

    try {
      // Remove existing model
      if (this.loadedModel) {
        this.scene.remove(this.loadedModel);
        this.disposeObject(this.loadedModel);
        this.loadedModel = null;
      }

      const fileType = getModelFileType(srcUrl);
      let model: THREE.Object3D;

      switch (fileType) {
        case 'glb':
        case 'gltf':
          model = await this.loadGLTF(srcUrl);
          break;
        case 'fbx':
          model = await this.loadFBX(srcUrl);
          break;
        default:
          throw new Error(`Unsupported file type: ${srcUrl}`);
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
    }
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
        undefined,
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
        undefined,
        (error) => reject(error)
      );
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

    // Center model
    model.position.sub(center);

    // Position camera
    this.camera.position.set(cameraDistance, cameraDistance, cameraDistance);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Update default crop box based on model size
    const padding = 0.1;
    this.currentCropBox = {
      minX: -size.x / 2 - padding,
      minY: -size.y / 2 - padding,
      minZ: -size.z / 2 - padding,
      maxX: size.x / 2 + padding,
      maxY: size.y / 2 + padding,
      maxZ: size.z / 2 + padding,
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
      color: 0x00ff00,
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
    this.cropBoxHelper = new THREE.Box3Helper(box3, new THREE.Color(0x00ff00));
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

    // Dispose renderer
    this.renderer.dispose();
    this.renderer.domElement.remove();

    // Clear scene
    this.scene.clear();
  }
}
