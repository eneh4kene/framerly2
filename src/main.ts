/**
 * Main entry point for Framerly AR Engine
 */

import { FramerlyAREngine } from './core/FramerlyAREngine';
import { ARMode, TrackingState } from './types';

// UI elements
const statusText = document.getElementById('status-text') as HTMLElement;
const trackingStatus = document.getElementById('tracking-status') as HTMLElement;
const frameModeBtn = document.getElementById('frame-mode-btn') as HTMLButtonElement;
const neonModeBtn = document.getElementById('neon-mode-btn') as HTMLButtonElement;
const loadingEl = document.getElementById('loading') as HTMLElement;
const errorEl = document.getElementById('error-message') as HTMLElement;
const canvas = document.getElementById('renderer') as HTMLCanvasElement;

// Global AR engine instance
let arEngine: FramerlyAREngine;

/**
 * Initialize the AR engine and UI
 */
async function init() {
  try {
    showLoading('Checking AR support...');
    
    // Check WebXR support
    const support = await FramerlyAREngine.checkSupport();
    
    if (!support.supported) {
      throw new Error('WebXR is not supported on this device');
    }
    
    if (!support.immersiveAr) {
      throw new Error('AR mode is not supported on this device');
    }

    showLoading('Initializing AR engine...');
    
    // Initialize AR engine
    arEngine = new FramerlyAREngine(canvas);
    
    // Setup event handlers
    setupAREventHandlers();
    setupUIEventHandlers();
    
    // Initialize the engine
    await arEngine.initialize();
    
    showLoading('Starting AR session...');
    
    // Start AR session
    await arEngine.start();
    
    hideLoading();
    updateStatus('AR Ready - Tap to place objects');
    
  } catch (error) {
    console.error('Initialization failed:', error);
    showError(`Failed to initialize AR: ${(error as Error).message}`);
    
    // Fallback: try to show a basic 3D preview mode
    initFallbackMode();
  }
}

/**
 * Setup AR engine event handlers
 */
function setupAREventHandlers() {
  arEngine.onTrackingStateChanged((state: TrackingState) => {
    updateTrackingStatus(state);
  });
  
  arEngine.onPlaneDetected((plane) => {
    console.log('Plane detected:', plane);
    updateStatus('Wall detected - Tap to place');
  });
  
  arEngine.onObjectPlaced((object) => {
    console.log('Object placed:', object);
    updateStatus(`${object.type} placed successfully`);
  });
  
  arEngine.onError((error) => {
    console.error('AR Engine error:', error);
    showError(`AR Error: ${error.message}`);
  });
}

/**
 * Setup UI event handlers
 */
function setupUIEventHandlers() {
  // Mode toggle buttons
  frameModeBtn.addEventListener('click', () => {
    setMode(ARMode.FRAME);
  });
  
  neonModeBtn.addEventListener('click', () => {
    setMode(ARMode.NEON);
  });
  
  // Canvas tap for placement
  canvas.addEventListener('click', async (event) => {
    if (!arEngine) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    try {
      const objectId = await arEngine.handleTap(x, y);
      if (objectId) {
        console.log('Object placed with ID:', objectId);
      } else {
        updateStatus('No surface detected - try moving around');
      }
    } catch (error) {
      console.warn('Placement failed:', error);
      updateStatus('Placement failed - try again');
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    // Canvas resize is handled by the renderer
  });
  
  // Handle visibility change (pause/resume AR)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // App went to background
      pauseAR();
    } else {
      // App came back to foreground
      resumeAR();
    }
  });
}

/**
 * Set AR mode (frame or neon)
 */
function setMode(mode: ARMode) {
  if (!arEngine) return;
  
  arEngine.setMode(mode);
  
  // Update UI
  if (mode === ARMode.FRAME) {
    frameModeBtn.classList.add('active');
    neonModeBtn.classList.remove('active');
    updateStatus('Frame mode - Tap to place artwork');
  } else {
    neonModeBtn.classList.add('active');
    frameModeBtn.classList.remove('active');
    updateStatus('Neon mode - Tap to place neon sign');
  }
}

/**
 * Update status text
 */
function updateStatus(message: string) {
  if (statusText) {
    statusText.textContent = message;
  }
}

/**
 * Update tracking status
 */
function updateTrackingStatus(state: TrackingState) {
  if (!trackingStatus) return;
  
  let message = '';
  let className = '';
  
  switch (state) {
    case TrackingState.NOT_TRACKING:
      message = 'Tracking: Not tracking';
      className = 'error';
      break;
    case TrackingState.LIMITED:
      message = 'Tracking: Limited';
      className = 'warning';  
      break;
    case TrackingState.TRACKING:
      message = 'Tracking: Good';
      className = 'success';
      break;
  }
  
  trackingStatus.textContent = message;
  trackingStatus.className = className;
}

/**
 * Show loading screen
 */
function showLoading(message?: string) {
  if (loadingEl) {
    loadingEl.style.display = 'block';
    if (message) {
      const messageEl = loadingEl.querySelector('div:last-child');
      if (messageEl) messageEl.textContent = message;
    }
  }
}

/**
 * Hide loading screen
 */
function hideLoading() {
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

/**
 * Show error message
 */
function showError(message: string) {
  hideLoading();
  
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

/**
 * Initialize fallback mode for devices without AR support
 */
function initFallbackMode() {
  hideLoading();
  updateStatus('AR not available - Using 3D preview mode');
  
  // Initialize basic 3D renderer without AR
  try {
    arEngine = new FramerlyAREngine(canvas, {
      rendering: {
        shadowsEnabled: false,
        environmentLighting: false,
        adaptiveQuality: true
      }
    });
    
    setupUIEventHandlers();
    updateStatus('3D Preview mode - Click to place objects');
    
  } catch (error) {
    showError('Failed to initialize 3D preview mode');
  }
}

/**
 * Pause AR session (when app goes to background)
 */
function pauseAR() {
  if (arEngine) {
    arEngine.stop().catch(console.warn);
  }
}

/**
 * Resume AR session (when app comes back to foreground)
 */
function resumeAR() {
  if (arEngine) {
    arEngine.start().catch(console.warn);
  }
}

/**
 * Debug function to get AR engine state
 */
function getARState() {
  if (!arEngine) return null;
  
  return {
    mode: arEngine.getMode(),
    trackingState: arEngine.getTrackingState(),
    placedObjects: arEngine.getPlacedObjects(),
    detectedPlanes: arEngine.getDetectedPlanes()
  };
}

// Make debug function available globally
(window as any).getARState = getARState;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle app cleanup
window.addEventListener('beforeunload', () => {
  if (arEngine) {
    arEngine.dispose();
  }
}); 