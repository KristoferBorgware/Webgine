import { EngineCore } from '../core/EngineCore';
import type { Command, EngineEvent, EngineEventListener } from './messages';

/**
 * The engine's editor-facing facade.
 *
 * `EditorHost` is the single seam the editor talks to: it accepts {@link Command} objects
 * and emits {@link EngineEvent} objects. It wraps an {@link EngineCore} but exposes only a
 * curated, serializable surface — never the core's internals — which is what keeps the
 * engine standalone (the core has no dependency on the editor or this host).
 *
 * Plan 1 implements only the `ping`/`pong` round-trip; scene mutation, selection,
 * inspector-metadata queries and play/pause commands are layered on in later plans.
 */
export class EditorHost {
  private readonly listeners = new Set<EngineEventListener>();

  constructor(private readonly core: EngineCore = new EngineCore()) {}

  /** Whether the underlying engine's update loop is running. */
  get isRunning(): boolean {
    return this.core.isRunning;
  }

  /** Subscribe to engine events. Returns an unsubscribe function. */
  on(listener: EngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Dispatch a command from the editor to the engine. */
  dispatch(command: Command): void {
    switch (command.type) {
      case 'ping':
        this.emit({ type: 'pong', nonce: command.nonce });
        break;
    }
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
