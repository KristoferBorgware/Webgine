import { describe, expect, it } from 'vitest';
import { EditorHost } from './EditorHost';
import type { EngineEvent } from './messages';

describe('EditorHost', () => {
  it('answers a ping command with a pong event carrying the same nonce', () => {
    const host = new EditorHost();
    const events: EngineEvent[] = [];
    host.on((event) => events.push(event));

    host.dispatch({ type: 'ping', nonce: 42 });

    expect(events).toEqual([{ type: 'pong', nonce: 42 }]);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const host = new EditorHost();
    const events: EngineEvent[] = [];
    const unsubscribe = host.on((event) => events.push(event));

    unsubscribe();
    host.dispatch({ type: 'ping', nonce: 1 });

    expect(events).toEqual([]);
  });
});
