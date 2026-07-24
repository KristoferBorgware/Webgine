// Quaternion - rotation. Convention: a.mul(b) = "rotation a applied first, then
// rotation b".

import { Vector3 } from './Vector3';

export class Quaternion {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1, // identity
  ) {}

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const n = axis.normalized();
    const half = angle * 0.5;
    const s = Math.sin(half);
    return new Quaternion(n.x * s, n.y * s, n.z * s, Math.cos(half));
  }

  // Euler angles in radians. Matches XMQuaternionRotationRollPitchYaw: the
  // rotation is roll (Z), then pitch (X), then yaw (Y).
  static fromEuler(pitch: number, yaw: number, roll: number): Quaternion {
    const hp = pitch * 0.5;
    const hy = yaw * 0.5;
    const hr = roll * 0.5;
    const cp = Math.cos(hp);
    const sp = Math.sin(hp);
    const cy = Math.cos(hy);
    const sy = Math.sin(hy);
    const cr = Math.cos(hr);
    const sr = Math.sin(hr);
    return new Quaternion(
      cr * sp * cy + sr * cp * sy,
      cr * cp * sy - sr * sp * cy,
      sr * cp * cy - cr * sp * sy,
      cr * cp * cy + sr * sp * sy,
    );
  }

  // Euler angles (radians) as (pitch about X, yaw about Y, roll about Z) - the inverse of
  // fromEuler. Extracted from the rotation matrix in the matching order; the pitch axis is
  // the middle rotation, so it clamps at +/- 90 degrees (gimbal-lock fallback zeroes roll).
  toEuler(): Vector3 {
    const { x, y, z, w } = this;
    const m9 = 2 * (y * z - w * x); // R[1][2]
    const pitch = Math.asin(-Math.min(Math.max(m9, -1), 1));
    if (Math.abs(m9) < 0.9999999) {
      const yaw = Math.atan2(2 * (x * z + w * y), 1 - 2 * (x * x + y * y)); // R[0][2], R[2][2]
      const roll = Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z)); // R[1][0], R[1][1]
      return new Vector3(pitch, yaw, roll);
    }
    const yaw = Math.atan2(-2 * (x * z - w * y), 1 - 2 * (y * y + z * z)); // R[2][0], R[0][0]
    return new Vector3(pitch, yaw, 0);
  }

  // Shortest-arc rotation taking direction `from` onto direction `to`.
  static fromToRotation(from: Vector3, to: Vector3): Quaternion {
    const f = from.safeNormalized(Vector3.forward());
    const t = to.safeNormalized(Vector3.forward());
    const d = Vector3.dot(f, t);
    if (d >= 1.0 - 1e-6) return Quaternion.identity();
    if (d <= -1.0 + 1e-6) {
      // opposite: 180 deg about any perpendicular axis
      let axis = Vector3.cross(Vector3.unitX(), f);
      if (axis.lengthSquared() < 1e-6) axis = Vector3.cross(Vector3.unitY(), f);
      return Quaternion.fromAxisAngle(axis.normalized(), Math.PI);
    }
    return Quaternion.fromAxisAngle(Vector3.cross(f, t).normalized(), Math.acos(d));
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z, this.w);
  }
  normalized(): Quaternion {
    const len = this.length();
    return len > 0
      ? new Quaternion(this.x / len, this.y / len, this.z / len, this.w / len)
      : Quaternion.identity();
  }
  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }
  // Inverse = conjugate / |q|^2 (equals conjugate for unit quaternions).
  inverse(): Quaternion {
    const n = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    if (n <= 0) return Quaternion.identity();
    return new Quaternion(-this.x / n, -this.y / n, -this.z / n, this.w / n);
  }

  // this applied first, then rhs.
  mul(rhs: Quaternion): Quaternion {
    return new Quaternion(
      rhs.w * this.x + rhs.x * this.w + rhs.y * this.z - rhs.z * this.y,
      rhs.w * this.y - rhs.x * this.z + rhs.y * this.w + rhs.z * this.x,
      rhs.w * this.z + rhs.x * this.y - rhs.y * this.x + rhs.z * this.w,
      rhs.w * this.w - rhs.x * this.x - rhs.y * this.y - rhs.z * this.z,
    );
  }

  // Rotate a vector by this quaternion: v + 2w(qv x v) + 2(qv x (qv x v)).
  rotateVector(v: Vector3): Vector3 {
    const qv = new Vector3(this.x, this.y, this.z);
    const t = Vector3.cross(qv, v).mul(2);
    return v.add(t.mul(this.w)).add(Vector3.cross(qv, t));
  }

  static dot(a: Quaternion, b: Quaternion): number {
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  }

  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let cosom = Quaternion.dot(a, b);
    let bx = b.x;
    let by = b.y;
    let bz = b.z;
    let bw = b.w;
    // Take the shorter arc.
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    let scale0: number;
    let scale1: number;
    if (1 - cosom > 1e-6) {
      const omega = Math.acos(cosom);
      const sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      // Nearly identical: fall back to linear interpolation.
      scale0 = 1 - t;
      scale1 = t;
    }
    return new Quaternion(
      scale0 * a.x + scale1 * bx,
      scale0 * a.y + scale1 * by,
      scale0 * a.z + scale1 * bz,
      scale0 * a.w + scale1 * bw,
    );
  }

  static nlerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    return new Quaternion(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t,
      a.w + (b.w - a.w) * t,
    ).normalized();
  }
}
