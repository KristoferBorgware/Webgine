// The editor-facing protocol: the data the editor reads from the engine and the events the
// engine emits back. The editor calls EditorHost methods directly (single realm); events
// notify it of selection and play-state changes. Shapes are plain/serializable so a future
// transport could carry them unchanged.

import type { ComponentDescriptor } from '../scene/Component';
import type { PlayState } from './PlayState';

/** A node in the scene hierarchy as shown by the editor. */
export interface TreeNode {
  id: string;
  name: string;
  kind: 'gameObject' | 'camera' | 'node';
  children: TreeNode[];
}

/** A GameObject's transform for the inspector: position, Euler rotation (degrees), scale. */
export interface TransformState {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

/** Everything the inspector shows for the selected GameObject. */
export interface InspectorData {
  id: string;
  name: string;
  transform: TransformState;
  components: ComponentDescriptor[];
}

/** An event emitted from the engine to the editor. */
export type EngineEvent = SelectionChangedEvent | PlayStateChangedEvent;

export interface SelectionChangedEvent {
  readonly type: 'selectionChanged';
  readonly id: string | null;
}

export interface PlayStateChangedEvent {
  readonly type: 'playStateChanged';
  readonly state: PlayState;
}

/** Listener invoked for every event the engine emits. */
export type EngineEventListener = (event: EngineEvent) => void;
