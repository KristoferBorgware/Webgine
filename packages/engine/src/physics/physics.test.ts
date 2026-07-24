import { describe, expect, it } from 'vitest';
import { Vector3 } from '../math/Vector3';
import { EditorHost } from '../editor/EditorHost';
import { Scene } from '../scene/Scene';
import { createFallingCube, createGround } from '../scene/primitives';
import { PhysicsWorld } from './PhysicsWorld';

const REST_MIN = 0.8;
const REST_MAX = 1.3; // a unit cube resting on ground with top at y=0 settles near y=1

describe('physics', () => {
  it('drops a dynamic box onto the ground and settles near its rest height', async () => {
    const world = await PhysicsWorld.create();
    world.createStaticGround({ halfExtents: new Vector3(15, 0.1, 15), y: 0 });
    const box = world.createDynamicBox({
      halfExtents: Vector3.one(),
      position: new Vector3(0, 6, 0),
      density: 10,
    });

    for (let i = 0; i < 200; i++) world.step(1 / 60);

    const y = box.getPosition().y;
    expect(y).toBeGreaterThan(REST_MIN);
    expect(y).toBeLessThan(REST_MAX);
  });

  it('lands a falling cube through Scene.update and syncs its transform', async () => {
    const world = await PhysicsWorld.create();
    const scene = new Scene();
    scene.physics = world;
    createGround(scene.root, world);
    const cube = createFallingCube(scene.root, world, new Vector3(0, 6, 0));

    for (let i = 0; i < 200; i++) scene.update(1 / 60);

    expect(cube.transform.position.y).toBeGreaterThan(REST_MIN);
    expect(cube.transform.position.y).toBeLessThan(REST_MAX);
  });

  it('resets physics to the pre-play state on stop', async () => {
    const world = await PhysicsWorld.create();
    const scene = new Scene();
    scene.physics = world;
    createGround(scene.root, world);
    const cube = createFallingCube(scene.root, world, new Vector3(0, 8, 0));
    const host = new EditorHost(scene);

    host.play(); // snapshots the cube at y = 8
    for (let i = 0; i < 120; i++) host.update(1 / 60);
    expect(cube.transform.position.y).toBeLessThan(7); // it has fallen

    host.stop();
    expect(cube.transform.position.y).toBeCloseTo(8, 3); // transform reset

    // The body reset too: replaying drops it from 8 again (it was not left resting).
    host.play();
    host.update(1 / 30);
    expect(cube.transform.position.y).toBeLessThan(8);
    expect(cube.transform.position.y).toBeGreaterThan(7);
  });
});
