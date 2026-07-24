// Component - attaches to a GameObject to extend its behaviour. Components are not
// scene-graph nodes and have no transform of their own; they act through their owning
// GameObject (its transform, its other components). The GameObject owns them and drives
// update() each frame.

import type { GameObject } from './GameObject';

/**
 * A component's editor-facing description. `kind` names the component type; concrete
 * components add their own fields (e.g. a mesh primitive, a script id). This keeps the
 * editor able to introspect components without the engine knowing every component type.
 */
export interface ComponentDescriptor {
  kind: string;
  [field: string]: unknown;
}

export abstract class Component {
  constructor(readonly owner: GameObject) {}

  /** Advance this component's behaviour each frame. */
  update(_dtSeconds: number): void {}

  /**
   * Called when the component is detached from its owner - by removeComponent or when the
   * owning GameObject is disposed. Use it to release resources or run teardown behaviour.
   */
  onDetach(): void {}

  /** Editor-facing description of this component. */
  describe(): ComponentDescriptor {
    return { kind: 'component' };
  }
}
