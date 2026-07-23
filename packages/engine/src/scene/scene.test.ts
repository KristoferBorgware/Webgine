import { describe, expect, it } from 'vitest';
import { Vector3 } from '../math/Vector3';
import { Camera } from '../camera/Camera';
import { Component } from './Component';
import { GameObject } from './GameObject';
import { MeshComponent } from './MeshComponent';
import { Scene } from './Scene';
import { createCube } from './primitives';

describe('scene graph', () => {
  it('composes world transforms through the hierarchy', () => {
    const scene = new Scene();
    const parent = scene.root.addChild(new GameObject('parent'));
    parent.transform.position = new Vector3(2, 0, 0);
    const child = parent.addChild(new GameObject('child'));
    child.transform.position = new Vector3(1, 0, 0);

    const world = child.worldMatrix().transformPoint(Vector3.zero());
    expect(world.nearEquals(new Vector3(3, 0, 0))).toBe(true);
  });

  it('finds nodes by name and resolves components', () => {
    const scene = new Scene();
    const cube = createCube(scene.root);
    expect(scene.root.findByName('cube')).toBe(cube);
    expect(cube.getComponent(MeshComponent)?.primitive).toBe('cube');
  });

  it('ticks components on update', () => {
    class Counter extends Component {
      ticks = 0;
      override update(): void {
        this.ticks += 1;
      }
    }
    const scene = new Scene();
    const object = scene.root.addChild(new GameObject('obj'));
    const counter = object.addComponent(Counter);

    scene.update(0.016);
    scene.update(0.016);
    expect(counter.ticks).toBe(2);
  });

  it('resolves the active camera', () => {
    const scene = new Scene();
    scene.root.addChild(new Camera('inactive'));
    const active = scene.root.addChild(new Camera('active'));
    active.active = true;

    scene.refreshActiveCamera();
    expect(scene.activeCamera).toBe(active);
  });
});
