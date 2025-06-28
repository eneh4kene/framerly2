/**
 * FramerlyAREngine - Main AR engine orchestrating all components
 */

import { Vector3, Euler } from 'three';
import { PlaneTracker } from './PlaneTracker';
import { Renderer } from './Renderer';
import { AIConnector } from './AIConnector';
import { 
  ARMode, 
  FrameData, 
  NeonData, 
  AREngineConfig,
  TrackingState,
  PlaneData,
  WebXRSupport,
  CameraPermissionState
} from '@/types';

export class FramerlyAREngine {
  private planeTracker: PlaneTracker;
  private renderer: Renderer;
  private aiConnector: AIConnector;
  private config: AREngineConfig;
  
  private currentMode: ARMode = ARMode.FRAME;
  private isInitialized = false;
  private isRunning = false;
  private arObjects: Map<string, FrameData | NeonData> = new Map();
  
  // Event callbacks
  private onTrackingStateCallback?: (state: TrackingState) => void;
  private onPlaneDetectedCallback?: (plane: PlaneData) => void;
  private onObjectPlacedCallback?: (object: FrameData | NeonData) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(canvas: HTMLCanvasElement, config: Partial<AREngineConfig> = {}) {
    // Setup default configuration
    this.config = {
      enablePlaneVisualization: true,
      maxPlanes: 10,
      trackingUpdateRate: 60,
      poseFilter: {
        positionSmoothingFactor: 0.8,
        rotationSmoothingFactor: 0.9,
        maxJitterThreshold: 0.01,
        stabilizationTime: 1000
      },
      rendering: {
        shadowsEnabled: true,
        environmentLighting: true,
        adaptiveQuality: true
      },
      ...config
    };

    // Initialize core components
    this.planeTracker = new PlaneTracker();
    this.renderer = new Renderer(canvas, this.config);
    this.aiConnector = new AIConnector();

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Check device capabilities and WebXR support
   */
  static async checkSupport(): Promise<WebXRSupport> {
    return await PlaneTracker.checkWebXRSupport();
  }

  /**
   * Initialize the AR engine
   */
  async initialize(): Promise<void> {
    try {
      // Check camera permissions
      await this.requestCameraPermissions();
      
      // Check WebXR support
      const support = await FramerlyAREngine.checkSupport();
      if (!support.immersiveAr) {
        throw new Error('WebXR AR not supported on this device');
      }

      // Initialize plane tracker
      await this.planeTracker.initializeXR();
      
      this.isInitialized = true;
      console.log('Framerly AR Engine initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize AR engine:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  /**
   * Start the AR session
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AR engine not initialized. Call initialize() first.');
    }

    try {
      this.isRunning = true;
      this.startRenderLoop();
      console.log('AR session started');
      
    } catch (error) {
      console.error('Failed to start AR session:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop the AR session
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.planeTracker.endSession();
    console.log('AR session stopped');
  }

  /**
   * Switch between frame and neon modes
   */
  setMode(mode: ARMode): void {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      console.log(`Switched to ${mode} mode`);
    }
  }

  /**
   * Get current AR mode
   */
  getMode(): ARMode {
    return this.currentMode;
  }

  /**
   * Place an AR object at the specified position
   */
  async placeObject(position: Vector3, rotation?: Euler): Promise<string> {
    const objectId = `${this.currentMode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (this.currentMode === ARMode.FRAME) {
        const frameData = await this.createFrameData(objectId, position, rotation);
        this.arObjects.set(objectId, frameData);
        this.renderer.createFrame(frameData);
        this.onObjectPlacedCallback?.(frameData);
      } else {
        const neonData = await this.createNeonData(objectId, position, rotation);
        this.arObjects.set(objectId, neonData);
        this.renderer.createNeonSign(neonData);
        this.onObjectPlacedCallback?.(neonData);
      }
      
      return objectId;
    } catch (error) {
      console.error('Failed to place object:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  /**
   * Update an existing AR object
   */
  updateObject(objectId: string, updates: Partial<FrameData | NeonData>): void {
    const object = this.arObjects.get(objectId);
    if (!object) {
      throw new Error(`Object with ID ${objectId} not found`);
    }

    const updatedObject = { ...object, ...updates } as FrameData | NeonData;
    this.arObjects.set(objectId, updatedObject);

    if (object.type === ARMode.FRAME) {
      this.renderer.updateFrame(updatedObject as FrameData);
    } else {
      this.renderer.updateNeon(updatedObject as NeonData);
    }
  }

  /**
   * Remove an AR object
   */
  removeObject(objectId: string): void {
    const object = this.arObjects.get(objectId);
    if (object) {
      this.renderer.removeObject(objectId, object.type);
      this.arObjects.delete(objectId);
    }
  }

  /**
   * Get frame recommendations from AI
   */
  async getFrameRecommendations(artworkUrl: string): Promise<any[]> {
    return await this.aiConnector.getFrameRecommendations(artworkUrl);
  }

  /**
   * Get neon sign recommendations from AI
   */
  async getNeonRecommendations(context: string): Promise<any[]> {
    return await this.aiConnector.getNeonRecommendations(context);
  }

  /**
   * Handle tap/click for object placement
   */
  async handleTap(x: number, y: number): Promise<string | null> {
    const session = this.planeTracker.getXRSession();
    if (!session) return null;

    try {
      // Get current frame
      const frame = session.requestAnimationFrame(() => {});
      
      // Perform hit test
      const hitPosition = await this.planeTracker.hitTest(x, y, frame as any);
      if (hitPosition) {
        return await this.placeObject(hitPosition);
      }
      
      return null;
    } catch (error) {
      console.warn('Hit test failed:', error);
      return null;
    }
  }

  /**
   * Get all placed objects
   */
  getPlacedObjects(): (FrameData | NeonData)[] {
    return Array.from(this.arObjects.values());
  }

  /**
   * Get detected planes
   */
  getDetectedPlanes(): PlaneData[] {
    return this.planeTracker.getDetectedPlanes();
  }

  /**
   * Get current tracking state
   */
  getTrackingState(): TrackingState {
    return this.planeTracker.getTrackingState();
  }

  /**
   * Request camera permissions
   */
  private async requestCameraPermissions(): Promise<CameraPermissionState> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop the stream immediately (we just needed permission)
      stream.getTracks().forEach(track => track.stop());
      
      return { granted: true, denied: false, prompt: false };
    } catch (error) {
      console.warn('Camera permission denied:', error);
      return { granted: false, denied: true, prompt: false };
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.planeTracker.onTrackingStateChanged((state) => {
      this.onTrackingStateCallback?.(state);
    });

    this.planeTracker.onPlaneDetected((plane) => {
      this.onPlaneDetectedCallback?.(plane);
    });
  }

  /**
   * Create frame data with AI recommendations
   */
  private async createFrameData(
    id: string, 
    position: Vector3, 
    rotation?: Euler
  ): Promise<FrameData> {
    // Get AI recommendations (fallback to defaults)
    const recommendations = await this.aiConnector.getFrameRecommendations(
      'https://example.com/sample-artwork.jpg'
    );
    
    const recommendation = recommendations[0] || {
      frameStyle: 'modern',
      frameColor: '#000000',
      matColor: '#ffffff',
      suggestedSize: { width: 0.4, height: 0.6 }
    };

    return {
      id,
      type: ARMode.FRAME,
      position: position.clone(),
      rotation: rotation ? rotation.clone() : new Euler(0, 0, 0),
      scale: new Vector3(1, 1, 1),
      isPlaced: true,
      lastUpdate: Date.now(),
      artworkUrl: 'https://example.com/sample-artwork.jpg',
      frameStyle: recommendation.frameStyle,
      frameColor: recommendation.frameColor,
      matColor: recommendation.matColor,
      width: recommendation.suggestedSize.width,
      height: recommendation.suggestedSize.height
    };
  }

  /**
   * Create neon data with AI recommendations
   */
  private async createNeonData(
    id: string, 
    position: Vector3, 
    rotation?: Euler
  ): Promise<NeonData> {
    // Get AI recommendations (fallback to defaults)
    const recommendations = await this.aiConnector.getNeonRecommendations('welcome');
    
    const recommendation = recommendations[0] || {
      text: 'Welcome',
      color: '#00FFFF',
      glowIntensity: 2.0,
      fontSize: 48
    };

    return {
      id,
      type: ARMode.NEON,
      position: position.clone(),
      rotation: rotation ? rotation.clone() : new Euler(0, 0, 0),
      scale: new Vector3(1, 1, 1),
      isPlaced: true,
      lastUpdate: Date.now(),
      text: recommendation.text,
      color: recommendation.color,
      glowIntensity: recommendation.glowIntensity,
      fontSize: recommendation.fontSize,
      fontFamily: 'Arial, sans-serif'
    };
  }

  /**
   * Main render loop
   */
  private startRenderLoop(): void {
    const animate = () => {
      if (!this.isRunning) return;

      const session = this.planeTracker.getXRSession();
      if (session) {
        session.requestAnimationFrame((_time, frame) => {
          // Update plane tracking
          this.planeTracker.update(frame, this.renderer);
          
          // Render scene
          this.renderer.render();
          
          animate();
        });
      } else {
        // Fallback for non-AR mode
        this.renderer.render();
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // Event listener setters
  onTrackingStateChanged(callback: (state: TrackingState) => void): void {
    this.onTrackingStateCallback = callback;
  }

  onPlaneDetected(callback: (plane: PlaneData) => void): void {
    this.onPlaneDetectedCallback = callback;
  }

  onObjectPlaced(callback: (object: FrameData | NeonData) => void): void {
    this.onObjectPlacedCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Dispose resources and cleanup
   */
  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.arObjects.clear();
    console.log('AR engine disposed');
  }
} 