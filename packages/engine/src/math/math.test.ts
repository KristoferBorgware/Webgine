import { describe, expect, it } from 'vitest';
import { Matrix4x4 } from './Matrix4x4';
import { Quaternion } from './Quaternion';
import { Transform } from './Transform';
import { Vector3 } from './Vector3';

describe('Vector3', () => {
  it('computes dot and cross products', () => {
    expect(Vector3.dot(new Vector3(1, 2, 3), new Vector3(4, 5, 6))).toBe(32);
    const c = Vector3.cross(Vector3.unitX(), Vector3.unitY());
    expect(c.nearEquals(Vector3.unitZ())).toBe(true);
  });
});

describe('Matrix4x4', () => {
  it('translation moves a point', () => {
    const m = Matrix4x4.translation(new Vector3(1, 2, 3));
    expect(m.transformPoint(Vector3.zero()).nearEquals(new Vector3(1, 2, 3))).toBe(true);
  });

  it('a matrix composed with its inverse is identity', () => {
    const m = Matrix4x4.trs(
      new Vector3(3, -2, 5),
      Quaternion.fromAxisAngle(Vector3.unitY(), 0.7),
      new Vector3(2, 2, 2),
    );
    const p = new Vector3(1, 1, 1);
    const back = m.inverse().transformPoint(m.transformPoint(p));
    expect(back.nearEquals(p, 1e-4)).toBe(true);
  });

  it('composes column-vector: (A*B)*p applies B then A', () => {
    const t = Matrix4x4.translation(new Vector3(10, 0, 0));
    const s = Matrix4x4.scaling(new Vector3(2, 2, 2));
    // Scale first, then translate: (1,0,0) -> (2,0,0) -> (12,0,0).
    const p = t.mul(s).transformPoint(new Vector3(1, 0, 0));
    expect(p.nearEquals(new Vector3(12, 0, 0))).toBe(true);
  });
});

describe('Transform', () => {
  it('places the origin at its position', () => {
    const tr = new Transform(new Vector3(4, 5, 6));
    expect(tr.transformPoint(Vector3.zero()).nearEquals(new Vector3(4, 5, 6))).toBe(true);
  });
});
