// GameObject - a scene entity: a Node (hierarchy) that owns a Transform and a set of
// attached Components. The Transform lives here - the Node base holds none - so a
// GameObject's local matrix comes from its transform. Behaviour is extended purely
// through attached Components; update() delegates to each one.

import { v4 as uuidv4 } from 'uuid';
import { Matrix4x4 } from '../math/Matrix4x4';
import { Transform } from '../math/Transform';
import type { Component } from './Component';
import { Node } from './Node';

/** Constructor for a Component subclass, taking its owner plus any extra arguments. */
export type ComponentCtor<T extends Component, A extends unknown[]> = new (
  owner: GameObject,
  ...args: A
) => T;

export class GameObject extends Node {
  /** Stable identifier used to reference this object (e.g. in serialized scenes). */
  readonly id: string;

  readonly transform: Transform;

  private readonly _components: Component[] = [];

  constructor(name = '', id: string = uuidv4()) {
    super(name);
    this.id = id;
    this.transform = Transform.identity();
  }

  get components(): readonly Component[] {
    return this._components;
  }

  // --- components ---

  /** Constructs `ctor(this, ...args)`, attaches it, and returns it. */
  addComponent<T extends Component, A extends unknown[]>(ctor: ComponentCtor<T, A>, ...args: A): T {
    const component = new ctor(this, ...args);
    this._components.push(component);
    return component;
  }

  /** First attached component that is an instance of `ctor`, else undefined. */
  getComponent<T extends Component>(ctor: abstract new (...args: never[]) => T): T | undefined {
    for (const component of this._components) {
      if (component instanceof ctor) return component;
    }
    return undefined;
  }

  /** Detaches `component`. Returns false if it was not attached here. */
  removeComponent(component: Component): boolean {
    const i = this._components.indexOf(component);
    if (i < 0) return false;
    this._components.splice(i, 1);
    return true;
  }

  // --- lifecycle ---

  update(dtSeconds: number): void {
    for (const component of this._components) component.update(dtSeconds);
  }

  /** The node's local matrix is this object's transform (the single source of truth). */
  override localMatrix(): Matrix4x4 {
    return this.transform.toMatrix();
  }
}
