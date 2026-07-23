import { Scene } from '../scene/Scene';

/**
 * The engine instance. Owns the runtime state - currently the active {@link Scene} and the
 * update-loop run flag. Rendering is driven separately by a SceneRenderer; the core itself
 * has no GPU dependency, so it can run headless (tests, tooling).
 */
export class EngineCore {
  readonly scene = new Scene();

  private running = false;

  /** Whether the engine's update loop is currently running. */
  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  /** Advance the scene by one step. */
  update(dtSeconds: number): void {
    this.scene.update(dtSeconds);
  }
}
