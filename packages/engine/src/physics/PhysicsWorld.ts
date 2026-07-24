// PhysicsWorld - the engine's physics abstraction, backed by Rapier. It owns the
// simulation and creates rigid bodies; the rest of the engine talks to it (and to
// RigidBody handles) in engine math terms, so the backend stays swappable. Rapier's WASM
// is initialized once per process on the first create().

import RAPIER from '@dimforge/rapier3d-compat';
import type { World as RapierWorld } from '@dimforge/rapier3d-compat';
import { Vector3 } from '../math/Vector3';
import { RigidBody } from './RigidBody';

// Step size is clamped so a long frame (e.g. a background tab) cannot explode the sim.
const MIN_STEP = 1 / 240;
const MAX_STEP = 1 / 30;

let initPromise: Promise<void> | null = null;

export interface DynamicBoxOptions {
  halfExtents: Vector3;
  position: Vector3;
  density?: number;
  angularVelocity?: Vector3;
}

export interface StaticGroundOptions {
  /** Half-size of the ground box; its top surface sits at `y`. */
  halfExtents: Vector3;
  y?: number;
}

export class PhysicsWorld {
  private constructor(private readonly world: RapierWorld) {}

  /** Initializes Rapier (once) and creates a world with the given gravity. */
  static async create(gravity: Vector3 = new Vector3(0, -9.81, 0)): Promise<PhysicsWorld> {
    if (!initPromise) initPromise = RAPIER.init();
    await initPromise;
    return new PhysicsWorld(new RAPIER.World({ x: gravity.x, y: gravity.y, z: gravity.z }));
  }

  /** Advances the simulation by one clamped step. */
  step(dtSeconds: number): void {
    this.world.timestep = Math.min(Math.max(dtSeconds, MIN_STEP), MAX_STEP);
    this.world.step();
  }

  createDynamicBox(options: DynamicBoxOptions): RigidBody {
    const { halfExtents: h, position: p, density = 1, angularVelocity } = options;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z);
    if (angularVelocity) {
      bodyDesc.setAngvel({ x: angularVelocity.x, y: angularVelocity.y, z: angularVelocity.z });
    }
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z).setDensity(density), body);
    return new RigidBody(this.world, body);
  }

  createStaticGround(options: StaticGroundOptions): RigidBody {
    const { halfExtents: h, y = 0 } = options;
    // Center the box a half-height below `y`, so its top surface is exactly at `y`.
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, y - h.y, 0);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z), body);
    return new RigidBody(this.world, body);
  }

  removeBody(body: RigidBody): void {
    body.remove();
  }
}
