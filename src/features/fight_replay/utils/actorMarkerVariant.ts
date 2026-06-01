/**
 * Live A/B/C actor-marker variant switching for the fight replay.
 *
 * Three visually-distinct in-scene marker designs are mounted behind a runtime toggle so the
 * design can be judged live (rotate the orbit camera, scrub into a stack, flip between variants
 * in motion) rather than from stills. The switch happens at the scene level via React state —
 * NOT a URL param / reload — so flipping never remounts the <Canvas>, time loop, camera, or
 * worker lookup. See Arena3D (owns the state + keyboard cycle) → Arena3DScene → the actor
 * renderer it selects.
 *
 * Variants (research basis in project_actor_marker_redesign memory):
 *  - A "Flat instanced disc + halo"   — the evidence-backed pick: anchor with a flat ground
 *      shape, identity via color, batched as instanced meshes (the existing InstancedReplayActors3D).
 *  - B "Low billboarded pawn"          — flat ground ring + a short CAMERA-FACING billboard card
 *      carrying the role glyph. Tests whether a little "presence"/height helps under the tilted
 *      orbit WITHOUT baking identity onto 3D geometry that foreshortens away.
 *  - C "Tall figure w/ baked glyph"    — a taller 3D body with a role glyph baked onto geometry.
 *      Built only as the explicit "too far / don't ship" reference so the user can feel why the
 *      literature warns against raised bodies + baked glyphs under a rotating camera (occlusion
 *      in dense stacks, glyph rotating away from the viewer).
 */
export type ActorMarkerVariant = 'A' | 'B' | 'C';

export const ACTOR_MARKER_VARIANTS: readonly ActorMarkerVariant[] = ['A', 'B', 'C'] as const;

export const DEFAULT_ACTOR_MARKER_VARIANT: ActorMarkerVariant = 'A';

export const ACTOR_MARKER_VARIANT_LABELS: Record<ActorMarkerVariant, string> = {
  A: 'Flat disc + halo (instanced)',
  B: 'Low billboarded pawn',
  C: 'Tall figure (baked glyph)',
};

/** Cycle A → B → C → A. Pure; used by the keyboard toggle. */
export function nextActorMarkerVariant(current: ActorMarkerVariant): ActorMarkerVariant {
  const index = ACTOR_MARKER_VARIANTS.indexOf(current);
  const nextIndex = (index + 1) % ACTOR_MARKER_VARIANTS.length;
  return ACTOR_MARKER_VARIANTS[nextIndex];
}

/**
 * Read an initial variant from the URL (`?marker=a|b|c`) so a deep link can SEED the starting
 * variant. This is read ONCE to initialize state — live switching is done through React state,
 * never by changing the URL (which would reload and tear down playback). Invalid / missing →
 * the default.
 */
export function readInitialActorMarkerVariant(search?: string): ActorMarkerVariant {
  if (typeof search !== 'string' && typeof window === 'undefined') {
    return DEFAULT_ACTOR_MARKER_VARIANT;
  }

  const query = typeof search === 'string' ? search : window.location.search;
  const params = new URLSearchParams(query);
  const raw = params.get('marker');
  if (!raw) {
    return DEFAULT_ACTOR_MARKER_VARIANT;
  }

  const upper = raw.trim().toUpperCase();
  return (ACTOR_MARKER_VARIANTS as readonly string[]).includes(upper)
    ? (upper as ActorMarkerVariant)
    : DEFAULT_ACTOR_MARKER_VARIANT;
}
