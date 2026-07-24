import { describe, expect, it } from 'vitest';
import { Vector3 } from '../math/Vector3';
import { Camera } from '../camera/Camera';
import { GameObject } from '../scene/GameObject';
import { Component } from '../scene/Component';
import { Scene } from '../scene/Scene';
import { Ray } from '../math/Ray';
import { createCube } from '../scene/primitives';
import { raycast } from '../scene/raycast';
import { EditorHost } from './EditorHost';
import type { SelectionChangedEvent } from './messages';

function sceneWithCubeAndCamera(): { scene: Scene; cube: GameObject } {
  const scene = new Scene();
  const cube = createCube(scene.root, 'cube');
  const camera = scene.root.addChild(new Camera('camera'));
  camera.eye = new Vector3(0, 0, 5);
  camera.target = new Vector3(0, 0, 0);
  camera.active = true;
  scene.refreshActiveCamera();
  return { scene, cube };
}

describe('EditorHost', () => {
  it('enumerates the scene hierarchy', () => {
    const { scene } = sceneWithCubeAndCamera();
    const tree = new EditorHost(scene).getTree();
    expect(tree.map((n) => `${n.name}:${n.kind}`)).toEqual(['cube:gameObject', 'camera:camera']);
  });

  it('picks a GameObject and emits a selection event', () => {
    const { scene, cube } = sceneWithCubeAndCamera();
    const host = new EditorHost(scene);
    const events: SelectionChangedEvent[] = [];
    host.on((e) => {
      if (e.type === 'selectionChanged') events.push(e);
    });

    // Sanity: a centered ray hits the cube.
    expect(raycast(scene.root, new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1))).object).toBe(
      cube,
    );

    const id = host.pick(50, 50, 100, 100); // center of a 100x100 viewport
    expect(id).toBe(cube.id);
    expect(host.getSelection()).toBe(cube.id);
    expect(events.at(-1)?.id).toBe(cube.id);
  });

  it('clears the selection on a miss', () => {
    const { scene } = sceneWithCubeAndCamera();
    const host = new EditorHost(scene);
    host.select('anything');
    const id = host.pick(0, 0, 100, 100); // corner ray misses the cube
    expect(id).toBeNull();
    expect(host.getSelection()).toBeNull();
  });

  it('reports and edits the selected object through the inspector', () => {
    const { scene, cube } = sceneWithCubeAndCamera();
    const host = new EditorHost(scene);

    const data = host.getInspector(cube.id);
    expect(data?.name).toBe('cube');
    expect(data?.components.map((c) => c.kind)).toEqual(['mesh']);

    host.setPosition(cube.id, [1, 2, 3]);
    expect(cube.transform.position.equals(new Vector3(1, 2, 3))).toBe(true);
    host.setScale(cube.id, [2, 2, 2]);
    expect(cube.transform.scale.equals(new Vector3(2, 2, 2))).toBe(true);
  });

  it('advances the scene only while playing', () => {
    const { scene } = sceneWithCubeAndCamera();
    let ticks = 0;
    class Ticker extends Component {
      override update(): void {
        ticks += 1;
      }
    }
    scene.root.addChild(new GameObject('obj')).addComponent(Ticker);
    const host = new EditorHost(scene);

    host.update(0.016); // editing: frozen
    expect(ticks).toBe(0);
    host.play();
    host.update(0.016); // playing
    host.update(0.016);
    expect(ticks).toBe(2);
    host.pause();
    host.update(0.016); // frozen again
    expect(ticks).toBe(2);
  });

  it('reverts transforms on stop', () => {
    const { scene, cube } = sceneWithCubeAndCamera();
    const host = new EditorHost(scene);

    host.play(); // snapshots the cube at the origin
    cube.transform.position = new Vector3(9, 9, 9); // as if a script moved it
    expect(host.getPlayState()).toBe('playing');

    host.stop();
    expect(host.getPlayState()).toBe('editing');
    expect(cube.transform.position.equals(Vector3.zero())).toBe(true);
  });
});
