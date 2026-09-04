import * as THREE from 'three';

/**
 * Build a crisp, high-contrast canvas texture for a shape's text label. Unlike the marker label
 * texture (short fixed-size glyphs like "MT"), shape labels can be whole words ("kite path",
 * "12.4m"), so the font auto-shrinks to fit the canvas width. A heavy dark outline keeps the white
 * text legible over any fill colour or floor. The canvas is a fixed 2:1 power-of-two so the caller
 * can always render it on a 2:1 sprite without distortion.
 */
/**
 * Maximum label length accepted here (display-only truncation; the canonical 500-char cap lives
 * in the markers manager — this is the render-layer backstop for labels that bypass it).
 */
export const MAX_SHAPE_LABEL_TEXTURE_CHARS = 120;

/** Tier-aware anisotropy cap for label textures (tiny sprites never need the floor's 16x). */
export const LABEL_ANISOTROPY_CAP = 8;

export function createShapeLabelTexture(text: string, maxAnisotropy = 16): THREE.CanvasTexture {
  // Truncate pathological labels: a 10k-char string would rasterize into an illegible blob and
  // waste a full 512×256 upload for zero information.
  const clipped =
    text.length > MAX_SHAPE_LABEL_TEXTURE_CHARS
      ? text.slice(0, MAX_SHAPE_LABEL_TEXTURE_CHARS - 1) + '…'
      : text;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;

  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const maxWidth = canvas.width * 0.9;
  let fontSize = Math.floor(canvas.height * 0.62);
  ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  const measured = ctx.measureText(clipped).width;
  if (measured > maxWidth) {
    fontSize = Math.max(34, Math.floor((fontSize * maxWidth) / measured));
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // Two-pass dark outline (wide soft halo then tight crisp edge) for contrast on any background.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
  ctx.lineWidth = fontSize * 0.32;
  ctx.strokeText(clipped, cx, cy);
  ctx.lineWidth = fontSize * 0.16;
  ctx.strokeText(clipped, cx, cy);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(clipped, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.min(maxAnisotropy, LABEL_ANISOTROPY_CAP);
  texture.needsUpdate = true;
  return texture;
}
