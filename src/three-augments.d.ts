/**
 * Module augmentations for broken @types/three 0.183.x and @react-three/drei 10.7.x.
 *
 * - @types/three 0.183.1: extras/core/Shape.d.ts is absent from the npm package.
 * - @react-three/drei 10.7.7: Texture.d.ts is absent from the npm package.
 *
 * Both classes exist at runtime. This file adds minimal type declarations so TypeScript
 * can compile. Remove this file once the upstream packages are fixed.
 */

// `export {}` makes this a module file so that `declare module` blocks below are
// proper augmentations rather than ambient replacements of the entire module.
export {};

declare module 'three' {
  export class Shape {
    uuid: string;
    autoClose: boolean;
    currentPoint: { x: number; y: number };
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this;
    bezierCurveTo(cpX: number, cpY: number, cpX2: number, cpY2: number, x: number, y: number): this;
    closePath(): this;
  }
}

declare module '@react-three/drei' {
  import type { Texture } from 'three';
  export function useTexture(url: string, onLoad?: (texture: Texture) => void): Texture;
  export function useTexture(url: string[], onLoad?: (textures: Texture[]) => void): Texture[];
}
