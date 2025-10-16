/**
 * WebGL Detection and Capability Testing Utility
 *
 * Provides comprehensive detection of WebGL support, extensions, and performance characteristics
 * for the fight replay 3D rendering system.
 *
 * @module webglDetection
 */

/**
 * Performance tier classification for WebGL capabilities
 */
export enum WebGLPerformanceTier {
  /** No WebGL support */
  NONE = 'none',
  /** WebGL 1.0 with basic capabilities */
  LOW = 'low',
  /** WebGL 1.0 with advanced features or WebGL 2.0 with basic capabilities */
  MEDIUM = 'medium',
  /** WebGL 2.0 with advanced features and good performance */
  HIGH = 'high',
}

/**
 * Detailed WebGL capability information
 */
export interface WebGLCapabilities {
  /** Whether WebGL 1.0 is supported */
  hasWebGL1: boolean;
  /** Whether WebGL 2.0 is supported */
  hasWebGL2: boolean;
  /** The recommended WebGL version to use */
  recommendedVersion: 1 | 2 | null;
  /** Performance tier classification */
  performanceTier: WebGLPerformanceTier;
  /** Available WebGL extensions */
  extensions: string[];
  /** Maximum texture size supported */
  maxTextureSize: number | null;
  /** Maximum viewport dimensions */
  maxViewportDims: [number, number] | null;
  /** Renderer information (GPU) */
  renderer: string | null;
  /** Vendor information (GPU manufacturer) */
  vendor: string | null;
  /** Whether sufficient capabilities exist for the replay system */
  isSufficient: boolean;
  /** Specific reason if capabilities are insufficient */
  insufficientReason: string | null;
  /** Whether hardware acceleration is likely disabled */
  likelySwoftware: boolean;
}

/**
 * Required WebGL extensions for the replay system
 */
const REQUIRED_EXTENSIONS = ['WEBGL_depth_texture', 'OES_element_index_uint'] as const;

/**
 * Recommended WebGL extensions for enhanced features
 */
const RECOMMENDED_EXTENSIONS = [
  'EXT_texture_filter_anisotropic',
  'WEBGL_compressed_texture_s3tc',
  'OES_standard_derivatives',
] as const;

/**
 * Minimum required texture size for the replay system
 */
const MIN_TEXTURE_SIZE = 2048;

/**
 * Minimum required viewport dimensions
 */
const MIN_VIEWPORT_SIZE = [1024, 768] as const;

/**
 * Attempts to create a WebGL context and returns it
 * @param version - The WebGL version to try (1 or 2)
 * @returns WebGL context or null if creation fails
 */
function getWebGLContext(version: 1 | 2): WebGLRenderingContext | WebGL2RenderingContext | null {
  try {
    const canvas = document.createElement('canvas');
    const contextName = version === 2 ? 'webgl2' : 'webgl';
    const context = canvas.getContext(contextName, {
      failIfMajorPerformanceCaveat: false, // Allow software rendering
    });
    return context as WebGLRenderingContext | WebGL2RenderingContext | null;
  } catch {
    return null;
  }
}

/**
 * Gets the list of available WebGL extensions
 * @param gl - WebGL rendering context
 * @returns Array of extension names
 */
function getAvailableExtensions(gl: WebGLRenderingContext | WebGL2RenderingContext): string[] {
  try {
    const extensions = gl.getSupportedExtensions();
    return extensions || [];
  } catch {
    return [];
  }
}

/**
 * Checks if required extensions are available
 * @param availableExtensions - List of available extension names
 * @param requiredExtensions - List of required extensions to check (defaults to REQUIRED_EXTENSIONS for WebGL1)
 * @returns Object with extension availability flags
 */
function checkExtensions(
  availableExtensions: string[],
  requiredExtensions: readonly string[] = REQUIRED_EXTENSIONS,
): {
  hasRequired: boolean;
  missingRequired: string[];
  hasRecommended: string[];
  missingRecommended: string[];
} {
  const availableSet = new Set(availableExtensions);

  const missingRequired = requiredExtensions.filter((ext) => !availableSet.has(ext));
  const hasRecommended = RECOMMENDED_EXTENSIONS.filter((ext) => availableSet.has(ext));
  const missingRecommended = RECOMMENDED_EXTENSIONS.filter((ext) => !availableSet.has(ext));

  return {
    hasRequired: missingRequired.length === 0,
    missingRequired: Array.from(missingRequired),
    hasRecommended,
    missingRecommended,
  };
}

/**
 * Gets renderer and vendor information from WebGL context
 * @param gl - WebGL rendering context
 * @returns Renderer and vendor strings
 */
function getRendererInfo(gl: WebGLRenderingContext | WebGL2RenderingContext): {
  renderer: string | null;
  vendor: string | null;
  likelySoftware: boolean;
} {
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;

      // Check for software rendering indicators
      const likelySoftware =
        renderer.toLowerCase().includes('swiftshader') ||
        renderer.toLowerCase().includes('llvmpipe') ||
        renderer.toLowerCase().includes('software');

      return { renderer, vendor, likelySoftware };
    }
  } catch {
    // Extension not available or error getting info
  }

  return { renderer: null, vendor: null, likelySoftware: false };
}

/**
 * Determines the performance tier based on WebGL capabilities
 * @param hasWebGL1 - Whether WebGL 1.0 is supported
 * @param hasWebGL2 - Whether WebGL 2.0 is supported
 * @param hasRequiredExtensions - Whether all required extensions are available
 * @param hasRecommendedExtensions - Number of recommended extensions available
 * @param likelySoftware - Whether software rendering is likely being used
 * @returns Performance tier classification
 */
function determinePerformanceTier(
  hasWebGL1: boolean,
  hasWebGL2: boolean,
  hasRequiredExtensions: boolean,
  hasRecommendedExtensions: number,
  likelySoftware: boolean,
): WebGLPerformanceTier {
  if (!hasWebGL1 && !hasWebGL2) {
    return WebGLPerformanceTier.NONE;
  }

  if (likelySoftware || !hasRequiredExtensions) {
    return WebGLPerformanceTier.LOW;
  }

  if (hasWebGL2 && hasRecommendedExtensions >= 2) {
    return WebGLPerformanceTier.HIGH;
  }

  if (hasWebGL2 || (hasWebGL1 && hasRecommendedExtensions >= 2)) {
    return WebGLPerformanceTier.MEDIUM;
  }

  return WebGLPerformanceTier.LOW;
}

/**
 * Detects and analyzes WebGL capabilities of the current environment
 *
 * This function performs comprehensive testing of WebGL support, including:
 * - WebGL 1.0 and 2.0 availability
 * - Required and recommended extensions
 * - Hardware capabilities (texture size, viewport dimensions)
 * - GPU information (vendor, renderer)
 * - Performance tier classification
 *
 * @returns Detailed capability information
 *
 * @example
 * ```typescript
 * const capabilities = detectWebGLCapabilities();
 *
 * if (!capabilities.isSufficient) {
 *   console.error('WebGL not supported:', capabilities.insufficientReason);
 *   // Show fallback UI
 * } else {
 *   console.log('WebGL available:', capabilities.recommendedVersion);
 *   // Initialize 3D rendering
 * }
 * ```
 */
export function detectWebGLCapabilities(): WebGLCapabilities {
  // Try WebGL 2.0 first (preferred)
  const gl2 = getWebGLContext(2);
  const hasWebGL2 = gl2 !== null;

  // Try WebGL 1.0 as fallback
  const gl1 = !hasWebGL2 ? getWebGLContext(1) : null;
  const hasWebGL1 = gl1 !== null;

  // Use the best available context
  const gl = gl2 || gl1;

  // If no WebGL at all, return minimal capabilities
  if (!gl) {
    return {
      hasWebGL1: false,
      hasWebGL2: false,
      recommendedVersion: null,
      performanceTier: WebGLPerformanceTier.NONE,
      extensions: [],
      maxTextureSize: null,
      maxViewportDims: null,
      renderer: null,
      vendor: null,
      isSufficient: false,
      insufficientReason: 'WebGL is not supported in this browser',
      likelySwoftware: false,
    };
  }

  // Get available extensions
  const extensions = getAvailableExtensions(gl);

  // WebGL2 has depth textures and 32-bit indices built-in, so we don't need to check for extensions
  // Only require these extensions for WebGL1
  const extensionCheck = hasWebGL2
    ? checkExtensions(extensions, []) // WebGL2: no required extensions (features built-in)
    : checkExtensions(extensions, REQUIRED_EXTENSIONS); // WebGL1: check for required extensions

  // Get hardware capabilities
  let maxTextureSize: number | null = null;
  let maxViewportDims: [number, number] | null = null;

  try {
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const maxViewportWidth = gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0] as number;
    const maxViewportHeight = gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1] as number;
    maxViewportDims = [maxViewportWidth, maxViewportHeight];
  } catch {
    // Failed to get parameters
  }

  // Get renderer information
  const { renderer, vendor, likelySoftware } = getRendererInfo(gl);

  // Determine performance tier
  const performanceTier = determinePerformanceTier(
    hasWebGL1,
    hasWebGL2,
    extensionCheck.hasRequired,
    extensionCheck.hasRecommended.length,
    likelySoftware,
  );

  // Determine if capabilities are sufficient
  let isSufficient = true;
  let insufficientReason: string | null = null;

  if (!extensionCheck.hasRequired) {
    isSufficient = false;
    insufficientReason = `Missing required WebGL extensions: ${extensionCheck.missingRequired.join(', ')}`;
  } else if (maxTextureSize && maxTextureSize < MIN_TEXTURE_SIZE) {
    isSufficient = false;
    insufficientReason = `Maximum texture size (${maxTextureSize}) is below minimum requirement (${MIN_TEXTURE_SIZE})`;
  } else if (
    maxViewportDims &&
    (maxViewportDims[0] < MIN_VIEWPORT_SIZE[0] || maxViewportDims[1] < MIN_VIEWPORT_SIZE[1])
  ) {
    isSufficient = false;
    insufficientReason = `Maximum viewport dimensions (${maxViewportDims[0]}x${maxViewportDims[1]}) are below minimum requirement (${MIN_VIEWPORT_SIZE[0]}x${MIN_VIEWPORT_SIZE[1]})`;
  }

  return {
    hasWebGL1,
    hasWebGL2,
    recommendedVersion: hasWebGL2 ? 2 : hasWebGL1 ? 1 : null,
    performanceTier,
    extensions,
    maxTextureSize,
    maxViewportDims,
    renderer,
    vendor,
    isSufficient,
    insufficientReason,
    likelySwoftware: likelySoftware,
  };
}

/**
 * Checks if WebGL is available and sufficient for the replay system
 *
 * This is a simplified version of detectWebGLCapabilities() that only returns
 * a boolean indicating if WebGL is sufficient.
 *
 * @returns True if WebGL is available and meets minimum requirements
 *
 * @example
 * ```typescript
 * if (isWebGLAvailable()) {
 *   // Initialize 3D replay
 * } else {
 *   // Show 2D fallback or error message
 * }
 * ```
 */
export function isWebGLAvailable(): boolean {
  const capabilities = detectWebGLCapabilities();
  return capabilities.isSufficient;
}

/**
 * Gets a human-readable description of the current WebGL capabilities
 *
 * @returns Formatted string describing WebGL support
 *
 * @example
 * ```typescript
 * const description = getWebGLDescription();
 * console.log(description);
 * // "WebGL 2.0 (High Performance) - NVIDIA GeForce RTX 3080"
 * ```
 */
export function getWebGLDescription(): string {
  const capabilities = detectWebGLCapabilities();

  if (!capabilities.isSufficient) {
    return `WebGL Not Available: ${capabilities.insufficientReason}`;
  }

  const version = `WebGL ${capabilities.recommendedVersion}.0`;
  const tier =
    capabilities.performanceTier.charAt(0).toUpperCase() + capabilities.performanceTier.slice(1);
  const gpu = capabilities.renderer || 'Unknown GPU';

  return `${version} (${tier} Performance) - ${gpu}`;
}
