// Handle over a physics body: reads and writes its pose and velocity in engine math terms.
// Created by PhysicsWorld; not constructed directly by callers.

import type { RigidBody as RapierBody, World as RapierWorld } from '@dimforge/rapier3d-compat';
import { Quaternion } from '../math/Quaternion';
import { Vector3 } from '../math/Vector3';

export class RigidBody {
  constructor(
    private readonly world: RapierWorld,
    private readonly body: RapierBody,
  ) {}

  getPosition(): Vector3 {
    const t = this.body.translation();
    return new Vector3(t.x, t.y, t.z);
  }

  getRotation(): Quaternion {
    const r = this.body.rotation();
    return new Quaternion(r.x, r.y, r.z, r.w);
  }

  /** Teleports the body to a pose (used to reset a body to an authored/edit-time state). */
  setPose(position: Vector3, rotation: Quaternion): void {
    this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    this.body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }, true);
  }

  setLinearVelocity(v: Vector3): void {
    this.body.setLinvel({ x: v.x, y: v.y, z: v.z }, true);
  }

  setAngularVelocity(v: Vector3): void {
    this.body.setAngvel({ x: v.x, y: v.y, z: v.z }, true);
  }

  wake(): void {
    this.body.wakeUp();
  }

  /** Removes the body (and its colliders) from the world. */
  remove(): void {
    this.world.removeRigidBody(this.body);
  }
}
