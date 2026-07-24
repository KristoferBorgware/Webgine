// Scene primitives: geometry builders and GameObject factories for the built-in shapes.

import { AABB } from '../math/AABB';
import { Vector3 } from '../math/Vector3';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MeshData } from '../render/mesh';
import { GameObject } from './GameObject';
import { MeshComponent } from './MeshComponent';
import type { Node } from './Node';
import { RigidBodyComponent } from './RigidBodyComponent';

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

/** Half-extent of the built-in ground plane on X and Z. */
export const GROUND_HALF_SIZE = 15;

// A large flat quad in the XZ plane at y = 0, top facing +Y, muted colors. Same winding as
// the cube's +Y face so it is front-facing when seen from above.
// prettier-ignore
const GROUND_VERTICES = new Float32Array([
  // x                  y  z                   r     g     b     a
  -GROUND_HALF_SIZE, 0, -GROUND_HALF_SIZE,   0.10, 0.12, 0.14, 1,
  -GROUND_HALF_SIZE, 0,  GROUND_HALF_SIZE,   0.10, 0.20, 0.20, 1,
   GROUND_HALF_SIZE, 0,  GROUND_HALF_SIZE,   0.16, 0.22, 0.16, 1,
   GROUND_HALF_SIZE, 0, -GROUND_HALF_SIZE,   0.16, 0.14, 0.12, 1,
]);
// prettier-ignore
const GROUND_INDICES = new Uint16Array([0, 1, 2, 0, 2, 3]);

/** Geometry for the large ground quad. */
export function createGroundMesh(): MeshData {
  return { vertices: GROUND_VERTICES.slice(), indices: GROUND_INDICES.slice() };
}

/** Object-space bounds of the ground quad (thin in y, for picking). */
export function groundBounds(): AABB {
  return AABB.fromCenterExtents(
    Vector3.zero(),
    new Vector3(GROUND_HALF_SIZE, 0.01, GROUND_HALF_SIZE),
  );
}

/**
 * Creates a static "ground" GameObject: a rendered quad plus a fixed physics collider whose
 * top surface is at y = 0.
 */
export function createGround(parent: Node, world: PhysicsWorld, name = 'ground'): GameObject {
  const ground = parent.addChild(new GameObject(name));
  ground.addComponent(MeshComponent, createGroundMesh(), groundBounds(), 'ground');
  const body = world.createStaticGround({
    halfExtents: new Vector3(GROUND_HALF_SIZE, 0.1, GROUND_HALF_SIZE),
    y: 0,
  });
  ground.addComponent(RigidBodyComponent, body, 'static', {
    body: 'staticGround',
    halfExtents: [GROUND_HALF_SIZE, 0.1, GROUND_HALF_SIZE],
    y: 0,
  });
  return ground;
}

/**
 * Creates a dynamic "cube" GameObject: a rendered cube plus a dynamic physics box (with an
 * initial tumble) that falls under gravity. The transform and body start at `position`.
 */
export function createFallingCube(
  parent: Node,
  world: PhysicsWorld,
  position: Vector3,
  name = 'cube',
): GameObject {
  const cube = parent.addChild(new GameObject(name));
  cube.transform.position = position.clone();
  cube.addComponent(MeshComponent, createCubeMesh(), cubeBounds(), 'cube');
  const body = world.createDynamicBox({
    halfExtents: Vector3.one(),
    position: position.clone(),
    density: 10,
    angularVelocity: new Vector3(2, 1, 3),
  });
  cube.addComponent(RigidBodyComponent, body, 'dynamic', {
    body: 'dynamicBox',
    halfExtents: [1, 1, 1],
    density: 10,
    angularVelocity: [2, 1, 3],
  });
  return cube;
}
