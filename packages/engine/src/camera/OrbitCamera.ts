// Orbit (arcball) camera: rotates around a fixed focal point as if attached to a sphere
// centred on it. Dragging tumbles the camera over the sphere; wheel notches change
// `distance` (zoom).
//
// Orientation is azimuth (yaw) + elevation (pitch), radians. Elevation is clamped just
// short of the poles so the view never degenerates - no gimbal lock, no roll.
//
// This class is deliberately free of DOM types; OrbitCameraController drives it from
// pointer and wheel events.

import { Camera } from './Camera';
import { Matrix4x4 } from '../math/Matrix4x4';
import { Quaternion } from '../math/Quaternion';
import { Vector3 } from '../math/Vector3';

const DEG2RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/** Per-frame orbit input. Free of DOM types. */
export interface OrbitInput {
  orbitX?: number; // drag dx in pixels (0 unless dragging)
  orbitY?: number; // drag dy in pixels
  zoom?: number; // wheel notches (+ = zoom in)
}

export class OrbitCamera extends Camera {
  /** Focal point the camera orbits. */
  focus = new Vector3(0, 0, 0);

  distance = 20.0; // zoom: distance from the focal point
  minDistance = 1.0;
  maxDistance = 200.0;
  orbitSensitivity = 0.01; // radians per pixel of drag
  zoomSensitivity = 0.1; // fraction of distance per wheel notch
  maxPitch = 89 * DEG2RAD; // clamp near poles

  private yawAngle = 0; // azimuth about world +Y
  private pitchAngle = 0; // elevation about the orbit's right axis (+ = above the focus)

  constructor(name = '') {
    super(name);
    this.eye = this.eyePosition(); // the base member starts in sync
  }

  /** Azimuth about world +Y, radians. */
  get yaw(): number {
    return this.yawAngle;
  }

  /** Elevation above the focus, radians. Positive puts the camera above the focal point. */
  get pitch(): number {
    return this.pitchAngle;
  }

  /** Set the orbit orientation directly (radians). Pitch is clamped off the poles. */
  setOrbit(yaw: number, pitch: number): void {
    this.yawAngle = yaw % TWO_PI;
    this.pitchAngle = this.clampPitch(pitch);
    this.eye = this.eyePosition();
  }

  private clampPitch(pitch: number): number {
    return Math.max(-this.maxPitch, Math.min(this.maxPitch, pitch));
  }

  // Camera position on the sphere for the current yaw/pitch/distance.
  private eyePosition(): Vector3 {
    // Direction from the focus out to the camera: elevate about right first, then swing
    // about world up. Back() = {0,0,1}, so at yaw=pitch=0 the camera sits on +Z. The pitch
    // is negated because a right-handed rotation about +X takes +Z downwards, and positive
    // pitch means "camera above the focus".
    const q = Quaternion.fromAxisAngle(Vector3.right(), -this.pitchAngle).mul(
      Quaternion.fromAxisAngle(Vector3.up(), this.yawAngle),
    );
    const dir = q.rotateVector(Vector3.back());
    return this.focus.add(dir.mul(this.distance));
  }

  update(input: OrbitInput): void {
    const orbitX = input.orbitX ?? 0;
    const orbitY = input.orbitY ?? 0;
    const zoom = input.zoom ?? 0;

    // Drag tumbles the camera over the sphere the way the scene appears to follow the
    // pointer: dragging right swings the camera left, dragging down lifts it overhead.
    this.yawAngle -= orbitX * this.orbitSensitivity;
    this.yawAngle %= TWO_PI; // keep yaw bounded without changing the orientation
    this.pitchAngle = this.clampPitch(this.pitchAngle + orbitY * this.orbitSensitivity);

    // Wheel zoom is exponential so it feels even at any distance, and so that zooming out
    // exactly undoes zooming in. A linear (1 - zoom * sensitivity) factor would flip sign
    // on a large notch count - e.g. a trackpad fling - and slam the camera into minDistance.
    if (zoom !== 0) {
      this.distance *= Math.pow(1 - this.zoomSensitivity, zoom);
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
    }

    this.eye = this.eyePosition(); // keep the base member in sync
  }

  override view(): Matrix4x4 {
    return Matrix4x4.lookAtRH(this.eyePosition(), this.focus, Vector3.up());
  }
}
