import { describe, expect, it } from 'vitest';
import { Vector3 } from '../math/Vector3';
import { Component } from '../scene/Component';
import { GameObject } from '../scene/GameObject';
import { RigidBodyComponent } from '../scene/RigidBodyComponent';
import { Scene } from '../scene/Scene';
import { createFallingCube, createGround } from '../scene/primitives';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { buildDemoScene, capture, emit, instantiate, parse } from './SceneSerializer';

const FULL_SCENE_YAML = `
scene:
  name: Physics Demo
gameObjects:
  - id: g
    name: ground
    parent: ~
    children: []
    transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
    components: [gm, gb]
  - id: c
    name: cube
    parent: ~
    children: []
    transform: { position: [0, 8, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
    components: [cm, cb]
  - id: s
    name: spinner
    parent: ~
    children: []
    transform: { position: [4, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
    components: [sm, ss]
components:
  - { id: gm, type: MeshComponent, primitive: ground }
  - { id: gb, type: RigidBodyComponent, body: staticGround, halfExtents: [15, 0.1, 15], y: 0 }
  - { id: cm, type: MeshComponent, primitive: cube }
  - { id: cb, type: RigidBodyComponent, body: dynamicBox, halfExtents: [1, 1, 1], density: 10, angularVelocity: [2, 1, 3] }
  - { id: sm, type: MeshComponent, primitive: cube }
  - { id: ss, type: ScriptComponent, typeName: Spinner }
`;

class StubScript extends Component {
  constructor(
    owner: GameObject,
    readonly typeName: string,
  ) {
    super(owner);
  }
}

describe('SceneSerializer physics + scripts', () => {
  it('instantiates mesh, rigid-body and script components via factories', async () => {
    const world = await PhysicsWorld.create();
    const scene = new Scene();
    scene.physics = world;

    const count = instantiate(parse(FULL_SCENE_YAML), scene.root, {
      physics: world,
      factories: {
        ScriptComponent: (obj, desc) => obj.addComponent(StubScript, String(desc.typeName)),
      },
    });
    expect(count).toBe(3);

    const ground = scene.root.findByName('ground');
    const cube = scene.root.findByName('cube');
    const spinner = scene.root.findByName('spinner');
    expect(ground).toBeInstanceOf(GameObject);
    if (ground instanceof GameObject) {
      expect(ground.getComponent(RigidBodyComponent)?.bodyKind).toBe('static');
    }
    if (cube instanceof GameObject) {
      expect(cube.getComponent(RigidBodyComponent)?.bodyKind).toBe('dynamic');
    }
    if (spinner instanceof GameObject) {
      expect(spinner.getComponent(StubScript)?.typeName).toBe('Spinner');
    }
  });

  it('captures rigid-body components back to records that round-trip', async () => {
    const world = await PhysicsWorld.create();
    const scene = new Scene();
    scene.physics = world;
    createGround(scene.root, world);
    createFallingCube(scene.root, world, new Vector3(0, 5, 0));

    const restored = parse(emit(capture(scene, 'T')));
    const types = restored.components.map((c) => c.type).sort();
    expect(types).toEqual([
      'MeshComponent',
      'MeshComponent',
      'RigidBodyComponent',
      'RigidBodyComponent',
    ]);

    const dynamic = restored.components.find(
      (c) => c.type === 'RigidBodyComponent' && c.body === 'dynamicBox',
    );
    expect(dynamic?.density).toBe(10);
    expect(dynamic?.angularVelocity).toEqual([2, 1, 3]);
  });
});

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
