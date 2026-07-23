/**
 * Serializable command/event protocol between the editor and the engine.
 *
 * The editor drives the engine by dispatching {@link Command} objects; the engine
 * reports back by emitting {@link EngineEvent} objects. In Plan 1 these travel via direct
 * in-process calls, but keeping them as plain serializable objects leaves the door open
 * to a transport (e.g. a future Worker boundary) without touching call sites.
 *
 * Feature commands/events (scene mutation, selection, inspector metadata, play/pause) are
 * added in later plans. `ping`/`pong` exists now purely to prove the seam end to end.
 */

/** A command sent from the editor to the engine. */
export type Command = PingCommand;

/** An event emitted from the engine to the editor. */
export type EngineEvent = PongEvent;

export interface PingCommand {
  readonly type: 'ping';
  /** Echoed back on the matching {@link PongEvent} so round-trips can be correlated. */
  readonly nonce: number;
}

export interface PongEvent {
  readonly type: 'pong';
  readonly nonce: number;
}

/** Listener invoked for every event the engine emits. */
export type EngineEventListener = (event: EngineEvent) => void;
