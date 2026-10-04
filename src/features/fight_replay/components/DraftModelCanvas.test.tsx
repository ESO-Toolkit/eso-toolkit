import { act, render, screen } from '@testing-library/react';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three';

import { DraftModelCanvas } from './DraftModelCanvas';

const mockLoads: Array<{
  url: string;
  resolve: (gltf: { scene: Group; scenes: Group[] }) => void;
}> = [];
jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(url: string, resolve: (gltf: { scene: Group; scenes: Group[] }) => void): void {
      mockLoads.push({ url, resolve });
    }
  },
}));
jest.mock('@react-three/drei/core/OrbitControls.js', () => ({ OrbitControls: () => null }));
jest.mock('@react-three/fiber', () => ({ Canvas: () => null, useThree: jest.fn() }));

function makeModel(): {
  scene: Group;
  scenes: Group[];
  geometryDispose: jest.SpyInstance;
  materialDispose: jest.SpyInstance;
  textureDispose: jest.SpyInstance;
} {
  const geometry = new BoxGeometry(2, 3, 1);
  const texture = new Texture();
  const material = new MeshStandardMaterial({ map: texture });
  const scene = new Group();
  const nested = new Group();
  nested.position.set(4, 5, 6);
  nested.add(new Mesh(geometry, material), new Mesh(geometry, material));
  scene.add(nested);
  return {
    scene,
    scenes: [scene],
    geometryDispose: jest.spyOn(geometry, 'dispose'),
    materialDispose: jest.spyOn(material, 'dispose'),
    textureDispose: jest.spyOn(texture, 'dispose'),
  };
}

describe('DraftModelCanvas resource ownership', () => {
  beforeEach(() => {
    mockLoads.length = 0;
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
      getExtension: () => null,
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext);
  });
  afterEach(() => jest.restoreAllMocks());

  it('keeps the complete nested scene and disposes shared resources once on unmount', () => {
    const loaded = makeModel();
    const nested = loaded.scene.children[0];
    const { unmount } = render(
      <DraftModelCanvas modelUrl="/one.glb" name="Draft" posterUrl="/poster.jpg" />,
    );
    act(() => mockLoads[0].resolve(loaded));
    expect(nested.children).toHaveLength(2);
    expect(nested.position.toArray()).toEqual([4, 5, 6]);
    expect(loaded.scene.parent).toBeInstanceOf(Group);
    const normalized = new Box3().setFromObject(loaded.scene.parent!);
    expect(normalized.min.y).toBeCloseTo(0);
    expect(normalized.getSize(new Vector3()).y).toBeCloseTo(2);
    expect(normalized.getCenter(new Vector3()).x).toBeCloseTo(0);
    expect(normalized.getCenter(new Vector3()).z).toBeCloseTo(0);
    expect(screen.getByRole('button', { name: 'Front' })).toBeEnabled();
    unmount();
    expect(loaded.geometryDispose).toHaveBeenCalledTimes(1);
    expect(loaded.materialDispose).toHaveBeenCalledTimes(1);
    expect(loaded.textureDispose).toHaveBeenCalledTimes(1);
  });

  it('disposes late successful requests without replacing the current model', () => {
    const { rerender, unmount } = render(
      <DraftModelCanvas modelUrl="/one.glb" name="Draft" posterUrl="/poster.jpg" />,
    );
    rerender(<DraftModelCanvas modelUrl="/two.glb" name="Draft" posterUrl="/poster.jpg" />);
    const current = makeModel();
    act(() => mockLoads[1].resolve(current));
    const stale = makeModel();
    act(() => mockLoads[0].resolve(stale));
    expect(stale.geometryDispose).toHaveBeenCalledTimes(1);
    expect(stale.materialDispose).toHaveBeenCalledTimes(1);
    expect(stale.textureDispose).toHaveBeenCalledTimes(1);
    expect(stale.scene.parent).toBeNull();
    expect(current.geometryDispose).not.toHaveBeenCalled();
    unmount();
    expect(current.geometryDispose).toHaveBeenCalledTimes(1);
  });

  it('retains the reference image and avoids downloads when WebGL is unavailable', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<DraftModelCanvas modelUrl="/one.glb" name="Draft" posterUrl="/poster.jpg" />);
    expect(screen.getByRole('img', { name: 'Draft draft preview' })).toHaveAttribute(
      'src',
      '/poster.jpg',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('3D preview unavailable');
    expect(mockLoads).toHaveLength(0);
  });
});
