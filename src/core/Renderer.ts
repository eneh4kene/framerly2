/**
 * Renderer - Main rendering engine for frames and neon signs with PBR and custom shaders
 */

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  Group,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  ShaderMaterial,
  Texture,
  TextureLoader,
  CanvasTexture,
  Vector3,
  Color,
  PMREMGenerator,
  sRGBEncoding,
  ACESFilmicToneMapping
} from 'three';

import { ARMode, FrameData, NeonData, AREngineConfig } from '../types';
import { 
  neonVertexShader, 
  neonFragmentShader, 
  neonHaloVertexShader, 
  neonHaloFragmentShader,
  neonPresets 
} from '../shaders/neonGlow';

export class Renderer {
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: PerspectiveCamera;
  private frameObjects: Map<string, Group> = new Map();
  private neonObjects: Map<string, Group> = new Map();
  private textureLoader: TextureLoader;
  private pmremGenerator: PMREMGenerator;
  private config: AREngineConfig;
  private clock = { getElapsedTime: () => performance.now() / 1000 };

  constructor(canvas: HTMLCanvasElement, config: AREngineConfig) {
    this.config = config;
    
    // Initialize WebGL renderer
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    if (config.rendering.shadowsEnabled) {
      this.renderer.shadowMap.enabled = true;
    }

    // Initialize scene
    this.scene = new Scene();
    
    // Initialize camera
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    
    // Initialize lighting
    this.setupLighting();
    
    // Initialize utilities
    this.textureLoader = new TextureLoader();
    this.pmremGenerator = new PMREMGenerator(this.renderer);
    
    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  /**
   * Set up realistic lighting for AR
   */
  private setupLighting(): void {
    // Ambient light for base illumination
    const ambientLight = new AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main directional light (simulates sun/room lighting)
    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    
    if (this.config.rendering.shadowsEnabled) {
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
    }
    
    this.scene.add(directionalLight);
  }

  /**
   * Create frame object with PBR materials
   */
  createFrame(frameData: FrameData): Group {
    const frameGroup = new Group();
    
    // Create artwork plane
    const artworkGeometry = new PlaneGeometry(frameData.width, frameData.height);
    const artworkMaterial = new MeshStandardMaterial();
    
    // Load artwork texture
    this.loadTexture(frameData.artworkUrl).then(texture => {
      artworkMaterial.map = texture;
      artworkMaterial.needsUpdate = true;
    });
    
    const artworkMesh = new Mesh(artworkGeometry, artworkMaterial);
    artworkMesh.position.z = 0.01; // Slightly forward to avoid z-fighting
    frameGroup.add(artworkMesh);

    // Create frame border
    const frameThickness = 0.03;
    const frameDepth = 0.02;
    
    // Frame pieces (top, bottom, left, right)
    const framePieces = [
      // Top
      new BoxGeometry(frameData.width + frameThickness * 2, frameThickness, frameDepth),
      // Bottom  
      new BoxGeometry(frameData.width + frameThickness * 2, frameThickness, frameDepth),
      // Left
      new BoxGeometry(frameThickness, frameData.height, frameDepth),
      // Right
      new BoxGeometry(frameThickness, frameData.height, frameDepth)
    ];

    const framePositions = [
      new Vector3(0, frameData.height / 2 + frameThickness / 2, -frameDepth / 2),
      new Vector3(0, -frameData.height / 2 - frameThickness / 2, -frameDepth / 2),
      new Vector3(-frameData.width / 2 - frameThickness / 2, 0, -frameDepth / 2),
      new Vector3(frameData.width / 2 + frameThickness / 2, 0, -frameDepth / 2)
    ];

    // Create frame material with PBR
    const frameMaterial = new MeshPhysicalMaterial({
      color: new Color(frameData.frameColor),
      metalness: 0.1,
      roughness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });

    framePieces.forEach((geometry, index) => {
      const framePiece = new Mesh(geometry, frameMaterial);
      framePiece.position.copy(framePositions[index]);
      framePiece.castShadow = this.config.rendering.shadowsEnabled;
      framePiece.receiveShadow = this.config.rendering.shadowsEnabled;
      frameGroup.add(framePiece);
    });

    // Add mat if specified
    if (frameData.matColor && frameData.matColor !== 'none') {
      const matBorder = 0.05;
      const matGeometry = new PlaneGeometry(
        frameData.width - matBorder,
        frameData.height - matBorder
      );
      
      const matMaterial = new MeshStandardMaterial({
        color: new Color(frameData.matColor),
        roughness: 0.8,
        metalness: 0.0
      });
      
      const matMesh = new Mesh(matGeometry, matMaterial);
      matMesh.position.z = 0.005;
      frameGroup.add(matMesh);
    }

    // Set position and rotation from frame data
    frameGroup.position.copy(frameData.position);
    frameGroup.rotation.copy(frameData.rotation);
    frameGroup.scale.copy(frameData.scale);

    this.scene.add(frameGroup);
    this.frameObjects.set(frameData.id, frameGroup);

    return frameGroup;
  }

  /**
   * Create neon sign with custom glow shaders
   */
  createNeonSign(neonData: NeonData): Group {
    const neonGroup = new Group();
    
    // Create text geometry (for simplicity, using a plane with canvas texture)
    const textCanvas = this.createTextCanvas(neonData.text, neonData.fontSize, neonData.fontFamily);
    const textTexture = new CanvasTexture(textCanvas);
    
    const textGeometry = new PlaneGeometry(
      textCanvas.width / 100, // Scale down
      textCanvas.height / 100
    );

    // Get neon preset or create custom
    const preset = neonPresets.classic; // Default, could be determined by neonData.color
    
    // Create main neon material
    const neonMaterial = new ShaderMaterial({
      vertexShader: neonVertexShader,
      fragmentShader: neonFragmentShader,
      uniforms: {
        glowColor: { value: new Color(neonData.color) },
        glowIntensity: { value: neonData.glowIntensity },
        time: { value: 0 },
        opacity: { value: 1.0 },
        rimPower: { value: preset.rimPower },
        pulseSpeed: { value: preset.pulseSpeed },
        pulseAmount: { value: preset.pulseAmount },
        cameraPosition: { value: this.camera.position },
        textTexture: { value: textTexture }
      },
      transparent: true,
      depthWrite: false
    });

    const neonMesh = new Mesh(textGeometry, neonMaterial);
    neonGroup.add(neonMesh);

    // Create halo effect
    const haloMaterial = new ShaderMaterial({
      vertexShader: neonHaloVertexShader,
      fragmentShader: neonHaloFragmentShader,
      uniforms: {
        glowColor: { value: new Color(neonData.color) },
        glowIntensity: { value: neonData.glowIntensity * 0.5 },
        time: { value: 0 },
        haloOpacity: { value: preset.haloOpacity },
        haloSize: { value: preset.haloSize },
        cameraPosition: { value: this.camera.position }
      },
      transparent: true,
      depthWrite: false
    });

    const haloGeometry = new PlaneGeometry(
      textCanvas.width / 80, // Slightly larger for halo
      textCanvas.height / 80
    );
    
    const haloMesh = new Mesh(haloGeometry, haloMaterial);
    haloMesh.position.z = -0.01; // Behind main neon
    neonGroup.add(haloMesh);

    // Set position and rotation from neon data
    neonGroup.position.copy(neonData.position);
    neonGroup.rotation.copy(neonData.rotation);
    neonGroup.scale.copy(neonData.scale);

    this.scene.add(neonGroup);
    this.neonObjects.set(neonData.id, neonGroup);

    return neonGroup;
  }

  /**
   * Create text canvas for neon signs
   */
  private createTextCanvas(text: string, fontSize: number, fontFamily: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Set font
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    // Measure text
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    const height = fontSize * 1.2; // Add some padding
    
    // Set canvas size
    canvas.width = width + 40; // Add padding
    canvas.height = height + 20;
    
    // Set font again after resizing canvas
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    return canvas;
  }

  /**
   * Load texture with optional progressive loading
   */
  private async loadTexture(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.encoding = sRGBEncoding;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Update animations and uniforms
   */
  update(): void {
    const time = this.clock.getElapsedTime();
    
    // Update neon sign uniforms
    for (const neonGroup of this.neonObjects.values()) {
      neonGroup.children.forEach(child => {
        if (child instanceof Mesh && child.material instanceof ShaderMaterial) {
          child.material.uniforms.time.value = time;
          child.material.uniforms.cameraPosition.value.copy(this.camera.position);
        }
      });
    }
  }

  /**
   * Render frame
   */
  render(): void {
    this.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update frame object
   */
  updateFrame(frameData: FrameData): void {
    const frameGroup = this.frameObjects.get(frameData.id);
    if (frameGroup) {
      frameGroup.position.copy(frameData.position);
      frameGroup.rotation.copy(frameData.rotation);
      frameGroup.scale.copy(frameData.scale);
    }
  }

  /**
   * Update neon sign
   */
  updateNeon(neonData: NeonData): void {
    const neonGroup = this.neonObjects.get(neonData.id);
    if (neonGroup) {
      neonGroup.position.copy(neonData.position);
      neonGroup.rotation.copy(neonData.rotation);
      neonGroup.scale.copy(neonData.scale);
      
      // Update shader uniforms
      neonGroup.children.forEach(child => {
        if (child instanceof Mesh && child.material instanceof ShaderMaterial) {
          child.material.uniforms.glowColor.value.setStyle(neonData.color);
          child.material.uniforms.glowIntensity.value = neonData.glowIntensity;
        }
      });
    }
  }

  /**
   * Remove AR object
   */
  removeObject(id: string, type: ARMode): void {
    const objects = type === ARMode.FRAME ? this.frameObjects : this.neonObjects;
    const object = objects.get(id);
    
    if (object) {
      this.scene.remove(object);
      objects.delete(id);
      
      // Dispose of geometries and materials
      object.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  /**
   * Get WebGL renderer
   */
  getRenderer(): WebGLRenderer {
    return this.renderer;
  }

  /**
   * Get scene
   */
  getScene(): Scene {
    return this.scene;
  }

  /**
   * Get camera
   */
  getCamera(): PerspectiveCamera {
    return this.camera;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Dispose all objects
    for (const frameGroup of this.frameObjects.values()) {
      this.scene.remove(frameGroup);
    }
    
    for (const neonGroup of this.neonObjects.values()) {
      this.scene.remove(neonGroup);
    }
    
    this.frameObjects.clear();
    this.neonObjects.clear();
    
    // Dispose renderer
    this.renderer.dispose();
    this.pmremGenerator.dispose();
    
    window.removeEventListener('resize', this.onResize.bind(this));
  }
} 