/**
 * The transport-agnostic engine instance.
 *
 * `EngineCore` owns the engine's runtime state and knows nothing about the editor or any
 * transport. It can be instantiated directly for standalone/headless use and in tests.
 * Rendering, the scenegraph and the component model are added in Plan 2.
 */
export class EngineCore {
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
}
