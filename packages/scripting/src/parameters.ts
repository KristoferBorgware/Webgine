// Public-parameter metadata for scripts. A `@serialize` decorator marks the fields a
// script exposes; the runtime and the editor read the resulting schema to enumerate,
// display and persist those values. TypeScript has no runtime field reflection, so the
// decorator records each field into a per-class registry, and the concrete type/default
// are derived from a freshly constructed probe instance.

import { Vector3 } from '@webgine/engine';

/** Editor-facing kind of a parameter, inferred from its default value. */
export type ParamType = 'number' | 'boolean' | 'string' | 'vector3';

/** Presentation/validation hints supplied to `@serialize`. */
export interface ParamOptions {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}

/** One exposed parameter: its field key, inferred type, default value, and options. */
export interface ParamMeta {
  key: string;
  type: ParamType;
  default: unknown;
  options: ParamOptions;
}

// Script constructor shape (parameterless; the runtime injects context after construction).
type ScriptCtor = new () => object;

const registry = new WeakMap<object, Map<string, ParamOptions>>();
const schemaCache = new WeakMap<object, ParamMeta[]>();

/**
 * Marks a script field as a public parameter the editor can enumerate and edit.
 * `@serialize()` or `@serialize({ min, max, step, label })`.
 */
export function serialize(options: ParamOptions = {}) {
  return (target: object, propertyKey: string): void => {
    const ctor = (target as { constructor: object }).constructor;
    let params = registry.get(ctor);
    if (!params) {
      params = new Map();
      registry.set(ctor, params);
    }
    params.set(propertyKey, options);
  };
}

function inferType(value: unknown): ParamType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Vector3) return 'vector3';
  return 'string';
}

function cloneValue(value: unknown): unknown {
  return value instanceof Vector3 ? value.clone() : value;
}

/**
 * The parameter schema for a script class: one entry per `@serialize`d field, with its
 * inferred type and default value (read from a probe instance). Cached per class.
 */
export function getScriptParameters(ctor: ScriptCtor): ParamMeta[] {
  const cached = schemaCache.get(ctor);
  if (cached) return cached;

  const params = registry.get(ctor);
  if (!params || params.size === 0) {
    schemaCache.set(ctor, []);
    return [];
  }

  const probe = new ctor() as Record<string, unknown>;
  const meta: ParamMeta[] = [];
  for (const [key, options] of params) {
    const value = probe[key];
    meta.push({ key, type: inferType(value), default: cloneValue(value), options });
  }
  schemaCache.set(ctor, meta);
  return meta;
}

/** The `@serialize`d field keys of a script class (order-preserving). */
export function getParameterKeys(ctor: ScriptCtor): string[] {
  return getScriptParameters(ctor).map((p) => p.key);
}

/** Copies `values` onto a script instance for every key that is a known parameter. */
export function applyParameters(instance: object, values: Readonly<Record<string, unknown>>): void {
  const ctor = instance.constructor as ScriptCtor;
  const keys = new Set(getParameterKeys(ctor));
  const target = instance as Record<string, unknown>;
  for (const key of Object.keys(values)) {
    if (keys.has(key)) target[key] = cloneValue(values[key]);
  }
}

/** Reads the current parameter values off a script instance. */
export function readParameters(instance: object): Record<string, unknown> {
  const ctor = instance.constructor as ScriptCtor;
  const target = instance as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of getParameterKeys(ctor)) out[key] = cloneValue(target[key]);
  return out;
}
