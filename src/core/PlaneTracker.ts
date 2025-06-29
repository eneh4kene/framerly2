/**
 * PlaneTracker - Handles WebXR plane detection and hit testing for wall placement
 */

import { Vector3, Quaternion, Matrix4 } from 'three';
import { PlaneData, TrackingState, WebXRSupport } from '@/types';
import { PoseFilter } from './PoseFilter';

export class PlaneTracker {
  private xrSession?: XRSession;
  private xrRefSpace?: XRReferenceSpace;
  private hitTestSource?: XRHitTestSource;
  private planes: Map<string, PlaneData> = new Map();
  private poseFilter: PoseFilter;
  private trackingState: TrackingState = TrackingState.NOT_TRACKING;
  private onPlaneDetectedCallback?: (plane: PlaneData) => void;
  private onTrackingStateChangedCallback?: (state: TrackingState) => void;

  constructor() {
    this.poseFilter = new PoseFilter();
  }

  /**
   * Check WebXR support capabilities
   */
  static async checkWebXRSupport(): Promise<WebXRSupport> {
    if (!navigator.xr) {
      return {
        supported: false,
        immersiveAr: false,
        hitTest: false,
        planeDetection: false,
        anchors: false
      };
    }

    try {
      // Only check basic session support, don't create actual sessions
      const immersiveAr = await navigator.xr.isSessionSupported('immersive-ar');
      
      return {
        supported: true,
        immersiveAr,
        hitTest: immersiveAr, // Assume hit-test is available if AR is supported
        planeDetection: immersiveAr, // Assume plane detection is available if AR is supported
        anchors: false // Anchors are optional and not critical
      };
    } catch (error) {
      console.warn('Error checking WebXR support:', error);
      return {
        supported: false,
        immersiveAr: false,
        hitTest: false,
        planeDetection: false,
        anchors: false
      };
    }
  }

  /**
   * Initialize WebXR session with plane detection
   */
  async initializeXR(): Promise<void> {
    if (!navigator.xr) {
      throw new Error('WebXR not supported');
    }

    try {
      // Request AR session with required features
      this.xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local'],
        optionalFeatures: ['hit-test', 'plane-detection', 'anchors']
      });

      // Set up reference space
      this.xrRefSpace = await this.xrSession.requestReferenceSpace('local');

      // Initialize hit test source
      await this.initializeHitTest();

      // Set up session event handlers
      this.xrSession.addEventListener('end', this.onSessionEnd.bind(this));
      this.xrSession.addEventListener('inputsourceschange', this.onInputSourcesChange.bind(this));

      this.updateTrackingState(TrackingState.LIMITED);
      
      console.log('WebXR session initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebXR session:', error);
      throw error;
    }
  }

  /**
   * Initialize hit test for plane detection
   */
  private async initializeHitTest(): Promise<void> {
    if (!this.xrSession || !this.xrRefSpace) return;

    try {
      if (this.xrSession) {
        this.hitTestSource = await (this.xrSession as any).requestHitTestSource({
          space: this.xrRefSpace
        });
        console.log('Hit test source initialized');
      }
    } catch (error) {
      console.warn('Hit test not supported, using fallback plane detection');
    }
  }

  /**
   * Update tracking on each frame
   */
  update(frame: XRFrame, _renderer: any): void {
    if (!this.xrSession || !this.xrRefSpace) return;

    try {
      // Update plane detection
      this.updatePlaneDetection(frame);
      
      // Update hit test results
      this.updateHitTest(frame);

      // Update tracking stability
      this.updateTrackingStability();
      
    } catch (error) {
      console.warn('Error updating plane tracking:', error);
      this.updateTrackingState(TrackingState.LIMITED);
    }
  }

  /**
   * Update detected planes from WebXR
   */
  private updatePlaneDetection(frame: XRFrame): void {
    // @ts-ignore - WebXR plane detection API
    const detectedPlanes = frame.detectedPlanes;
    
    if (!detectedPlanes) return;

    detectedPlanes.forEach((xrPlane: any) => {
      const planeId = xrPlane.planeId || `plane_${Date.now()}_${Math.random()}`;
      
      // Get plane pose
      const planePose = frame.getPose(xrPlane.planeSpace, this.xrRefSpace!);
      if (!planePose) return;

      // Convert to Three.js format
      const position = new Vector3().setFromMatrixPosition(
        new Matrix4().fromArray(planePose.transform.matrix)
      );
      
      const orientation = new Quaternion().setFromRotationMatrix(
        new Matrix4().fromArray(planePose.transform.matrix)
      );

      // Apply pose filtering
      const filtered = this.poseFilter.filter(position, orientation);

      // Determine plane orientation (vertical for walls)
      const normal = new Vector3(0, 0, 1).applyQuaternion(filtered.rotation);
      const isVertical = Math.abs(normal.y) < 0.5; // Wall planes are mostly vertical

      // Create or update plane data
      const planeData: PlaneData = {
        id: planeId,
        pose: {
          position: filtered.position,
          orientation: filtered.rotation
        },
        polygon: this.extractPlanePolygon(xrPlane),
        orientation: isVertical ? 'vertical' : 'horizontal',
        lastUpdate: performance.now()
      };

      // Store plane
      const existingPlane = this.planes.get(planeId);
      if (!existingPlane) {
        this.planes.set(planeId, planeData);
        this.onPlaneDetectedCallback?.(planeData);
      } else {
        this.planes.set(planeId, planeData);
      }
    });

    // Clean up old planes
    this.cleanupOldPlanes();
  }

  /**
   * Extract polygon points from XR plane
   */
  private extractPlanePolygon(xrPlane: any): Vector3[] {
    const polygon: Vector3[] = [];
    
    if (xrPlane.polygon) {
      for (let i = 0; i < xrPlane.polygon.length; i += 2) {
        polygon.push(new Vector3(
          xrPlane.polygon[i],
          0,
          xrPlane.polygon[i + 1]
        ));
      }
    } else {
      // Fallback: create a default rectangle
      const size = 2; // 2m x 2m default
      polygon.push(
        new Vector3(-size/2, 0, -size/2),
        new Vector3(size/2, 0, -size/2),
        new Vector3(size/2, 0, size/2),
        new Vector3(-size/2, 0, size/2)
      );
    }

    return polygon;
  }

  /**
   * Update hit test results for placement
   */
  private updateHitTest(frame: XRFrame): void {
    if (!this.hitTestSource) return;

    const hitTestResults = frame.getHitTestResults(this.hitTestSource);
    
    if (hitTestResults.length > 0) {
      this.updateTrackingState(TrackingState.TRACKING);
    } else {
      this.updateTrackingState(TrackingState.LIMITED);
    }
  }

  /**
   * Perform hit test at screen coordinates
   */
  async hitTest(_x: number, _y: number, frame: XRFrame): Promise<Vector3 | null> {
    if (!this.xrSession || !this.xrRefSpace || !this.hitTestSource) {
      return null;
    }

    try {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const hitPose = hit.getPose(this.xrRefSpace);
        
        if (hitPose) {
          return new Vector3().setFromMatrixPosition(
            new Matrix4().fromArray(hitPose.transform.matrix)
          );
        }
      }
    } catch (error) {
      console.warn('Hit test failed:', error);
    }

    return null;
  }

  /**
   * Update tracking stability and state
   */
  private updateTrackingStability(): void {
    const activeePlanes = Array.from(this.planes.values()).filter(
      plane => performance.now() - plane.lastUpdate < 5000 // 5 second timeout
    );

    if (activeePlanes.length === 0) {
      this.updateTrackingState(TrackingState.NOT_TRACKING);
    } else if (activeePlanes.some(plane => plane.orientation === 'vertical')) {
      this.updateTrackingState(TrackingState.TRACKING);
    } else {
      this.updateTrackingState(TrackingState.LIMITED);
    }
  }

  /**
   * Clean up planes that haven't been updated recently
   */
  private cleanupOldPlanes(): void {
    const now = performance.now();
    const timeout = 10000; // 10 seconds

    for (const [id, plane] of this.planes.entries()) {
      if (now - plane.lastUpdate > timeout) {
        this.planes.delete(id);
      }
    }
  }

  /**
   * Update tracking state and notify listeners
   */
  private updateTrackingState(newState: TrackingState): void {
    if (this.trackingState !== newState) {
      this.trackingState = newState;
      this.onTrackingStateChangedCallback?.(newState);
    }
  }

  /**
   * Session end handler
   */
  private onSessionEnd(): void {
    this.xrSession = undefined;
    this.xrRefSpace = undefined;
    this.hitTestSource = undefined;
    this.planes.clear();
    this.updateTrackingState(TrackingState.NOT_TRACKING);
  }

  /**
   * Input sources change handler
   */
  private onInputSourcesChange(event: XRInputSourcesChangeEvent): void {
    console.log('Input sources changed:', event);
    // Handle controller input changes if needed
  }

  /**
   * Get all detected planes
   */
  getDetectedPlanes(): PlaneData[] {
    return Array.from(this.planes.values());
  }

  /**
   * Get tracking state
   */
  getTrackingState(): TrackingState {
    return this.trackingState;
  }

  /**
   * Set callback for plane detection
   */
  onPlaneDetected(callback: (plane: PlaneData) => void): void {
    this.onPlaneDetectedCallback = callback;
  }

  /**
   * Set callback for tracking state changes
   */
  onTrackingStateChanged(callback: (state: TrackingState) => void): void {
    this.onTrackingStateChangedCallback = callback;
  }

  /**
   * End XR session
   */
  async endSession(): Promise<void> {
    if (this.xrSession) {
      await this.xrSession.end();
    }
  }

  /**
   * Get XR session
   */
  getXRSession(): XRSession | undefined {
    return this.xrSession;
  }

  /**
   * Get reference space
   */
  getReferenceSpace(): XRReferenceSpace | undefined {
    return this.xrRefSpace;
  }
} 