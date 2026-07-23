// The curated interface scripts use to touch the scenegraph. These handles wrap engine
// objects behind a narrow, sanctioned surface - scripts can read/write transforms, find
// objects, spawn primitives, and destroy objects, but never reach raw engine internals
// (Node, Scene, GPU state).

import { createCube, GameObject } from '@webgine/engine';
import type { Node, Quaternion, Transform, Vector3 } from '@webgine/engine';

/** Scene-bound capabilities the handles need. Supplied by the runtime, hidden from scripts. */
export interface ScriptContext {
  /** Scene root, used to find and to parent spawned objects. */
  readonly root: Node;
  /** Removes an object from the scene, firing component detach hooks. */
  destroy(object: GameObject): void;
}

/** Read/write view over a GameObject's transform. */
export class ScriptTransform {
  constructor(private readonly transform: Transform) {}

  get position(): Vector3 {
    return this.transform.position;
  }
  set position(value: Vector3) {
    this.transform.position = value;
  }

  get rotation(): Quaternion {
    return this.transform.rotation;
  }
  set rotation(value: Quaternion) {
    this.transform.rotation = value;
  }

  get scale(): Vector3 {
    return this.transform.scale;
  }
  set scale(value: Vector3) {
    this.transform.scale = value;
  }

  /** Rotates by `radians` around `axis` (applied after the current rotation). */
  rotate(axis: Vector3, radians: number): void {
    this.transform.rotateAxisAngle(axis, radians);
  }

  translate(delta: Vector3): void {
    this.transform.translate(delta);
  }

  forward(): Vector3 {
    return this.transform.forward();
  }
  right(): Vector3 {
    return this.transform.right();
  }
  up(): Vector3 {
    return this.transform.up();
  }
}

/** Handle to a GameObject in the scene. */
export class ScriptGameObject {
  constructor(
    private readonly node: GameObject,
    private readonly context: ScriptContext,
  ) {}

  get name(): string {
    return this.node.name;
  }

  get transform(): ScriptTransform {
    return new ScriptTransform(this.node.transform);
  }

  /** Removes this object from the scene. Its scripts receive onDestroy. */
  destroy(): void {
    this.context.destroy(this.node);
  }
}

/** Scene-level capabilities: find existing objects and spawn new primitives. */
export class ScriptWorld {
  constructor(private readonly context: ScriptContext) {}

  /** First object named `name` in the scene, or null. */
  find(name: string): ScriptGameObject | null {
    const node = this.context.root.findByName(name);
    return node instanceof GameObject ? new ScriptGameObject(node, this.context) : null;
  }

  /** Spawns a cube at the scene root and returns a handle to it. */
  spawnCube(name = 'cube', position?: Vector3): ScriptGameObject {
    const cube = createCube(this.context.root, name);
    if (position) cube.transform.position = position;
    return new ScriptGameObject(cube, this.context);
  }
}
