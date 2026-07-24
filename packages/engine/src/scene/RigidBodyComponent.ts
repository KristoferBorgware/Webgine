// RigidBodyComponent - couples a GameObject to a physics body. A dynamic body drives its
// owner: each frame the simulated pose is copied into the transform. A static body does
// not move, so it leaves the authored transform alone (its collider is positioned to match).
// On a scene reset the dynamic body snaps back to the owner's (restored) transform with no
// velocity, and detaching removes the body from the world.

import { Vector3 } from '../math/Vector3';
import type { RigidBody } from '../physics/RigidBody';
import { Component, type ComponentDescriptor, type SerializedComponent } from './Component';
import type { GameObject } from './GameObject';

export type BodyKind = 'dynamic' | 'static';

export class RigidBodyComponent extends Component {
  constructor(
    owner: GameObject,
    readonly body: RigidBody,
    readonly bodyKind: BodyKind = 'dynamic',
    /** Authoring fields (shape, density, initial spin) preserved for serialization. */
    private readonly serializedFields: Readonly<Record<string, unknown>> = {},
  ) {
    super(owner);
  }

  override update(): void {
    if (this.bodyKind !== 'dynamic') return;
    this.owner.transform.position = this.body.getPosition();
    this.owner.transform.rotation = this.body.getRotation();
  }

  override onSceneReset(): void {
    if (this.bodyKind !== 'dynamic') return;
    this.body.setPose(this.owner.transform.position, this.owner.transform.rotation);
    this.body.setLinearVelocity(Vector3.zero());
    this.body.setAngularVelocity(Vector3.zero());
  }

  override onDetach(): void {
    this.body.remove();
  }

  override describe(): ComponentDescriptor {
    return { kind: 'rigidBody', bodyKind: this.bodyKind };
  }

  override serialize(): SerializedComponent | null {
    return { type: 'RigidBodyComponent', ...this.serializedFields };
  }
}
