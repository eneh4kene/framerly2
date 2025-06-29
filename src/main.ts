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

// Track current mode even without AR engine
let currentMode: ARMode = ARMode.FRAME;

/**
 * Initialize the AR engine and UI
 */
async function init() {
  // Always setup UI handlers first
  setupBasicUIEventHandlers();

  try {
    showLoading('Checking AR support...');
    
    // Check WebXR support with detailed logging
    const support = await FramerlyAREngine.checkSupport();
    console.log('WebXR Support Check Results:', support);
    console.log('User Agent:', navigator.userAgent);
    console.log('Navigator XR:', !!navigator.xr);
    
    if (!support.supported) {
      throw new Error('Browser does not support WebXR');
    }
    
    if (!support.immersiveAr) {
      console.log('Initial support check failed, but trying AR initialization anyway...');
      // Don't throw error immediately - try initialization first
    }

    showLoading('Initializing AR engine...');
    
    // Initialize AR engine
    arEngine = new FramerlyAREngine(canvas);
    
    // Setup AR engine callbacks
    setupAREngineCallbacks();
    
    // Try to initialize - this will throw if AR really isn't supported
    showLoading('Requesting camera permissions...');
    await arEngine.initialize();
    
    showLoading('Starting AR session...');
    
    // Start AR session
    await arEngine.start();
    
    // Setup AR-specific event handlers (pause/resume)
    setupAREventHandlers();
    
    hideLoading();
    updateStatus('AR Ready - Tap to place objects');
    
  } catch (error) {
    console.error('AR initialization failed:', error);
    const errorMessage = (error as Error).message;
    
    // Show error with retry option for mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      showError(`AR setup failed: ${errorMessage}. Try manually enabling AR below.`);
      showManualARButton();
    } else {
      showError(`AR not available: ${errorMessage}`);
    }
    
    // Fallback to 3D preview mode
    initFallbackMode();
  }
}

/**
 * Handle canvas click for object placement
 */
async function handleCanvasClick(x: number, y: number) {
  if (arEngine) {
    // AR mode - use hit testing
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
  } else {
    // Fallback mode - simulate object placement
    const currentMode = getCurrentMode();
    updateStatus(`${currentMode} placed in preview mode at (${Math.round(x)}, ${Math.round(y)})`);
    console.log('Preview mode placement:', { mode: currentMode, x, y });
    
    // Add visual feedback
    setTimeout(() => {
      updateStatus(`${currentMode} mode - Preview only (AR not available)`);
    }, 2000);
  }
}

/**
 * Setup AR engine event handlers
 */
function setupAREngineCallbacks() {
  if (!arEngine) return;
  
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
 * Setup basic UI event handlers (always available)
 */
function setupBasicUIEventHandlers() {
  // Mode toggle buttons
  frameModeBtn.addEventListener('click', () => {
    setMode(ARMode.FRAME);
  });
  
  neonModeBtn.addEventListener('click', () => {
    setMode(ARMode.NEON);
  });
  
  // Canvas tap for placement
  canvas.addEventListener('click', async (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    await handleCanvasClick(x, y);
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    // Canvas resize is handled by the renderer
  });
}

/**
 * Setup AR-specific event handlers
 */
function setupAREventHandlers() {
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
  // Update global mode tracking
  currentMode = mode;
  
  // Set AR engine mode if available
  if (arEngine) {
    arEngine.setMode(mode);
  }
  
  // Always update UI
  if (mode === ARMode.FRAME) {
    frameModeBtn.classList.add('active');
    neonModeBtn.classList.remove('active');
    const message = arEngine ? 'Frame mode - Tap to place artwork' : 'Frame mode - Preview only (AR not available)';
    updateStatus(message);
  } else {
    neonModeBtn.classList.add('active');
    frameModeBtn.classList.remove('active');
    const message = arEngine ? 'Neon mode - Tap to place neon sign' : 'Neon mode - Preview only (AR not available)';
    updateStatus(message);
  }
}

/**
 * Get current mode
 */
function getCurrentMode(): string {
  return currentMode === ARMode.FRAME ? 'Frame' : 'Neon';
}

/**
 * Set fallback mode (when AR is not available)
 */
function setFallbackMode(mode: ARMode) {
  console.log('Setting fallback mode:', mode);
  setMode(mode);
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
    
    // Auto-hide after 10 seconds (longer for manual AR button)
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 10000);
  }
}

/**
 * Show manual AR enable button for mobile devices
 */
function showManualARButton() {
  // Create a "Try AR" button for mobile users
  const tryARBtn = document.createElement('button');
  tryARBtn.textContent = '🔄 Try AR Again';
  tryARBtn.style.cssText = `
    position: fixed;
    top: 120px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: #ff6b35;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    z-index: 1000;
  `;
  
  tryARBtn.addEventListener('click', async () => {
    tryARBtn.remove();
    console.log('Manual AR initialization attempt...');
    
    // Try to initialize AR again with user gesture
    try {
      showLoading('Attempting AR initialization...');
      
      arEngine = new FramerlyAREngine(canvas);
      setupAREngineCallbacks();
      await arEngine.initialize();
      await arEngine.start();
      setupAREventHandlers();
      
      hideLoading();
      updateStatus('AR Ready - Tap to place objects');
    } catch (error) {
      console.error('Manual AR initialization failed:', error);
      showError('AR still not available. Using preview mode.');
      hideLoading();
    }
  });
  
  document.body.appendChild(tryARBtn);
  
  // Remove button after 15 seconds
  setTimeout(() => {
    if (tryARBtn.parentNode) {
      tryARBtn.remove();
    }
  }, 15000);
}

/**
 * Initialize fallback mode for devices without AR support
 */
function initFallbackMode() {
  hideLoading();
  updateStatus('AR not available - Using 3D preview mode');
  
  // For fallback mode, we don't need AR engine initialization
  // The UI handlers are already set up and will work in preview mode
  updateStatus('3D Preview mode - Click buttons to switch modes');
  
  // Set default mode
  setFallbackMode(ARMode.FRAME);
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