# 🖼️ Framerly AR Engine

A lightweight, high-performance, web-based AR engine built exclusively for Framerly - an art framing and neon art preview platform. This engine allows users to place framed artworks and neon signs realistically on their actual walls using their phone's camera with near-zero latency.

## ✨ Key Features

### 🎯 Core Capabilities
- **WebXR-Powered**: Uses WebXR Device API for plane detection and hit testing
- **Dual Rendering**: Supports both framed artwork (PBR materials) and neon signs (custom glow shaders)
- **AI Integration**: Real-time recommendations for frame styles and neon designs
- **Cross-Platform**: Works on Android Chrome, iOS Safari (with USDZ fallback), and desktop browsers
- **Performance Optimized**: Minimal memory footprint with smart asset caching

### 🖼️ Frame Rendering
- **Physically Based Rendering (PBR)**: Realistic materials with proper lighting
- **High-Resolution Textures**: Progressive loading from low-res preview to high-res
- **Accurate Scaling**: Real-world measurements and perspective
- **Multiple Frame Styles**: Modern, classic, minimal, and custom options
- **Mat Support**: Optional matting with customizable colors

### 💡 Neon Sign Rendering
- **Custom GLSL Shaders**: Realistic glow effects with proper light falloff
- **Dynamic Animations**: Pulsing, flickering, and color temperature variations
- **Bloom Effects**: Lightweight halo and rim lighting
- **Multiple Presets**: Classic cyan, warm orange, cool blue, pink, and green styles
- **Adaptive Brightness**: Responds to ambient light conditions

### 🤖 AI-Powered Recommendations
- **Smart Frame Suggestions**: Based on artwork analysis and room context
- **Neon Text Generation**: Context-aware neon sign recommendations
- **Style Variations**: Real-time style switching with minimal latency
- **User Learning**: Feedback system to improve recommendations over time

## 🚀 Quick Start

### Prerequisites
- Modern browser with WebXR support (Android Chrome 79+, iOS Safari 13+ with fallback)
- HTTPS connection (required for camera access and WebXR)
- Device with rear camera

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/framerly/ar-engine.git
   cd ar-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the app**
   - Open `https://localhost:3000` on your mobile device
   - Allow camera permissions when prompted
   - Point camera at a wall and tap to place objects

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## 📱 Usage

### Basic Operation

1. **Initialize AR Session**
   - Open the app on a WebXR-compatible device
   - Grant camera permissions
   - Point camera at walls to detect surfaces

2. **Switch Modes**
   - Use the mode toggle to switch between Frame and Neon modes
   - Frame mode: Place framed artwork on walls
   - Neon mode: Place glowing neon signs

3. **Place Objects**
   - Tap on detected wall surfaces to place objects
   - Objects will be positioned with realistic perspective and lighting
   - AI will automatically suggest appropriate styles

### Advanced Features

- **Object Manipulation**: Tap and drag to reposition placed objects
- **Style Switching**: Use AI recommendations to try different frame styles or neon colors
- **Multiple Objects**: Place multiple frames and neon signs in the same scene
- **Persistent Placement**: Objects remain stable on walls even when moving around

## 🏗️ Architecture

### Core Components

```
src/
├── core/
│   ├── FramerlyAREngine.ts    # Main orchestrator
│   ├── PlaneTracker.ts        # WebXR plane detection
│   ├── PoseFilter.ts          # Tracking stabilization
│   ├── Renderer.ts            # 3D rendering engine
│   └── AIConnector.ts         # AI API integration
├── shaders/
│   └── neonGlow.ts           # Custom GLSL shaders
├── types/
│   └── index.ts              # TypeScript definitions
└── main.ts                   # Application entry point
```

### Data Flow

1. **Plane Detection**: WebXR detects wall surfaces
2. **Pose Filtering**: Smooths tracking data to reduce jitter
3. **AI Recommendations**: Fetches style suggestions from backend
4. **Rendering**: Creates 3D objects with appropriate materials
5. **User Interaction**: Handles placement and manipulation

## 🎨 Customization

### Frame Styles

```typescript
// Add custom frame styles
const customFrame = {
  frameStyle: 'vintage',
  frameColor: '#8B4513',
  matColor: '#F5F5DC',
  suggestedSize: { width: 0.5, height: 0.7 }
};
```

### Neon Presets

```typescript
// Create custom neon presets
const customNeon = {
  glowColor: [1.0, 0.2, 0.8],
  glowIntensity: 2.5,
  rimPower: 2.0,
  pulseSpeed: 1.2,
  pulseAmount: 0.3
};
```

### Shader Modifications

Custom GLSL shaders are located in `src/shaders/neonGlow.ts`. Modify these to create new visual effects:

- **Vertex Shaders**: Control geometry transformation
- **Fragment Shaders**: Control color and lighting effects
- **Uniforms**: Expose parameters for real-time control

## 🔧 Configuration

### Engine Configuration

```typescript
const config = {
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
  }
};
```

### AI API Configuration

```typescript
const aiConfig = {
  baseUrl: 'https://api.framerly.com/v1',
  apiKey: 'your-api-key',
  timeout: 5000,
  maxRetries: 3
};
```

## 📊 Performance

### Optimization Features

- **Adaptive Quality**: Automatically adjusts rendering quality based on device performance
- **Smart Caching**: Caches textures and API responses to reduce bandwidth
- **Progressive Loading**: Loads low-res previews first, then high-res textures
- **Minimal Dependencies**: Only includes essential libraries (Three.js + WebXR)

### Performance Targets

- **Frame Rate**: 30-60 FPS on mobile devices
- **Memory Usage**: <200MB total memory footprint
- **Bundle Size**: <2MB JavaScript bundle (gzipped)
- **Latency**: <100ms from tap to object placement

## 🌐 Browser Support

| Browser | Version | AR Support | Fallback |
|---------|---------|------------|----------|
| Chrome Android | 79+ | ✅ WebXR | - |
| Samsung Internet | 13+ | ✅ WebXR | - |
| Safari iOS | 13+ | ❌ | ✅ USDZ AR Quick Look |
| Chrome Desktop | 79+ | ✅ WebXR (dev) | ✅ 3D Preview |
| Firefox | - | ❌ | ✅ 3D Preview |

## 🔒 Privacy & Security

- **Local Processing**: All AR tracking happens on-device
- **Secure Communications**: All API calls use HTTPS
- **No Data Storage**: No personal data stored locally or transmitted
- **Camera Privacy**: Camera stream never leaves the device

## 🚀 Deployment

### Static Hosting (Recommended)

Deploy to any CDN or static hosting service:

```bash
npm run build
# Deploy dist/ folder to:
# - Vercel, Netlify, AWS S3, Cloudflare Pages, etc.
```

### Docker Deployment

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

### Requirements

- **HTTPS**: Required for camera access and WebXR
- **Origin Trial**: May be required for some WebXR features
- **Performance**: Ensure fast loading with CDN

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run preview  # Preview production build
npm run type-check # Run TypeScript checker
```

### Development Guidelines

1. **TypeScript**: Use strict typing for all components
2. **Performance**: Profile rendering performance regularly
3. **Testing**: Test on actual mobile devices, not desktop simulators
4. **Cross-Platform**: Ensure compatibility across target browsers

### Debugging

Access debug information in the browser console:

```javascript
// Get current AR engine state
window.getARState();

// Enable verbose logging
localStorage.setItem('framerly_debug', 'true');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://ar.framerly.com](https://ar.framerly.com)
- **API Documentation**: [https://docs.framerly.com](https://docs.framerly.com)
- **Support**: [support@framerly.com](mailto:support@framerly.com)

---

**Built with ❤️ by the Framerly Team**
