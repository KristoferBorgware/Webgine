// ScriptComponent - attaches a script (by type name) to a GameObject, sitting alongside
// other components and driven by the normal Scene.update traversal. It holds only a stable
// id minted by the runtime; hot reloads replace the script instance behind that id without
// touching this component. onDetach (fired by removeComponent / GameObject.dispose) tears
// the script down.

import { Component, type ComponentDescriptor, type GameObject } from '@webgine/engine';
import type { ScriptRuntime } from './ScriptRuntime';

export class ScriptComponent extends Component {
  /** Stable across hot reloads. */
  readonly id: number;

  constructor(
    owner: GameObject,
    private readonly runtime: ScriptRuntime,
    readonly typeName: string,
    parameters: Readonly<Record<string, unknown>> = {},
  ) {
    super(owner);
    this.id = runtime.register(typeName, owner, parameters);
  }

  override update(dtSeconds: number): void {
    this.runtime.tick(this.id, dtSeconds);
  }

  override onDetach(): void {
    this.runtime.destroy(this.id);
  }

  override describe(): ComponentDescriptor {
    return { kind: 'script', scriptId: this.id, typeName: this.typeName };
  }
}
