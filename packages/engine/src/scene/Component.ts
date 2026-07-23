// Component - attaches to a GameObject to extend its behaviour. Components are not
// scene-graph nodes and have no transform of their own; they act through their owning
// GameObject (its transform, its other components). The GameObject owns them and drives
// update() each frame.

import type { GameObject } from './GameObject';

export abstract class Component {
  constructor(readonly owner: GameObject) {}

  /** Advance this component's behaviour each frame. */
  update(_dtSeconds: number): void {}

  /**
   * Called when the component is detached from its owner - by removeComponent or when the
   * owning GameObject is disposed. Use it to release resources or run teardown behaviour.
   */
  onDetach(): void {}
}
