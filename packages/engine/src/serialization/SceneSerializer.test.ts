import { describe, expect, it } from 'vitest';
import { GameObject } from '../scene/GameObject';
import { Scene } from '../scene/Scene';
import { buildDemoScene, capture, emit, instantiate, parse } from './SceneSerializer';

describe('SceneSerializer', () => {
  it('round-trips a document through YAML text', () => {
    const doc = buildDemoScene();
    const restored = parse(emit(doc));

    expect(restored.name).toBe('Webgine Demo Scene');
    expect(restored.gameObjects.map((o) => o.name)).toEqual(['cube', 'cube-small']);
    expect(restored.components).toHaveLength(2);
    expect(restored.components.every((c) => c.type === 'MeshComponent')).toBe(true);
  });

  it('instantiates a document into a live scene with transforms and components', () => {
    const scene = new Scene();
    const count = instantiate(buildDemoScene(), scene.root);

    expect(count).toBe(2);
    const small = scene.root.findByName('cube-small');
    expect(small).toBeInstanceOf(GameObject);
    if (small instanceof GameObject) {
      expect(small.transform.position.x).toBeCloseTo(3.5);
      expect(small.transform.scale.x).toBeCloseTo(0.5);
      expect(small.components).toHaveLength(1);
    }
  });

  it('captures a live scene back into an equivalent document', () => {
    const scene = new Scene();
    instantiate(buildDemoScene(), scene.root);

    const captured = capture(scene, 'Webgine Demo Scene');
    expect(captured.name).toBe('Webgine Demo Scene');
    expect(captured.gameObjects.map((o) => o.name).sort()).toEqual(['cube', 'cube-small']);
    expect(captured.gameObjects.every((o) => o.parent === null)).toBe(true);
    expect(captured.components).toHaveLength(2);
  });

  it('resolves parent/child references, treating ~ as root', () => {
    const yaml = `
scene:
  name: Parented
gameObjects:
  - id: a
    name: parent
    parent: ~
    children: [b]
    transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
    components: []
  - id: b
    name: child
    parent: a
    children: []
    transform: { position: [1, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
    components: []
components: []
`;
    const scene = new Scene();
    instantiate(parse(yaml), scene.root);

    const child = scene.root.findByName('child');
    expect(child?.parent?.name).toBe('parent');
    expect(scene.root.findByName('parent')?.parent).toBe(scene.root);
  });
});
