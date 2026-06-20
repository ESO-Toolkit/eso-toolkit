import * as THREE from 'three';

/**
 * Build a crisp, high-contrast canvas texture for a shape's text label. Unlike the marker label
 * texture (short fixed-size glyphs like "MT"), shape labels can be whole words ("kite path",
 * "12.4m"), so the font auto-shrinks to fit the canvas width. A heavy dark outline keeps the white
 * text legible over any fill colour or floor. The canvas is a fixed 2:1 power-of-two so the caller
 * can always render it on a 2:1 sprite without distortion.
 */
export function createShapeLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;

  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const maxWidth = canvas.width * 0.9;
  let fontSize = Math.floor(canvas.height * 0.62);
  ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  const measured = ctx.measureText(text).width;
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
  ctx.strokeText(text, cx, cy);
  ctx.lineWidth = fontSize * 0.16;
  ctx.strokeText(text, cx, cy);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}
