// System component: drives an OrbitCamera from mouse input on a DOM element (the
// viewport canvas). Holding the configured button - the right button by default - and
// dragging tumbles the camera around its focal point; the wheel zooms.
//
// The camera itself stays free of DOM types; this is the only piece that knows about
// pointer events. Pointer capture keeps a drag alive when the cursor leaves the canvas,
// and the context menu is suppressed so a right-drag is not interrupted by it.

import type { OrbitCamera } from '../camera/OrbitCamera';

/** The subset of an element this controller needs - keeps it testable without a DOM. */
export interface OrbitCameraControllerTarget extends EventTarget {
  setPointerCapture?(pointerId: number): void;
  releasePointerCapture?(pointerId: number): void;
  hasPointerCapture?(pointerId: number): boolean;
}

export interface OrbitCameraControllerOptions {
  /** Mouse button that starts an orbit drag: 0 = left, 1 = middle, 2 = right. */
  button?: number;
  /** Suppress the browser context menu on the element (needed for right-button drags). */
  suppressContextMenu?: boolean;
  /** Wheel zoom enabled. */
  zoom?: boolean;
}

// A wheel notch is 100px in the pixel delta mode; the other modes are coarser.
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 800;
const PIXELS_PER_NOTCH = 100;

export class OrbitCameraController {
  private readonly target: OrbitCameraControllerTarget;
  private readonly camera: OrbitCamera;
  private readonly button: number;
  private readonly suppressContextMenu: boolean;
  private readonly zoomEnabled: boolean;

  private activePointer: number | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(
    target: OrbitCameraControllerTarget,
    camera: OrbitCamera,
    options: OrbitCameraControllerOptions = {},
  ) {
    this.target = target;
    this.camera = camera;
    this.button = options.button ?? 2; // right mouse button
    this.suppressContextMenu = options.suppressContextMenu ?? true;
    this.zoomEnabled = options.zoom ?? true;

    target.addEventListener('pointerdown', this.onPointerDown as EventListener);
    target.addEventListener('pointermove', this.onPointerMove as EventListener);
    target.addEventListener('pointerup', this.onPointerUp as EventListener);
    target.addEventListener('pointercancel', this.onPointerUp as EventListener);
    target.addEventListener('lostpointercapture', this.onPointerUp as EventListener);
    if (this.suppressContextMenu) {
      target.addEventListener('contextmenu', this.onContextMenu as EventListener);
    }
    if (this.zoomEnabled) {
      // Non-passive: the wheel handler calls preventDefault to stop the page scrolling.
      target.addEventListener('wheel', this.onWheel as EventListener, { passive: false });
    }
  }

  /** True while an orbit drag is in progress. */
  get isOrbiting(): boolean {
    return this.activePointer !== null;
  }

  dispose(): void {
    this.endDrag();
    const target = this.target;
    target.removeEventListener('pointerdown', this.onPointerDown as EventListener);
    target.removeEventListener('pointermove', this.onPointerMove as EventListener);
    target.removeEventListener('pointerup', this.onPointerUp as EventListener);
    target.removeEventListener('pointercancel', this.onPointerUp as EventListener);
    target.removeEventListener('lostpointercapture', this.onPointerUp as EventListener);
    target.removeEventListener('contextmenu', this.onContextMenu as EventListener);
    target.removeEventListener('wheel', this.onWheel as EventListener);
  }

  // Arrow properties: stable identities, so removeEventListener actually detaches them.

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.activePointer !== null || event.button !== this.button) return;
    this.activePointer = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    // Capture so the drag survives the pointer leaving the canvas.
    this.target.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    if (dx === 0 && dy === 0) return;
    this.camera.update({ orbitX: dx, orbitY: dy });
    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer) return;
    this.endDrag();
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onWheel = (event: WheelEvent): void => {
    const notches = -this.wheelPixels(event) / PIXELS_PER_NOTCH; // scroll up = zoom in
    if (notches === 0) return;
    this.camera.update({ zoom: notches });
    event.preventDefault();
  };

  private wheelPixels(event: WheelEvent): number {
    if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT_PX; // DOM_DELTA_LINE
    if (event.deltaMode === 2) return event.deltaY * PAGE_HEIGHT_PX; // DOM_DELTA_PAGE
    return event.deltaY; // DOM_DELTA_PIXEL
  }

  private endDrag(): void {
    if (this.activePointer === null) return;
    const pointerId = this.activePointer;
    this.activePointer = null;
    if (this.target.hasPointerCapture?.(pointerId)) {
      this.target.releasePointerCapture?.(pointerId);
    }
  }
}
