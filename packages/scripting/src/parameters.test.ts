import { describe, expect, it } from 'vitest';
import { Vector3 } from '@webgine/engine';
import { applyParameters, getScriptParameters, readParameters, serialize } from './parameters';

// Apply the decorator programmatically so the test needs no decorator syntax.
class Demo {
  speed = 1.5;
  enabled = true;
  label = 'hi';
  offset = new Vector3(1, 2, 3);
  hidden = 7; // not serialized
}
serialize({ min: 0, max: 10, step: 0.5 })(Demo.prototype, 'speed');
serialize()(Demo.prototype, 'enabled');
serialize()(Demo.prototype, 'label');
serialize()(Demo.prototype, 'offset');

describe('script parameters', () => {
  it('derives a schema with inferred types and defaults', () => {
    const schema = getScriptParameters(Demo);
    const byKey = Object.fromEntries(schema.map((p) => [p.key, p]));

    expect(schema.map((p) => p.key)).toEqual(['speed', 'enabled', 'label', 'offset']);
    expect(byKey.speed.type).toBe('number');
    expect(byKey.speed.default).toBe(1.5);
    expect(byKey.speed.options).toEqual({ min: 0, max: 10, step: 0.5 });
    expect(byKey.enabled.type).toBe('boolean');
    expect(byKey.label.type).toBe('string');
    expect(byKey.offset.type).toBe('vector3');
    expect(schema.some((p) => p.key === 'hidden')).toBe(false);
  });

  it('applies and reads parameter values, cloning vectors', () => {
    const instance = new Demo();
    const v = new Vector3(9, 9, 9);
    applyParameters(instance, { speed: 4, offset: v, hidden: 99 });

    expect(instance.speed).toBe(4);
    expect(instance.hidden).toBe(7); // untouched: not a parameter
    expect(instance.offset.equals(v)).toBe(true);
    expect(instance.offset).not.toBe(v); // cloned, not aliased

    const read = readParameters(instance);
    expect(read.speed).toBe(4);
    expect(read).not.toHaveProperty('hidden');
  });
});
