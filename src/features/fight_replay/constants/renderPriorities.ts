/**
 * Centralized render priorities for useFrame callbacks in the fight replay system.
 *
 * When using useFrame with a priority, React Three Fiber disables automatic rendering
 * and requires manual render calls. Lower numbers = higher priority (execute first).
 *
 * Priority order ensures proper frame execution:
 * 1. Camera updates (highest priority - execute first)
 * 2. Actor positions (depends on camera)
 * 3. UI/HUD elements (depends on camera and actors)
 * 4. Visual effects (lowest scene priority)
 * 5. Manual render (executes last to output final frame)
 */
export enum RenderPriority {
  /** Follower camera updates */
  FOLLOWER_CAMERA = 0,

  /** Camera controls and camera-related updates */
  CAMERA = 1,

  /** Actor position updates that depend on camera state */
  ACTORS = 2,

  /** HUD and UI elements that depend on camera and actor positions */
  HUD = 3,

  /** Visual effects, textures, and other non-critical updates */
  EFFECTS = 4,

  /** Manual render call - must be last to render final output (highest number = lowest priority) */
  RENDER = 999,
}

/**
 * Default render priority for components that don't need explicit ordering.
 * Uses undefined to maintain automatic rendering for non-critical components.
 */
export const DEFAULT_RENDER_PRIORITY = undefined;
