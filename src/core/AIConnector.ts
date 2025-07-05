/**
 * AIConnector - Interface with Framerly's AI backend for frame and neon recommendations
 */

import { 
  ARMode, 
  AIRecommendation, 
  FrameRecommendation, 
  NeonRecommendation,
  FrameData,
  NeonData
} from '../types';

export interface APIConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
}

export class AIConnector {
  private config: APIConfig;
  private cache: Map<string, AIRecommendation[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.framerly.com/v1',
      apiKey: config.apiKey || 'demo-key',
      timeout: config.timeout || 5000,
      maxRetries: config.maxRetries || 3,
      ...config
    };
  }

  /**
   * Get frame recommendations based on artwork analysis
   */
  async getFrameRecommendations(
    artworkUrl: string,
    roomContext?: string,
    userPreferences?: any
  ): Promise<FrameRecommendation[]> {
    const cacheKey = `frame_${artworkUrl}_${roomContext || 'default'}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.map(r => r.data as FrameRecommendation);
      }
    }

    try {
      const response = await this.makeRequest('/frames/recommend', {
        method: 'POST',
        body: JSON.stringify({
          artwork_url: artworkUrl,
          room_context: roomContext,
          user_preferences: userPreferences,
          max_recommendations: 5
        })
      });

      const recommendations: FrameRecommendation[] = response.recommendations.map((rec: any) => ({
        frameStyle: rec.frame_style,
        frameColor: rec.frame_color,
        matColor: rec.mat_color,
        suggestedSize: {
          width: rec.suggested_size.width,
          height: rec.suggested_size.height
        },
        reasoning: rec.reasoning
      }));

      // Cache the results
      const aiRecommendations: AIRecommendation[] = recommendations.map((rec, index) => ({
        id: `frame_${Date.now()}_${index}`,
        type: ARMode.FRAME,
        confidence: response.recommendations[index].confidence || 0.8,
        data: rec
      }));

      this.cache.set(cacheKey, aiRecommendations);
      this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);

      return recommendations;
    } catch (error) {
      console.warn('Failed to get frame recommendations, using fallback:', error);
      return this.getFallbackFrameRecommendations();
    }
  }

  /**
   * Get neon sign recommendations based on context
   */
  async getNeonRecommendations(
    context: string,
    roomType?: string,
    moodPreference?: string
  ): Promise<NeonRecommendation[]> {
    const cacheKey = `neon_${context}_${roomType || 'default'}_${moodPreference || 'default'}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.map(r => r.data as NeonRecommendation);
      }
    }

    try {
      const response = await this.makeRequest('/neon/recommend', {
        method: 'POST',
        body: JSON.stringify({
          context,
          room_type: roomType,
          mood_preference: moodPreference,
          max_recommendations: 5
        })
      });

      const recommendations: NeonRecommendation[] = response.recommendations.map((rec: any) => ({
        text: rec.text,
        color: rec.color,
        glowIntensity: rec.glow_intensity,
        fontSize: rec.font_size,
        placement: rec.placement,
        reasoning: rec.reasoning
      }));

      // Cache the results
      const aiRecommendations: AIRecommendation[] = recommendations.map((rec, index) => ({
        id: `neon_${Date.now()}_${index}`,
        type: ARMode.NEON,
        confidence: response.recommendations[index].confidence || 0.8,
        data: rec
      }));

      this.cache.set(cacheKey, aiRecommendations);
      this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);

      return recommendations;
    } catch (error) {
      console.warn('Failed to get neon recommendations, using fallback:', error);
      return this.getFallbackNeonRecommendations(context);
    }
  }

  /**
   * Analyze artwork to extract features for better recommendations
   */
  async analyzeArtwork(artworkUrl: string): Promise<any> {
    try {
      const response = await this.makeRequest('/artwork/analyze', {
        method: 'POST',
        body: JSON.stringify({
          artwork_url: artworkUrl
        })
      });

      return {
        colors: response.dominant_colors,
        style: response.art_style,
        mood: response.mood,
        complexity: response.complexity,
        aspectRatio: response.aspect_ratio
      };
    } catch (error) {
      console.warn('Artwork analysis failed, using basic analysis:', error);
      return this.getFallbackArtworkAnalysis();
    }
  }

  /**
   * Get style variations for a specific frame or neon configuration
   */
  async getStyleVariations(
    type: ARMode,
    baseConfig: FrameData | NeonData
  ): Promise<(FrameRecommendation | NeonRecommendation)[]> {
    try {
      const endpoint = type === ARMode.FRAME ? '/frames/variations' : '/neon/variations';
      
      const response = await this.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          base_config: this.serializeConfig(baseConfig),
          variation_count: 3
        })
      });

      return response.variations;
    } catch (error) {
      console.warn('Failed to get style variations:', error);
      return type === ARMode.FRAME 
        ? this.getFallbackFrameRecommendations()
        : this.getFallbackNeonRecommendations('variations');
    }
  }

  /**
   * Send user feedback to improve recommendations
   */
  async sendFeedback(
    recommendationId: string,
    feedback: 'like' | 'dislike' | 'placed',
    metadata?: any
  ): Promise<void> {
    try {
      await this.makeRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          recommendation_id: recommendationId,
          feedback,
          metadata,
          user_id: this.getUserId(),
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to send feedback:', error);
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-User-ID': this.getUserId(),
        ...options.headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    };

    let lastError: Error;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 4xx errors
        if (error instanceof TypeError && error.message.includes('4')) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry !== undefined && Date.now() < expiry;
  }

  /**
   * Get fallback frame recommendations
   */
  private getFallbackFrameRecommendations(): FrameRecommendation[] {
    return [
      {
        frameStyle: 'modern',
        frameColor: '#000000',
        matColor: '#ffffff',
        suggestedSize: { width: 0.4, height: 0.6 },
        reasoning: 'Classic black frame with white mat works well with most artwork'
      },
      {
        frameStyle: 'minimal',
        frameColor: '#8B4513',
        matColor: 'none',
        suggestedSize: { width: 0.4, height: 0.6 },
        reasoning: 'Natural wood frame provides warmth without distraction'
      },
      {
        frameStyle: 'classic',
        frameColor: '#FFD700',
        matColor: '#F5F5DC',
        suggestedSize: { width: 0.4, height: 0.6 },
        reasoning: 'Elegant gold frame with cream mat for traditional appeal'
      }
    ];
  }

  /**
   * Get fallback neon recommendations
   */
  private getFallbackNeonRecommendations(context: string): NeonRecommendation[] {
    const recommendations = [
      {
        text: 'Welcome',
        color: '#00FFFF',
        glowIntensity: 2.0,
        fontSize: 48,
        placement: 'wall' as const,
        reasoning: 'Welcoming cyan neon creates a friendly atmosphere'
      },
      {
        text: 'Dreams',
        color: '#FF1493',
        glowIntensity: 1.8,
        fontSize: 36,
        placement: 'wall' as const,
        reasoning: 'Inspirational pink neon adds warmth and motivation'
      },
      {
        text: 'Relax',
        color: '#9370DB',
        glowIntensity: 1.5,
        fontSize: 42,
        placement: 'wall' as const,
        reasoning: 'Calming purple neon promotes relaxation'
      }
    ];

    // Customize based on context
    if (context.includes('cafe') || context.includes('coffee')) {
      recommendations[0].text = 'Coffee';
      recommendations[0].color = '#D2691E';
    } else if (context.includes('bar') || context.includes('restaurant')) {
      recommendations[0].text = 'Cheers';
      recommendations[0].color = '#DC143C';
    }

    return recommendations;
  }

  /**
   * Get fallback artwork analysis
   */
  private getFallbackArtworkAnalysis(): any {
    return {
      colors: ['#3498db', '#e74c3c', '#f39c12'],
      style: 'modern',
      mood: 'neutral',
      complexity: 'medium',
      aspectRatio: 1.33
    };
  }

  /**
   * Serialize config for API
   */
  private serializeConfig(config: FrameData | NeonData): any {
    if (config.type === ARMode.FRAME) {
      const frameConfig = config as FrameData;
      return {
        type: 'frame',
        artwork_url: frameConfig.artworkUrl,
        frame_style: frameConfig.frameStyle,
        frame_color: frameConfig.frameColor,
        mat_color: frameConfig.matColor,
        width: frameConfig.width,
        height: frameConfig.height
      };
    } else {
      const neonConfig = config as NeonData;
      return {
        type: 'neon',
        text: neonConfig.text,
        color: neonConfig.color,
        glow_intensity: neonConfig.glowIntensity,
        font_size: neonConfig.fontSize,
        font_family: neonConfig.fontFamily
      };
    }
  }

  /**
   * Get or generate user ID
   */
  private getUserId(): string {
    let userId = localStorage.getItem('framerly_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('framerly_user_id', userId);
    }
    return userId;
  }

  /**
   * Add delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Update API configuration
   */
  updateConfig(newConfig: Partial<APIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearCache(); // Clear cache when config changes
  }
} 