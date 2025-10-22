/**
 * Helper function to calculate optimal worker count for Playwright tests
 * @param options Configuration options for worker calculation
 * @returns Optimal worker count based on environment and constraints
 */
export function calculateOptimalWorkers(options: {
  /** Maximum workers allowed (safety limit) */
  maxWorkers?: number;
  /** Minimum workers to use */
  minWorkers?: number;
  /** Memory-per-worker in MB (for memory-constrained environments) */
  memoryPerWorker?: number;
  /** Available memory in MB (defaults to system detection) */
  availableMemory?: number;
  /** Override for CPU detection */
  cpuCores?: number;
}): number | undefined {
  // Check environment variable overrides first
  const envWorkers = process.env.PLAYWRIGHT_WORKERS;
  if (envWorkers) {
    const parsedWorkers = parseInt(envWorkers, 10);
    if (!isNaN(parsedWorkers) && parsedWorkers > 0) {
      return parsedWorkers;
    }
  }

  // Force conservative mode if requested
  if (process.env.PLAYWRIGHT_CONSERVATIVE_MODE === 'true') {
    return 1;
  }

  const {
    maxWorkers = parseInt(process.env.PLAYWRIGHT_MAX_WORKERS || '4', 10),
    minWorkers = parseInt(process.env.PLAYWRIGHT_MIN_WORKERS || '1', 10),
    memoryPerWorker = parseInt(process.env.PLAYWRIGHT_MEMORY_PER_WORKER || '1000', 10),
    availableMemory,
    cpuCores,
  } = options;

  // In development, let Playwright auto-detect
  if (!process.env.CI) {
    return undefined;
  }

  // Detect available resources
  const availableCpus = cpuCores || require('os').cpus().length;
  const totalMemoryMB = availableMemory || Math.floor(require('os').totalmem() / 1024 / 1024);

  // Calculate workers based on CPU cores (leave one core for system)
  const cpuBasedWorkers = Math.max(1, availableCpus - 1);
  
  // Calculate workers based on available memory
  const memoryBasedWorkers = Math.floor(totalMemoryMB / memoryPerWorker);
  
  // Use the more restrictive limit
  const optimalWorkers = Math.min(cpuBasedWorkers, memoryBasedWorkers, maxWorkers);
  
  // Ensure we meet minimum requirements
  const finalWorkers = Math.max(optimalWorkers, minWorkers);
  
  // Log the decision for debugging
  if (process.env.CI && process.env.PLAYWRIGHT_DEBUG_WORKERS) {
    console.log(`🔧 Worker calculation: CPU cores: ${availableCpus}, Memory: ${totalMemoryMB}MB, Selected: ${finalWorkers} workers`);
  }
  
  return finalWorkers;
}

/**
 * Pre-calculated worker configurations for GitHub Actions
 */
export const GITHUB_ACTIONS_WORKERS = {
  /** Conservative: Good for memory-intensive tests or API rate limiting */
  conservative: 1,
  /** Standard: Good balance for most test suites */
  standard: 2,
  /** Aggressive: Maximum utilization (use with caution for heavy tests) */
  aggressive: calculateOptimalWorkers({ 
    cpuCores: 2, 
    availableMemory: 7000, // 7GB GitHub Actions
    memoryPerWorker: 800,   // More aggressive memory usage
    maxWorkers: 3, 
  }),
} as const;