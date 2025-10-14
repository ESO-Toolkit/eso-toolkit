# GitHub Actions Environment Variables for Playwright Worker Optimization

Add these environment variables to your GitHub Actions workflows to optimize and debug worker settings:

## Basic Optimization (Recommended)
```yaml
env:
  # Enable worker debugging
  PLAYWRIGHT_DEBUG_WORKERS: true
  
  # Optional: Override default calculations
  # PLAYWRIGHT_MAX_WORKERS: 3
  # PLAYWRIGHT_MEMORY_PER_WORKER: 900
```

## Conservative Mode (For resource-constrained tests)
```yaml
env:
  PLAYWRIGHT_CONSERVATIVE_MODE: true
```

## Aggressive Mode (For well-optimized tests)
```yaml
env:
  PLAYWRIGHT_WORKERS: 3
  PLAYWRIGHT_MEMORY_PER_WORKER: 700
```

## Example Integration in PR Checks
```yaml
- name: Run Playwright Tests
  run: npx playwright test
  env:
    PLAYWRIGHT_DEBUG_WORKERS: true
    PLAYWRIGHT_MAX_WORKERS: 2
    # Add memory constraints for screenshot tests
    PLAYWRIGHT_MEMORY_PER_WORKER: 1200
```

## Monitoring Resource Usage
Add this step before tests to see available resources:
```yaml
- name: Display System Resources
  run: |
    echo "CPU cores: $(nproc)"
    echo "Memory: $(free -h)"
    echo "Disk space: $(df -h)"
```