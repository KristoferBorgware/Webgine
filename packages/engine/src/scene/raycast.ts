// Scene raycasting / picking against object bounds. Tests a ray against every
// GameObject's world-space AABB (its object-space mesh bounds refit through its world
// matrix) and returns the nearest hit.

import type { Ray } from '../math/Ray';
import { Vector3 } from '../math/Vector3';
import { GameObject } from './GameObject';
import { MeshComponent } from './MeshComponent';
import type { Node } from './Node';

export interface RayHit {
  hit: boolean;
  /** The object that was hit, or null on a miss. */
  object: GameObject | null;
  /** Distance along the ray from its origin. */
  distance: number;
  /** World-space hit point. */
  point: Vector3;
  /** World-space face normal at the hit. */
  normal: Vector3;
}

function miss(): RayHit {
  return { hit: false, object: null, distance: 0, point: Vector3.zero(), normal: Vector3.zero() };
}

/**
 * Casts `ray` against the subtree rooted at `root` and returns the nearest GameObject
 * whose world-space bounds it enters within `maxDistance`.
 */
export function raycast(root: Node, ray: Ray, maxDistance = Number.POSITIVE_INFINITY): RayHit {
  const best = miss();

  root.traversePreOrder((node) => {
    if (!(node instanceof GameObject)) return;
    const mesh = node.getComponent(MeshComponent);
    if (!mesh || !mesh.bounds.valid()) return;

    const worldBox = mesh.bounds.transformed(node.worldMatrix());
    const result = ray.intersectAABB(worldBox);
    if (!result || result.t > maxDistance) return;
    if (best.hit && result.t >= best.distance) return;

    best.hit = true;
    best.object = node;
    best.distance = result.t;
    best.point = ray.at(result.t);
    best.normal = result.normal;
  });

  return best;
}
