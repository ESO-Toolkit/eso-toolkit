/**
 * @jest-environment jsdom
 */

import {
  detectWebGLCapabilities,
  isWebGLAvailable,
  getWebGLDescription,
  WebGLPerformanceTier,
} from './webglDetection';

// Mock HTMLCanvasElement and WebGL context
class MockWebGLContext {
  constructor(
    private version: 1 | 2,
    private capabilities: {
      extensions?: string[];
      maxTextureSize?: number;
      maxViewportDims?: [number, number];
      renderer?: string;
      vendor?: string;
    } = {},
  ) {}

  getSupportedExtensions(): string[] {
    return (
      this.capabilities.extensions || [
        'WEBGL_depth_texture',
        'OES_element_index_uint',
        'EXT_texture_filter_anisotropic',
      ]
    );
  }

  getParameter(param: number): any {
    // Mock common WebGL parameters
    if (param === 3379) {
      // MAX_TEXTURE_SIZE
      return this.capabilities.maxTextureSize || 4096;
    }
    if (param === 3386) {
      // MAX_VIEWPORT_DIMS
      return this.capabilities.maxViewportDims || [4096, 4096];
    }
    // For WEBGL_debug_renderer_info extension parameters
    if (param === 37446) {
      // UNMASKED_RENDERER_WEBGL
      return this.capabilities.renderer || 'Mock Renderer';
    }
    if (param === 37445) {
      // UNMASKED_VENDOR_WEBGL
      return this.capabilities.vendor || 'Mock Vendor';
    }
    return null;
  }

  getExtension(name: string): any {
    if (name === 'WEBGL_debug_renderer_info') {
      return {
        UNMASKED_VENDOR_WEBGL: 37445,
        UNMASKED_RENDERER_WEBGL: 37446,
      };
    }
    if (name === 'WEBGL_lose_context') {
      return {
        loseContext: () => undefined,
      };
    }
    return null;
  }

  // Add other WebGL context methods as needed for tests
  MAX_TEXTURE_SIZE = 3379;
  MAX_VIEWPORT_DIMS = 3386;
}

describe('webglDetection', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    // Save original methods
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalCreateElement = document.createElement.bind(document);
  });

  afterEach(() => {
    // Restore original methods
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    document.createElement = originalCreateElement;
  });

  const mockCanvasWithWebGL = (
    version: 1 | 2 | null,
    capabilities?: {
      extensions?: string[];
      maxTextureSize?: number;
      maxViewportDims?: [number, number];
      renderer?: string;
      vendor?: string;
    },
    options?: {
      shouldFail?: (contextType: string, attributes?: Record<string, unknown>) => boolean;
    },
  ) => {
    document.createElement = ((tagName: string) => {
      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
        canvas.getContext = ((contextType: string, attributes?: Record<string, unknown>) => {
          if (options?.shouldFail?.(contextType, attributes)) {
            return null;
          }

          if (version === null) {
            return null;
          }

          if (version === 2 && contextType === 'webgl2') {
            return new MockWebGLContext(2, capabilities || {});
          }

          if (version === 1 && (contextType === 'webgl' || contextType === 'experimental-webgl')) {
            return new MockWebGLContext(1, capabilities || {});
          }

          return null;
        }) as any;
        return canvas;
      }
      return originalCreateElement(tagName);
    }) as any;
  };

  describe('detectWebGLCapabilities', () => {
    it('should detect WebGL 2.0 support with high performance tier', () => {
      mockCanvasWithWebGL(2, {
        extensions: [
          'WEBGL_depth_texture',
          'OES_element_index_uint',
          'EXT_texture_filter_anisotropic',
          'WEBGL_compressed_texture_s3tc',
          'OES_standard_derivatives',
        ],
        maxTextureSize: 8192,
        maxViewportDims: [8192, 8192],
        renderer: 'NVIDIA GeForce RTX 3080',
        vendor: 'NVIDIA Corporation',
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL1).toBe(false); // Only checked if WebGL2 fails
      expect(capabilities.hasWebGL2).toBe(true);
      expect(capabilities.recommendedVersion).toBe(2);
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.HIGH);
      expect(capabilities.isSufficient).toBe(true);
      expect(capabilities.insufficientReason).toBeNull();
      expect(capabilities.maxTextureSize).toBe(8192);
      expect(capabilities.maxViewportDims).toEqual([8192, 8192]);
      expect(capabilities.renderer).toBe('NVIDIA GeForce RTX 3080');
      expect(capabilities.vendor).toBe('NVIDIA Corporation');
      expect(capabilities.likelySwoftware).toBe(false);
    });

    it('should detect WebGL 1.0 support with medium performance tier', () => {
      mockCanvasWithWebGL(1, {
        extensions: [
          'WEBGL_depth_texture',
          'OES_element_index_uint',
          'EXT_texture_filter_anisotropic',
          'WEBGL_compressed_texture_s3tc',
        ],
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL1).toBe(true);
      expect(capabilities.hasWebGL2).toBe(false);
      expect(capabilities.recommendedVersion).toBe(1);
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.MEDIUM);
      expect(capabilities.isSufficient).toBe(true);
    });

    it('should detect no WebGL support', () => {
      mockCanvasWithWebGL(null);

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL1).toBe(false);
      expect(capabilities.hasWebGL2).toBe(false);
      expect(capabilities.recommendedVersion).toBeNull();
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.NONE);
      expect(capabilities.isSufficient).toBe(false);
      expect(capabilities.insufficientReason).toBe('WebGL is not supported in this browser');
    });

    it('should detect missing required extensions in WebGL1', () => {
      mockCanvasWithWebGL(1, {
        extensions: ['EXT_texture_filter_anisotropic'], // Missing required extensions
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL1).toBe(true);
      expect(capabilities.hasWebGL2).toBe(false);
      expect(capabilities.isSufficient).toBe(false);
      expect(capabilities.insufficientReason).toContain('Missing required WebGL extensions');
      expect(capabilities.insufficientReason).toContain('WEBGL_depth_texture');
      expect(capabilities.insufficientReason).toContain('OES_element_index_uint');
    });

    it('should NOT require extensions for WebGL2 (built-in features)', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['EXT_texture_filter_anisotropic'], // WebGL2 doesn't need depth_texture/element_index extensions
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL2).toBe(true);
      expect(capabilities.isSufficient).toBe(true); // Should pass - extensions are built-in to WebGL2
      expect(capabilities.insufficientReason).toBeNull();
    });

    it('should detect insufficient texture size', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
        maxTextureSize: 1024, // Below minimum requirement of 2048
        maxViewportDims: [4096, 4096],
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL2).toBe(true);
      expect(capabilities.isSufficient).toBe(false);
      expect(capabilities.insufficientReason).toContain('Maximum texture size');
      expect(capabilities.insufficientReason).toContain('1024');
      expect(capabilities.insufficientReason).toContain('2048');
    });

    it('should detect insufficient viewport dimensions', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
        maxTextureSize: 4096,
        maxViewportDims: [800, 600], // Below minimum requirement
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL2).toBe(true);
      expect(capabilities.isSufficient).toBe(false);
      expect(capabilities.insufficientReason).toContain('Maximum viewport dimensions');
      expect(capabilities.insufficientReason).toContain('800x600');
      expect(capabilities.insufficientReason).toContain('1024x768');
    });

    it('should detect software rendering', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
        renderer: 'SwiftShader Renderer',
        vendor: 'Google Inc.',
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.likelySwoftware).toBe(true);
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.LOW);
    });

    it('should classify low performance tier for basic WebGL 1.0', () => {
      mockCanvasWithWebGL(1, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'], // Only required extensions
        maxTextureSize: 2048,
        maxViewportDims: [2048, 2048],
      });

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL1).toBe(true);
      expect(capabilities.hasWebGL2).toBe(false);
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.LOW);
      expect(capabilities.isSufficient).toBe(true); // Still sufficient, just lower performance
    });

    it('should handle missing debug info extension gracefully', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
      });

      // Override getExtension to return null for debug info
      const mockContext = new MockWebGLContext(2, {});
      mockContext.getExtension = () => null;

      document.createElement = ((tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
          canvas.getContext = () => mockContext as any;
          return canvas;
        }
        return originalCreateElement(tagName);
      }) as any;

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.renderer).toBeNull();
      expect(capabilities.vendor).toBeNull();
      expect(capabilities.likelySwoftware).toBe(false);
    });

    it('should mark insufficient when required context attributes cannot be created', () => {
      mockCanvasWithWebGL(
        2,
        {
          extensions: [
            'WEBGL_depth_texture',
            'OES_element_index_uint',
            'EXT_texture_filter_anisotropic',
          ],
          maxTextureSize: 4096,
          maxViewportDims: [4096, 4096],
        },
        {
          shouldFail: (_contextType, attributes) => Boolean(attributes?.preserveDrawingBuffer),
        },
      );

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL2).toBe(true);
      expect(capabilities.isSufficient).toBe(false);
      expect(capabilities.insufficientReason).toContain(
        'Unable to create WebGL context with required attributes',
      );
    });

    it('should attempt experimental-webgl fallback when standard context fails', () => {
      mockCanvasWithWebGL(
        1,
        {
          extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
          maxTextureSize: 4096,
          maxViewportDims: [4096, 4096],
        },
        {
          shouldFail: (contextType) => contextType === 'webgl',
        },
      );

      const capabilities = detectWebGLCapabilities();

      expect(capabilities.hasWebGL1).toBe(true);
      expect(capabilities.isSufficient).toBe(true);
      expect(capabilities.insufficientReason).toBeNull();
    });
  });

  describe('isWebGLAvailable', () => {
    it('should return true when WebGL is sufficient', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
      });

      expect(isWebGLAvailable()).toBe(true);
    });

    it('should return false when WebGL is not available', () => {
      mockCanvasWithWebGL(null);

      expect(isWebGLAvailable()).toBe(false);
    });

    it('should return false when WebGL1 is insufficient (missing extensions)', () => {
      mockCanvasWithWebGL(1, {
        extensions: [], // Missing required extensions for WebGL1
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
      });

      expect(isWebGLAvailable()).toBe(false);
    });
  });

  describe('getWebGLDescription', () => {
    it('should return descriptive string for high performance WebGL 2.0', () => {
      mockCanvasWithWebGL(2, {
        extensions: [
          'WEBGL_depth_texture',
          'OES_element_index_uint',
          'EXT_texture_filter_anisotropic',
          'WEBGL_compressed_texture_s3tc',
        ],
        maxTextureSize: 8192,
        maxViewportDims: [8192, 8192],
        renderer: 'NVIDIA GeForce RTX 3080',
      });

      const description = getWebGLDescription();

      expect(description).toContain('WebGL 2.0');
      expect(description).toContain('High Performance');
      expect(description).toContain('NVIDIA GeForce RTX 3080');
    });

    it('should return descriptive string for medium performance WebGL 1.0', () => {
      mockCanvasWithWebGL(1, {
        extensions: [
          'WEBGL_depth_texture',
          'OES_element_index_uint',
          'EXT_texture_filter_anisotropic',
          'WEBGL_compressed_texture_s3tc',
        ],
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
        renderer: 'Intel HD Graphics 4000',
      });

      const description = getWebGLDescription();

      expect(description).toContain('WebGL 1.0');
      expect(description).toContain('Medium Performance');
      expect(description).toContain('Intel HD Graphics 4000');
    });

    it('should return error message when WebGL is not available', () => {
      mockCanvasWithWebGL(null);

      const description = getWebGLDescription();

      expect(description).toContain('WebGL Not Available');
      expect(description).toContain('WebGL is not supported in this browser');
    });

    it('should return error message when capabilities are insufficient (WebGL1 missing extensions)', () => {
      mockCanvasWithWebGL(1, {
        extensions: [], // Missing required extensions for WebGL1
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
      });

      const description = getWebGLDescription();

      expect(description).toContain('WebGL Not Available');
      expect(description).toContain('Missing required WebGL extensions');
    });

    it('should handle missing renderer info gracefully', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
        maxTextureSize: 4096,
        maxViewportDims: [4096, 4096],
      });

      // Override to return null for renderer
      const mockContext = new MockWebGLContext(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
        renderer: undefined,
      });
      mockContext.getExtension = () => null;

      document.createElement = ((tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
          canvas.getContext = () => mockContext as any;
          return canvas;
        }
        return originalCreateElement(tagName);
      }) as any;

      const description = getWebGLDescription();

      expect(description).toContain('Unknown GPU');
    });
  });

  describe('Performance Tier Classification', () => {
    it('should classify as HIGH for WebGL 2.0 with 2+ recommended extensions', () => {
      mockCanvasWithWebGL(2, {
        extensions: [
          'WEBGL_depth_texture',
          'OES_element_index_uint',
          'EXT_texture_filter_anisotropic',
          'WEBGL_compressed_texture_s3tc',
        ],
      });

      const capabilities = detectWebGLCapabilities();
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.HIGH);
    });

    it('should classify as MEDIUM for WebGL 2.0 with <2 recommended extensions', () => {
      mockCanvasWithWebGL(2, {
        extensions: [
          'WEBGL_depth_texture',
          'OES_element_index_uint',
          'EXT_texture_filter_anisotropic',
        ],
      });

      const capabilities = detectWebGLCapabilities();
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.MEDIUM);
    });

    it('should classify as LOW for software rendering', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
        renderer: 'llvmpipe',
      });

      const capabilities = detectWebGLCapabilities();
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.LOW);
    });

    it('should classify as LOW for WebGL1 missing required extensions', () => {
      mockCanvasWithWebGL(1, {
        extensions: ['EXT_texture_filter_anisotropic'],
      });

      const capabilities = detectWebGLCapabilities();
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.LOW);
    });

    it('should classify as MEDIUM for WebGL2 even without extension list (built-in features)', () => {
      mockCanvasWithWebGL(2, {
        extensions: ['EXT_texture_filter_anisotropic'], // Only 1 recommended extension
      });

      const capabilities = detectWebGLCapabilities();
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.MEDIUM);
    });

    it('should classify as NONE for no WebGL support', () => {
      mockCanvasWithWebGL(null);

      const capabilities = detectWebGLCapabilities();
      expect(capabilities.performanceTier).toBe(WebGLPerformanceTier.NONE);
    });
  });
});
