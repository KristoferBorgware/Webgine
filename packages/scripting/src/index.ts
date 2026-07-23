// @webgine/scripting - the TypeScript component runtime for game-object behaviour.
// User scripts import from this package: the Script base class, the @serialize decorator,
// the curated scene handles, and the math types needed for authoring.

export { Script } from './Script';
export type { ScriptBinding } from './Script';
export { ScriptComponent } from './ScriptComponent';
export { ScriptRuntime } from './ScriptRuntime';
export type { ScriptRuntimeOptions, ScriptParameter } from './ScriptRuntime';
export {
  serialize,
  getScriptParameters,
  getParameterKeys,
  applyParameters,
  readParameters,
} from './parameters';
export type { ParamMeta, ParamType, ParamOptions } from './parameters';
export { ScriptGameObject, ScriptTransform, ScriptWorld } from './handles';
export type { ScriptContext } from './handles';

// Re-exported for script authoring (scripts import only from '@webgine/scripting').
export { Vector3, Quaternion } from '@webgine/engine';
