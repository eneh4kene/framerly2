/**
 * Custom GLSL shaders for realistic neon glow effects
 */

export const neonVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  uniform float time;
  uniform float glowIntensity;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vPosition = position;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const neonFragmentShader = `
  uniform vec3 glowColor;
  uniform float glowIntensity;
  uniform float time;
  uniform float opacity;
  uniform float rimPower;
  uniform float pulseSpeed;
  uniform float pulseAmount;
  uniform vec3 cameraPosition;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  // Noise function for realistic flicker
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  // Smooth noise for organic glow variation
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    // Calculate view direction for rim lighting
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    
    // Rim lighting effect (Fresnel)
    float rim = 1.0 - max(0.0, dot(viewDirection, vNormal));
    rim = pow(rim, rimPower);
    
    // Pulse effect with time-based animation
    float pulse = sin(time * pulseSpeed) * 0.5 + 0.5;
    pulse = mix(1.0, pulse, pulseAmount);
    
    // Add subtle flicker using noise
    float flicker = noise(vUv * 50.0 + time * 2.0) * 0.1 + 0.9;
    
    // Distance-based intensity falloff for inner glow
    float centerDistance = length(vUv - 0.5) * 2.0;
    float innerGlow = 1.0 - smoothstep(0.0, 1.0, centerDistance);
    
    // Combine all effects
    float totalGlow = rim * glowIntensity * pulse * flicker;
    totalGlow += innerGlow * glowIntensity * 0.3;
    
    // Base neon color with emissive glow
    vec3 finalColor = glowColor * totalGlow;
    
    // Add core brightness for the neon tube itself
    float core = 1.0 - smoothstep(0.0, 0.1, centerDistance);
    finalColor += glowColor * core * 2.0;
    
    // Add subtle color temperature variation
    float temperature = sin(time * 0.5 + vUv.x * 10.0) * 0.05 + 1.0;
    finalColor *= temperature;
    
    gl_FragColor = vec4(finalColor, opacity * totalGlow);
  }
`;

export const neonHaloVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  uniform float haloSize;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Expand vertices outward for halo effect
    vec3 expandedPosition = position + normal * haloSize;
    
    vec4 worldPosition = modelMatrix * vec4(expandedPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(expandedPosition, 1.0);
  }
`;

export const neonHaloFragmentShader = `
  uniform vec3 glowColor;
  uniform float glowIntensity;
  uniform float time;
  uniform float haloOpacity;
  uniform vec3 cameraPosition;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    // Calculate view direction
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    
    // Distance from center for radial falloff
    float distance = length(vUv - 0.5) * 2.0;
    
    // Smooth falloff for halo
    float halo = 1.0 - smoothstep(0.0, 1.0, distance);
    halo = pow(halo, 2.0);
    
    // Fresnel effect for edge glow
    float fresnel = 1.0 - max(0.0, dot(viewDirection, vNormal));
    fresnel = pow(fresnel, 1.5);
    
    // Combine halo and fresnel
    float totalHalo = halo * fresnel * glowIntensity;
    
    // Subtle pulsing
    float pulse = sin(time * 2.0) * 0.1 + 0.9;
    totalHalo *= pulse;
    
    vec3 finalColor = glowColor * totalHalo;
    
    gl_FragColor = vec4(finalColor, haloOpacity * totalHalo);
  }
`;

// Bloom pass shader for post-processing (optional lightweight implementation)
export const bloomVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const bloomFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float bloomIntensity;
  uniform float bloomThreshold;
  uniform float bloomRadius;
  
  varying vec2 vUv;
  
  // Simple bloom implementation
  vec4 getBloom(vec2 uv) {
    vec4 color = texture2D(tDiffuse, uv);
    
    // Extract bright areas
    float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    if (brightness > bloomThreshold) {
      return color * bloomIntensity;
    }
    
    return vec4(0.0);
  }
  
  void main() {
    vec2 texelSize = 1.0 / vec2(textureSize(tDiffuse, 0));
    
    vec4 bloom = vec4(0.0);
    float radius = bloomRadius;
    
    // Simple box blur for bloom
    for (float x = -radius; x <= radius; x += 1.0) {
      for (float y = -radius; y <= radius; y += 1.0) {
        vec2 offset = vec2(x, y) * texelSize;
        bloom += getBloom(vUv + offset);
      }
    }
    
    bloom /= pow(radius * 2.0 + 1.0, 2.0);
    
    // Combine original with bloom
    vec4 original = texture2D(tDiffuse, vUv);
    
    gl_FragColor = original + bloom;
  }
`;

// Material parameters for different neon styles
export const neonPresets = {
  classic: {
    glowColor: [0.0, 1.0, 1.0], // Cyan
    glowIntensity: 2.0,
    rimPower: 2.0,
    pulseSpeed: 1.0,
    pulseAmount: 0.2,
    haloSize: 0.02,
    haloOpacity: 0.3
  },
  
  warm: {
    glowColor: [1.0, 0.4, 0.1], // Orange
    glowIntensity: 1.8,
    rimPower: 1.5,
    pulseSpeed: 0.8,
    pulseAmount: 0.15,
    haloSize: 0.025,
    haloOpacity: 0.4
  },
  
  cool: {
    glowColor: [0.2, 0.4, 1.0], // Blue
    glowIntensity: 2.2,
    rimPower: 2.5,
    pulseSpeed: 1.2,
    pulseAmount: 0.25,
    haloSize: 0.018,
    haloOpacity: 0.25
  },
  
  pink: {
    glowColor: [1.0, 0.2, 0.8], // Pink
    glowIntensity: 1.9,
    rimPower: 2.0,
    pulseSpeed: 0.9,
    pulseAmount: 0.18,
    haloSize: 0.022,
    haloOpacity: 0.35
  },
  
  green: {
    glowColor: [0.2, 1.0, 0.3], // Green
    glowIntensity: 2.1,
    rimPower: 2.2,
    pulseSpeed: 1.1,
    pulseAmount: 0.22,
    haloSize: 0.02,
    haloOpacity: 0.3
  }
}; 