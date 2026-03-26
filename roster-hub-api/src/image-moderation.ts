/**
 * Image moderation via Cloudflare Workers AI.
 *
 * Runs @cf/microsoft/resnet-50 (ImageNet 1000-class classifier) on uploaded
 * images and checks the top labels against a blocklist of unsafe categories.
 *
 * IMPORTANT — ESO context: uploaded images are game screenshots showing
 * characters wielding swords, staves, bows, shields, etc.  All fantasy-weapon
 * ImageNet labels (e.g. "scabbard", "hatchet", "shield") are intentionally
 * EXCLUDED from the blocklist so legitimate game content is never rejected.
 *
 * This is NOT a dedicated NSFW classifier.  User reporting (image_reports
 * table) covers the gap for explicit content.
 */

// ─── Blocked ImageNet labels ─────────────────────────────────────────────────
// Labels sourced from the ILSVRC-2012 class list.  Anything matching at a
// confidence ≥ BLOCK_THRESHOLD is rejected before the image reaches ImgBB.
//
// NOTE: Fantasy/medieval weapon labels are ALLOWED because this is an ESO
// (Elder Scrolls Online) build editor — screenshots naturally contain swords,
// staves, bows, shields, axes, maces, daggers, and similar game items.

const BLOCKED_LABELS = new Set([
  // Real-world firearms (not present in ESO screenshots)
  'assault_rifle',
  'rifle',
  'revolver',
  // Real-world projectiles / explosives
  'projectile',
  'missile',
  // Medical / drug paraphernalia
  'syringe',
  // Misc real-world dangerous
  'guillotine',
  'gas_mask',
]);

/** Minimum confidence to trigger a block (0–1). */
const BLOCK_THRESHOLD = 0.25;

/** Maximum image size in bytes (10 MB). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassificationResult {
  label?: string;
  score?: number;
}

export interface ModerationResult {
  safe: boolean;
  /** Top labels returned by the classifier. */
  labels: string[];
  /** Confidence scores corresponding to `labels`. */
  scores: number[];
  /** If blocked, the label that triggered the block. */
  blockedLabel?: string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify an image using Workers AI and determine whether it is safe to host.
 *
 * @param ai  The Workers AI binding (`env.AI`).
 * @param imageBytes  Raw image bytes (PNG, JPEG, WebP, etc.).
 */
export async function moderateImage(ai: Ai, imageBytes: Uint8Array): Promise<ModerationResult> {
  const classifications: ClassificationResult[] = await ai.run('@cf/microsoft/resnet-50', {
    image: [...imageBytes],
  });

  const labels = classifications.map((c) => c.label ?? 'unknown');
  const scores = classifications.map((c) => c.score ?? 0);

  // Check each label against the blocklist
  for (const c of classifications) {
    const label = c.label ?? '';
    const score = c.score ?? 0;
    // ResNet-50 labels may use spaces or underscores — normalise to underscores
    const normalised = label.toLowerCase().replace(/\s+/g, '_');
    if (BLOCKED_LABELS.has(normalised) && score >= BLOCK_THRESHOLD) {
      return { safe: false, labels, scores, blockedLabel: label };
    }
  }

  return { safe: true, labels, scores };
}
