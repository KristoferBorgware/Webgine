import { describe, expect, it } from 'vitest';
import { Ray } from '../math/Ray';
import { Vector3 } from '../math/Vector3';
import { Scene } from './Scene';
import { createCube } from './primitives';
import { raycast } from './raycast';

describe('raycast', () => {
  it('hits a cube at the expected distance and face normal', () => {
    const scene = new Scene();
    const cube = createCube(scene.root);

    // Straight down -Z toward the origin; the cube spans [-1, 1], so entry is at z = 1.
    const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    const hit = raycast(scene.root, ray);

    expect(hit.hit).toBe(true);
    expect(hit.object).toBe(cube);
    expect(hit.distance).toBeCloseTo(4, 5);
    expect(hit.normal.nearEquals(new Vector3(0, 0, 1))).toBe(true);
    expect(hit.point.nearEquals(new Vector3(0, 0, 1))).toBe(true);
  });

  it('picks the nearest of two cubes along the ray', () => {
    const scene = new Scene();
    createCube(scene.root, 'far').transform.position = new Vector3(0, 0, -10);
    const near = createCube(scene.root, 'near');
    near.transform.position = new Vector3(0, 0, 0);

    const hit = raycast(scene.root, new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1)));
    expect(hit.object).toBe(near);
  });

  it('reports a miss when nothing is in the ray path', () => {
    const scene = new Scene();
    createCube(scene.root);
    const hit = raycast(scene.root, new Ray(new Vector3(5, 5, 5), new Vector3(0, 0, -1)));
    expect(hit.hit).toBe(false);
    expect(hit.object).toBeNull();
  });
});
