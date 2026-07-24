// Scene - owns the scene-graph root and tracks the active camera. update() ticks every
// GameObject in the graph; the active camera (the one whose `active` flag is set) is what
// a renderer draws through.

import { AABB } from '../math/AABB';
import { Camera } from '../camera/Camera';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { GameObject } from './GameObject';
import { MeshComponent } from './MeshComponent';
import { Node } from './Node';

/**
 * World-space bounding box of a subtree: unions every GameObject descendant's object-space
 * mesh bounds refit through its world matrix. Returns an empty (invalid) box if the
 * subtree holds no bounded objects.
 */
export function worldBounds(node: Node): AABB {
  const box = AABB.empty();
  node.traversePreOrder((n) => {
    if (n instanceof GameObject) {
      const mesh = n.getComponent(MeshComponent);
      if (mesh && mesh.bounds.valid()) {
        box.encapsulate(mesh.bounds.transformed(n.worldMatrix()));
      }
    }
  });
  return box;
}

export class Scene {
  readonly root = new Node('root');

  /** Optional physics simulation stepped each update (before GameObjects tick). */
  physics: PhysicsWorld | null = null;

  private _activeCamera: Camera | null = null;

  get activeCamera(): Camera | null {
    return this._activeCamera;
  }

  /**
   * Re-resolve the active camera by traversing the graph for the first camera whose
   * `active` flag is set. Call at startup and whenever a camera's flag changes.
   */
  refreshActiveCamera(): void {
    this._activeCamera = null;
    this.root.traversePreOrder((node) => {
      if (this._activeCamera) return;
      if (node instanceof Camera && node.active) this._activeCamera = node;
    });
  }

  /**
   * Advance every GameObject in the graph. Objects are collected into a snapshot first, so
   * behaviour that spawns or destroys objects mid-update cannot corrupt the traversal (new
   * objects tick next frame; destroyed objects have no components left and tick as no-ops).
   */
  update(dtSeconds: number): void {
    this.physics?.step(dtSeconds);
    const objects: GameObject[] = [];
    this.root.traversePreOrder((node) => {
      if (node instanceof GameObject) objects.push(node);
    });
    for (const object of objects) object.update(dtSeconds);
  }
}
