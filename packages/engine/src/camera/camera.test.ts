import { describe, expect, it } from 'vitest';
import { OrbitCamera } from './OrbitCamera';
import { OrbitCameraController } from '../systems/OrbitCameraController';
import { Vector3 } from '../math/Vector3';

const DEG2RAD = Math.PI / 180;

describe('OrbitCamera', () => {
  it('defaults to the world origin as its focal point', () => {
    const camera = new OrbitCamera();
    expect(camera.focus).toEqual(new Vector3(0, 0, 0));
  });

  it('starts with eye in sync with the orbit, on +Z looking at the focus', () => {
    const camera = new OrbitCamera();
    camera.distance = 10;
    camera.setOrbit(0, 0);
    expect(camera.eye.x).toBeCloseTo(0);
    expect(camera.eye.y).toBeCloseTo(0);
    expect(camera.eye.z).toBeCloseTo(10);
  });

  it('keeps the camera at `distance` from the focus while orbiting', () => {
    const camera = new OrbitCamera();
    camera.focus = new Vector3(1, 2, 3);
    camera.distance = 7;
    camera.update({ orbitX: 120, orbitY: 40 });
    expect(Vector3.distance(camera.eye, camera.focus)).toBeCloseTo(7);
  });

  it('lifts the camera above the focus when dragging down', () => {
    const camera = new OrbitCamera();
    camera.distance = 10;
    camera.update({ orbitY: 30 }); // drag down
    expect(camera.pitch).toBeGreaterThan(0);
    expect(camera.eye.y).toBeGreaterThan(0);
  });

  it('swings the camera left when dragging right', () => {
    const camera = new OrbitCamera();
    camera.distance = 10;
    camera.update({ orbitX: 30 }); // drag right
    expect(camera.yaw).toBeLessThan(0);
    expect(camera.eye.x).toBeLessThan(0);
  });

  it('clamps pitch off the poles', () => {
    const camera = new OrbitCamera();
    camera.update({ orbitY: 100000 });
    expect(camera.pitch).toBeCloseTo(89 * DEG2RAD);
    camera.update({ orbitY: -200000 });
    expect(camera.pitch).toBeCloseTo(-89 * DEG2RAD);
  });

  it('zooms multiplicatively, reversibly, and clamps to the distance range', () => {
    const camera = new OrbitCamera();
    camera.distance = 20;
    camera.update({ zoom: 1 });
    expect(camera.distance).toBeCloseTo(18);
    camera.update({ zoom: -1 }); // zooming back out undoes it exactly
    expect(camera.distance).toBeCloseTo(20);

    camera.update({ zoom: 1000 });
    expect(camera.distance).toBe(camera.minDistance);
    camera.update({ zoom: -1000 });
    expect(camera.distance).toBe(camera.maxDistance);
  });
});

// Minimal stand-in for the canvas: enough EventTarget surface for the controller.
class FakeTarget extends EventTarget {
  captured: number | null = null;
  setPointerCapture(pointerId: number): void {
    this.captured = pointerId;
  }
  releasePointerCapture(pointerId: number): void {
    if (this.captured === pointerId) this.captured = null;
  }
  hasPointerCapture(pointerId: number): boolean {
    return this.captured === pointerId;
  }
}

function pointer(type: string, init: { button?: number; x?: number; y?: number } = {}): Event {
  const event = new Event(type, { cancelable: true });
  return Object.assign(event, {
    pointerId: 1,
    button: init.button ?? 0,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
  });
}

function wheel(deltaY: number, deltaMode = 0): Event {
  return Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode });
}

describe('OrbitCameraController', () => {
  it('does not orbit on pointer movement without a drag', () => {
    const target = new FakeTarget();
    const camera = new OrbitCamera();
    new OrbitCameraController(target, camera);

    target.dispatchEvent(pointer('pointermove', { x: 50, y: 50 }));
    expect(camera.yaw).toBe(0);
    expect(camera.pitch).toBe(0);
  });

  it('ignores drags with a button other than the configured one', () => {
    const target = new FakeTarget();
    const camera = new OrbitCamera();
    const controller = new OrbitCameraController(target, camera);

    target.dispatchEvent(pointer('pointerdown', { button: 0 })); // left
    expect(controller.isOrbiting).toBe(false);
    target.dispatchEvent(pointer('pointermove', { x: 40, y: 0 }));
    expect(camera.yaw).toBe(0);
  });

  it('orbits while the right button is held and captures the pointer', () => {
    const target = new FakeTarget();
    const camera = new OrbitCamera();
    const controller = new OrbitCameraController(target, camera);

    target.dispatchEvent(pointer('pointerdown', { button: 2, x: 100, y: 100 }));
    expect(controller.isOrbiting).toBe(true);
    expect(target.captured).toBe(1);

    target.dispatchEvent(pointer('pointermove', { x: 130, y: 110 }));
    expect(camera.yaw).toBeCloseTo(-30 * camera.orbitSensitivity);
    expect(camera.pitch).toBeCloseTo(10 * camera.orbitSensitivity);
  });

  it('stops orbiting after the button is released', () => {
    const target = new FakeTarget();
    const camera = new OrbitCamera();
    const controller = new OrbitCameraController(target, camera);

    target.dispatchEvent(pointer('pointerdown', { button: 2, x: 0, y: 0 }));
    target.dispatchEvent(pointer('pointerup', { button: 2, x: 0, y: 0 }));
    expect(controller.isOrbiting).toBe(false);
    expect(target.captured).toBe(null);

    target.dispatchEvent(pointer('pointermove', { x: 90, y: 90 }));
    expect(camera.yaw).toBe(0);
    expect(camera.pitch).toBe(0);
  });

  it('suppresses the context menu so a right-drag is not interrupted', () => {
    const target = new FakeTarget();
    new OrbitCameraController(target, new OrbitCamera());

    const event = new Event('contextmenu', { cancelable: true });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('zooms in on a scroll-up notch and out on scroll-down', () => {
    const target = new FakeTarget();
    const camera = new OrbitCamera();
    new OrbitCameraController(target, camera);
    camera.distance = 20;

    target.dispatchEvent(wheel(-100)); // scroll up
    expect(camera.distance).toBeCloseTo(18);
    target.dispatchEvent(wheel(100)); // scroll down, back where we started
    expect(camera.distance).toBeCloseTo(20);
  });

  it('detaches every listener on dispose', () => {
    const target = new FakeTarget();
    const camera = new OrbitCamera();
    const controller = new OrbitCameraController(target, camera);
    controller.dispose();

    target.dispatchEvent(pointer('pointerdown', { button: 2, x: 0, y: 0 }));
    target.dispatchEvent(pointer('pointermove', { x: 50, y: 50 }));
    target.dispatchEvent(wheel(-100));
    expect(controller.isOrbiting).toBe(false);
    expect(camera.yaw).toBe(0);
    expect(camera.distance).toBe(20);
  });
});
