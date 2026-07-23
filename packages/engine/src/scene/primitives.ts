// Scene primitives: geometry builders and GameObject factories for the built-in shapes.

import { AABB } from '../math/AABB';
import { Vector3 } from '../math/Vector3';
import type { MeshData } from '../render/mesh';
import { GameObject } from './GameObject';
import { MeshComponent } from './MeshComponent';
import type { Node } from './Node';

// A unit cube spanning [-1, 1] on each axis. Eight corners, each a distinct color by
// position; triangles are wound counter-clockwise when seen from outside (front-facing
// under a right-handed camera with counter-clockwise front faces).
// prettier-ignore
const CUBE_VERTICES = new Float32Array([
  // x   y   z    r  g  b  a
  -1, -1, -1,    0, 0, 0, 1,
  -1,  1, -1,    0, 1, 0, 1,
   1,  1, -1,    1, 1, 0, 1,
   1, -1, -1,    1, 0, 0, 1,
  -1, -1,  1,    0, 0, 1, 1,
  -1,  1,  1,    0, 1, 1, 1,
   1,  1,  1,    1, 1, 1, 1,
   1, -1,  1,    1, 0, 1, 1,
]);

// prettier-ignore
const CUBE_INDICES = new Uint16Array([
  0, 1, 2,  0, 2, 3, // -Z
  4, 6, 5,  4, 7, 6, // +Z
  4, 5, 1,  4, 1, 0, // -X
  3, 2, 6,  3, 6, 7, // +X
  1, 5, 6,  1, 6, 2, // +Y
  4, 0, 3,  4, 3, 7, // -Y
]);

/** Geometry for a unit cube (extent 1 on each axis). */
export function createCubeMesh(): MeshData {
  return { vertices: CUBE_VERTICES.slice(), indices: CUBE_INDICES.slice() };
}

/** Object-space bounds of the unit cube. */
export function cubeBounds(): AABB {
  return AABB.fromCenterExtents(Vector3.zero(), Vector3.one());
}

/**
 * Creates a "cube" GameObject (mesh + matching bounds) as a child of `parent` and returns
 * it.
 */
export function createCube(parent: Node, name = 'cube'): GameObject {
  const cube = parent.addChild(new GameObject(name));
  cube.addComponent(MeshComponent, createCubeMesh(), cubeBounds(), 'cube');
  return cube;
}
