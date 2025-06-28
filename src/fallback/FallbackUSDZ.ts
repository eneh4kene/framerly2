/**
 * FallbackUSDZ - iOS Safari USDZ AR Quick Look fallback for WebXR unsupported devices
 */

import { FrameData, NeonData, ARMode } from '@/types';

export class FallbackUSDZ {
  private static isIOSSafari(): boolean {
    const userAgent = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  }

  static isSupported(): boolean {
    return this.isIOSSafari() && 'xr' in navigator === false;
  }

  /**
   * Create USDZ file for frame artwork
   */
  static async createFrameUSDZ(frameData: FrameData): Promise<string> {
    // Generate USDZ content for a framed artwork
    const usdzContent = this.generateFrameUSDZ(frameData);
    const blob = new Blob([usdzContent], { type: 'model/vnd.usdz+zip' });
    return URL.createObjectURL(blob);
  }

  /**
   * Create USDZ file for neon sign
   */
  static async createNeonUSDZ(neonData: NeonData): Promise<string> {
    // Generate USDZ content for a neon sign
    const usdzContent = this.generateNeonUSDZ(neonData);
    const blob = new Blob([usdzContent], { type: 'model/vnd.usdz+zip' });
    return URL.createObjectURL(blob);
  }

  /**
   * Launch AR Quick Look with the generated USDZ file
   */
  static launchARQuickLook(usdzUrl: string, object: FrameData | NeonData): void {
    const anchor = document.createElement('a');
    anchor.rel = 'ar';
    anchor.href = usdzUrl;
    
    // Add metadata for AR Quick Look
    if (object.type === ARMode.FRAME) {
      const frameObj = object as FrameData;
      anchor.setAttribute('data-title', `${frameObj.frameStyle} Frame`);
      anchor.setAttribute('data-subtitle', `${frameObj.width}m x ${frameObj.height}m`);
    } else {
      const neonObj = object as NeonData;
      anchor.setAttribute('data-title', `Neon Sign: ${neonObj.text}`);
      anchor.setAttribute('data-subtitle', `${neonObj.color} glow`);
    }
    
    // Trigger AR Quick Look
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  /**
   * Generate USDZ content for frame (simplified version)
   */
  private static generateFrameUSDZ(frameData: FrameData): ArrayBuffer {
    // This is a simplified version - in production, you'd use a proper USDZ library
    // or generate actual USD content. For demo purposes, we'll create a minimal structure.
    
    const usdContent = `#usda 1.0
(
    defaultPrim = "Frame"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Frame"
{
    def Mesh "FrameMesh"
    {
        int[] faceVertexCounts = [4, 4, 4, 4, 4, 4]
        int[] faceVertexIndices = [0, 1, 3, 2, 2, 3, 5, 4, 4, 5, 7, 6, 6, 7, 1, 0, 1, 7, 5, 3, 6, 0, 2, 4]
        point3f[] points = [
            (-${frameData.width/2}, -${frameData.height/2}, 0),
            (${frameData.width/2}, -${frameData.height/2}, 0),
            (-${frameData.width/2}, ${frameData.height/2}, 0),
            (${frameData.width/2}, ${frameData.height/2}, 0),
            (-${frameData.width/2}, -${frameData.height/2}, -0.02),
            (${frameData.width/2}, -${frameData.height/2}, -0.02),
            (-${frameData.width/2}, ${frameData.height/2}, -0.02),
            (${frameData.width/2}, ${frameData.height/2}, -0.02)
        ]
        color3f[] displayColor = [(${this.hexToRgb(frameData.frameColor).join(', ')})]
    }
}`;

    // Convert to ArrayBuffer (simplified)
    const encoder = new TextEncoder();
    return encoder.encode(usdContent).buffer;
  }

  /**
   * Generate USDZ content for neon sign (simplified version)
   */
  private static generateNeonUSDZ(neonData: NeonData): ArrayBuffer {
    const usdContent = `#usda 1.0
(
    defaultPrim = "NeonSign"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "NeonSign"
{
    def Mesh "NeonMesh"
    {
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 3, 2]
        point3f[] points = [
            (-0.5, -0.1, 0),
            (0.5, -0.1, 0),
            (-0.5, 0.1, 0),
            (0.5, 0.1, 0)
        ]
        color3f[] displayColor = [(${this.hexToRgb(neonData.color).join(', ')})]
        
        # Add emissive material for glow effect
        rel material:binding = </NeonSign/NeonMaterial>
    }
    
    def Material "NeonMaterial"
    {
        token outputs:surface.connect = </NeonSign/NeonMaterial/PreviewSurface.outputs:surface>
        
        def Shader "PreviewSurface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:emissiveColor = (${this.hexToRgb(neonData.color).join(', ')})
            float inputs:metallic = 0
            float inputs:roughness = 0.1
        }
    }
}`;

    const encoder = new TextEncoder();
    return encoder.encode(usdContent).buffer;
  }

  /**
   * Convert hex color to RGB values
   */
  private static hexToRgb(hex: string): number[] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [1, 1, 1]; // Default to white
    
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ];
  }

  /**
   * Check if current device/browser should use USDZ fallback
   */
  static shouldUseFallback(): boolean {
    return this.isSupported() && !('xr' in navigator);
  }

  /**
   * Create and launch AR experience for given object
   */
  static async launchAR(object: FrameData | NeonData): Promise<void> {
    try {
      let usdzUrl: string;
      
      if (object.type === ARMode.FRAME) {
        usdzUrl = await this.createFrameUSDZ(object as FrameData);
      } else {
        usdzUrl = await this.createNeonUSDZ(object as NeonData);
      }
      
      this.launchARQuickLook(usdzUrl, object);
      
      // Clean up object URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(usdzUrl);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to launch USDZ AR:', error);
      throw new Error('AR Quick Look not available');
    }
  }
} 