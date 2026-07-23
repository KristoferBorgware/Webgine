// Base class for user scripts - the scripting equivalent of a MonoBehaviour. Derive from
// it and attach the subclass to a GameObject via a ScriptComponent. Lifecycle: onLoad once
// after attach (and again after each hot reload), tick every frame, onDestroy when the
// component or object is destroyed (and before each hot reload). Scene access is through
// the curated gameObject / transform / world handles.

import type { GameObject } from '@webgine/engine';
import { ScriptGameObject, ScriptTransform, ScriptWorld, type ScriptContext } from './handles';

/** Scene binding injected by the runtime after a script is constructed. */
export interface ScriptBinding {
  readonly gameObject: GameObject;
  readonly context: ScriptContext;
}

export abstract class Script {
  private boundState: ScriptBinding | null = null;

  /** Injects scene access. Called by the runtime; not part of the scripting surface. */
  bind(binding: ScriptBinding): void {
    this.boundState = binding;
  }

  private get binding(): ScriptBinding {
    if (!this.boundState) throw new Error('Script is not attached to a GameObject.');
    return this.boundState;
  }

  /** The object this script is attached to. */
  get gameObject(): ScriptGameObject {
    return new ScriptGameObject(this.binding.gameObject, this.binding.context);
  }

  /** Shorthand for gameObject.transform. */
  get transform(): ScriptTransform {
    return this.gameObject.transform;
  }

  /** Scene-level capabilities: find existing objects, spawn new ones. */
  get world(): ScriptWorld {
    return new ScriptWorld(this.binding.context);
  }

  onLoad(): void {}
  tick(_dtSeconds: number): void {}
  onDestroy(): void {}
}
