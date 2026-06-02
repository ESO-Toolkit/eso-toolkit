/**
 * Resolved touch-gesture policy for the replay's OrbitControls, by device + mode.
 *
 * Background: three-stdlib's OrbitControls hardcodes `touch-action: none` on the canvas and has no
 * opt-out (drei #1233, closed not-planned). On the report page that traps page scroll, which the
 * mobile layout sidesteps by making the inline preview non-interactive (the canvas gets
 * pointer-events:none) and only going interactive inside the pseudo-fullscreen overlay, where there
 * is no page to scroll so trapping is fine.
 *
 * Inside that overlay we want a clean, unambiguous gesture set:
 *   - ONE finger  → rotate (OrbitControls' default single-touch action).
 *   - TWO fingers → pinch-zoom, owned by CanvasWheelZoom (which re-implements pinch because
 *                   OrbitControls' enableZoom is off).
 * The problem on mobile is that OrbitControls' TWO-finger action (DOLLY_PAN → pan, since zoom is
 * off) fires on the same touchmove as CanvasWheelZoom's pinch — a collision. We resolve it by
 * disabling OrbitControls pan on mobile-immersive, leaving two fingers to CanvasWheelZoom alone.
 * Desktop keeps pan (mouse right-drag / two-finger trackpad) untouched.
 */
export interface TouchPolicy {
  /** OrbitControls `enablePan`. Off only on mobile-immersive (frees two fingers for pinch). */
  enablePan: boolean;
  /** OrbitControls `enableRotate`. Always on — one-finger / left-drag rotate is the core gesture. */
  enableRotate: boolean;
  /** Who owns pinch-zoom. Always CanvasWheelZoom (OrbitControls enableZoom stays off everywhere). */
  pinchOwner: 'CanvasWheelZoom';
}

/**
 * @param isMobile     narrow-viewport replay layout (from useIsMobileReplay)
 * @param isImmersive  filling the screen — native fullscreen on desktop, pseudo-fullscreen on mobile
 */
export function resolveTouchPolicy(isMobile: boolean, isImmersive: boolean): TouchPolicy {
  const mobileImmersive = isMobile && isImmersive;
  return {
    // Disable pan only when a mobile device is in the immersive overlay, so its two-finger gesture
    // is exclusively pinch-zoom (CanvasWheelZoom). Everywhere else pan stays enabled as before.
    enablePan: !mobileImmersive,
    enableRotate: true,
    pinchOwner: 'CanvasWheelZoom',
  };
}
