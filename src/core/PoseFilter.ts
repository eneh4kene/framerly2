/**
 * PoseFilter - Smooths tracking data to reduce jitter and provide stable AR placement
 */

import { Vector3, Quaternion } from 'three';
import { PoseFilterOptions } from '@/types';

export class PoseFilter {
  private options: PoseFilterOptions;
  private lastPosition?: Vector3;
  private lastRotation?: Quaternion;
  private velocityHistory: Vector3[] = [];
  private stabilizationStartTime?: number;
  private isStable = false;

  constructor(options: Partial<PoseFilterOptions> = {}) {
    this.options = {
      positionSmoothingFactor: 0.8,
      rotationSmoothingFactor: 0.9,
      maxJitterThreshold: 0.01, // meters
      stabilizationTime: 1000, // ms
      ...options
    };
  }

  /**
   * Apply smoothing filter to position and rotation
   */
  filter(position: Vector3, rotation: Quaternion): { position: Vector3; rotation: Quaternion; isStable: boolean } {
    const now = performance.now();
    
    // Initialize on first call
    if (!this.lastPosition || !this.lastRotation) {
      this.lastPosition = position.clone();
      this.lastRotation = rotation.clone();
      this.stabilizationStartTime = now;
      return {
        position: position.clone(),
        rotation: rotation.clone(),
        isStable: false
      };
    }

    // Calculate movement delta
    const positionDelta = position.distanceTo(this.lastPosition);
    this.updateVelocityHistory(positionDelta);

    // Apply exponential smoothing
    const smoothedPosition = this.smoothPosition(position);
    const smoothedRotation = this.smoothRotation(rotation);

    // Update stability state
    this.updateStabilityState(positionDelta, now);

    // Store for next frame
    this.lastPosition = smoothedPosition.clone();
    this.lastRotation = smoothedRotation.clone();

    return {
      position: smoothedPosition,
      rotation: smoothedRotation,
      isStable: this.isStable
    };
  }

  /**
   * Apply exponential smoothing to position
   */
  private smoothPosition(newPosition: Vector3): Vector3 {
    if (!this.lastPosition) return newPosition.clone();

    const factor = this.options.positionSmoothingFactor;
    return new Vector3(
      this.lastPosition.x * factor + newPosition.x * (1 - factor),
      this.lastPosition.y * factor + newPosition.y * (1 - factor),
      this.lastPosition.z * factor + newPosition.z * (1 - factor)
    );
  }

  /**
   * Apply spherical linear interpolation to rotation
   */
  private smoothRotation(newRotation: Quaternion): Quaternion {
    if (!this.lastRotation) return newRotation.clone();

    const smoothed = new Quaternion();
    const factor = this.options.rotationSmoothingFactor;
    
    return smoothed.slerpQuaternions(newRotation, this.lastRotation, factor);
  }

  /**
   * Track velocity for jitter detection
   */
  private updateVelocityHistory(delta: number): void {
    this.velocityHistory.push(new Vector3(delta, 0, 0));
    
    // Keep only recent history (last 10 frames)
    if (this.velocityHistory.length > 10) {
      this.velocityHistory.shift();
    }
  }

  /**
   * Determine if tracking is stable
   */
  private updateStabilityState(positionDelta: number, currentTime: number): void {
    // Check if movement is below jitter threshold
    const isLowJitter = positionDelta < this.options.maxJitterThreshold;
    
    // Calculate average velocity over recent history
    const avgVelocity = this.velocityHistory.reduce((sum, v) => sum + v.x, 0) / this.velocityHistory.length;
    const isLowVelocity = avgVelocity < this.options.maxJitterThreshold;

    if (isLowJitter && isLowVelocity) {
      if (!this.stabilizationStartTime) {
        this.stabilizationStartTime = currentTime;
      }
      
      // Check if we've been stable long enough
      const stabilizationDuration = currentTime - this.stabilizationStartTime;
      this.isStable = stabilizationDuration >= this.options.stabilizationTime;
    } else {
      this.stabilizationStartTime = undefined;
      this.isStable = false;
    }
  }

  /**
   * Reset filter state
   */
  reset(): void {
    this.lastPosition = undefined;
    this.lastRotation = undefined;
    this.velocityHistory = [];
    this.stabilizationStartTime = undefined;
    this.isStable = false;
  }

  /**
   * Get current stability state
   */
  getStabilityState(): boolean {
    return this.isStable;
  }

  /**
   * Update filter options
   */
  updateOptions(options: Partial<PoseFilterOptions>): void {
    this.options = { ...this.options, ...options };
  }
} 