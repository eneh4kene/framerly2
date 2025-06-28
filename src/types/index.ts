/**
 * Core types for Framerly AR Engine
 */

import { Vector3, Euler, Quaternion } from 'three';

export enum ARMode {
  FRAME = 'frame',
  NEON = 'neon'
}

export enum TrackingState {
  NOT_TRACKING = 'not_tracking',
  LIMITED = 'limited', 
  TRACKING = 'tracking'
}

export interface PlaneData {
  id: string;
  pose: {
    position: Vector3;
    orientation: Quaternion;
  };
  polygon: Vector3[];
  orientation: 'horizontal' | 'vertical';
  lastUpdate: number;
}

export interface ARObject {
  id: string;
  type: ARMode;
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  isPlaced: boolean;
  planeId?: string;
  lastUpdate: number;
}

export interface FrameData extends ARObject {
  type: ARMode.FRAME;
  artworkUrl: string;
  frameStyle: string;
  frameColor: string;
  matColor: string;
  width: number;
  height: number;
}

export interface NeonData extends ARObject {
  type: ARMode.NEON;
  text: string;
  color: string;
  glowIntensity: number;
  fontSize: number;
  fontFamily: string;
}

export interface AIRecommendation {
  id: string;
  type: ARMode;
  confidence: number;
  data: FrameRecommendation | NeonRecommendation;
}

export interface FrameRecommendation {
  frameStyle: string;
  frameColor: string;
  matColor: string;
  suggestedSize: { width: number; height: number };
  reasoning: string;
}

export interface NeonRecommendation {
  text: string;
  color: string;
  glowIntensity: number;
  fontSize: number;
  placement: 'wall' | 'corner' | 'ceiling';
  reasoning: string;
}

export interface PoseFilterOptions {
  positionSmoothingFactor: number;
  rotationSmoothingFactor: number;
  maxJitterThreshold: number;
  stabilizationTime: number;
}

export interface AREngineConfig {
  enablePlaneVisualization: boolean;
  maxPlanes: number;
  trackingUpdateRate: number;
  poseFilter: PoseFilterOptions;
  rendering: {
    shadowsEnabled: boolean;
    environmentLighting: boolean;
    adaptiveQuality: boolean;
  };
}

export interface WebXRSupport {
  supported: boolean;
  immersiveAr: boolean;
  hitTest: boolean;
  planeDetection: boolean;
  anchors: boolean;
}

export interface CameraPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
} 