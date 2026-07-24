// EditorHost - the engine's editor-facing facade over a Scene. It is the single seam the
// editor talks to for everything the engine can answer on its own: enumerating the scene
// hierarchy, selecting objects (including ray-picking through the active camera), reading
// and writing transforms, and driving the play state (which gates the simulation). It
// emits selection and play-state events. Script-parameter editing lives in the editor,
// which reaches it via each component's describe() seam - the engine stays unaware of the
// scripting layer.

import { Quaternion } from '../math/Quaternion';
import { Vector3 } from '../math/Vector3';
import type { Ray } from '../math/Ray';
import { Camera } from '../camera/Camera';
import { GameObject } from '../scene/GameObject';
import type { Node } from '../scene/Node';
import type { Scene } from '../scene/Scene';
import { raycast } from '../scene/raycast';
import type { PlayState } from './PlayState';
import type {
  EngineEvent,
  EngineEventListener,
  InspectorData,
  TransformState,
  TreeNode,
} from './messages';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

type Vec3Tuple = [number, number, number];

interface TransformSnapshot {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export class EditorHost {
  private readonly listeners = new Set<EngineEventListener>();
  private readonly syntheticIds = new WeakMap<Node, string>();
  private syntheticCounter = 0;

  private selectedId: string | null = null;
  private playState: PlayState = 'editing';
  private snapshot: Map<GameObject, TransformSnapshot> | null = null;

  constructor(private readonly scene: Scene) {}

  // --- events ---

  on(listener: EngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  // --- hierarchy ---

  /** The scene's top-level objects as a tree (the root node's children). */
  getTree(): TreeNode[] {
    return this.scene.root.children.map((child) => this.toTreeNode(child));
  }

  private toTreeNode(node: Node): TreeNode {
    return {
      id: this.idOf(node),
      name: node.name,
      kind: node instanceof GameObject ? 'gameObject' : node instanceof Camera ? 'camera' : 'node',
      children: node.children.map((child) => this.toTreeNode(child)),
    };
  }

  private idOf(node: Node): string {
    if (node instanceof GameObject) return node.id;
    let id = this.syntheticIds.get(node);
    if (!id) {
      id = `node:${++this.syntheticCounter}`;
      this.syntheticIds.set(node, id);
    }
    return id;
  }

  // --- selection ---

  select(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.emit({ type: 'selectionChanged', id });
  }

  getSelection(): string | null {
    return this.selectedId;
  }

  /**
   * Ray-picks through the active camera and selects the hit GameObject (a miss clears the
   * selection). Returns the selected id, or null on a miss.
   */
  pick(px: number, py: number, viewportW: number, viewportH: number): string | null {
    const camera = this.scene.activeCamera;
    if (!camera) return null;
    const ray: Ray = camera.screenPointToRay(px, py, viewportW, viewportH);
    const hit = raycast(this.scene.root, ray, camera.farZ);
    const id = hit.hit && hit.object ? hit.object.id : null;
    this.select(id);
    return id;
  }

  // --- inspection ---

  getInspector(id: string): InspectorData | null {
    const object = this.resolveGameObject(id);
    if (!object) return null;
    return {
      id: object.id,
      name: object.name,
      transform: this.transformState(object),
      components: object.components.map((component) => component.describe()),
    };
  }

  private transformState(object: GameObject): TransformState {
    const { position: p, rotation, scale: s } = object.transform;
    const e = rotation.toEuler();
    return {
      position: [p.x, p.y, p.z],
      rotation: [e.x * RAD2DEG, e.y * RAD2DEG, e.z * RAD2DEG],
      scale: [s.x, s.y, s.z],
    };
  }

  setPosition(id: string, value: Vec3Tuple): void {
    const object = this.resolveGameObject(id);
    if (object) object.transform.position = new Vector3(value[0], value[1], value[2]);
  }

  setRotationEuler(id: string, degrees: Vec3Tuple): void {
    const object = this.resolveGameObject(id);
    if (object) {
      object.transform.rotation = Quaternion.fromEuler(
        degrees[0] * DEG2RAD,
        degrees[1] * DEG2RAD,
        degrees[2] * DEG2RAD,
      );
    }
  }

  setScale(id: string, value: Vec3Tuple): void {
    const object = this.resolveGameObject(id);
    if (object) object.transform.scale = new Vector3(value[0], value[1], value[2]);
  }

  private resolveGameObject(id: string): GameObject | null {
    let found: GameObject | null = null;
    this.scene.root.traversePreOrder((node) => {
      if (!found && node instanceof GameObject && node.id === id) found = node;
    });
    return found;
  }

  // --- play state ---

  getPlayState(): PlayState {
    return this.playState;
  }

  setPlayState(state: PlayState): void {
    if (state === 'playing') this.play();
    else if (state === 'paused') this.pause();
    else this.stop();
  }

  /** Enters play (snapshotting transforms the first time, so stop can revert). */
  play(): void {
    if (this.playState === 'playing') return;
    if (this.playState === 'editing') this.snapshot = this.captureTransforms();
    this.setState('playing');
  }

  /** Freezes the simulation without discarding the snapshot. */
  pause(): void {
    if (this.playState === 'playing') this.setState('paused');
  }

  /** Restores the pre-play transforms and returns to editing. */
  stop(): void {
    if (this.snapshot) {
      this.restoreTransforms(this.snapshot);
      this.snapshot = null;
    }
    this.setState('editing');
  }

  private setState(state: PlayState): void {
    if (this.playState === state) return;
    this.playState = state;
    this.emit({ type: 'playStateChanged', state });
  }

  /** Advances the scene one step, but only while playing. */
  update(dtSeconds: number): void {
    if (this.playState === 'playing') this.scene.update(dtSeconds);
  }

  private captureTransforms(): Map<GameObject, TransformSnapshot> {
    const snapshot = new Map<GameObject, TransformSnapshot>();
    this.scene.root.traversePreOrder((node) => {
      if (node instanceof GameObject) {
        const t = node.transform;
        snapshot.set(node, {
          position: t.position.clone(),
          rotation: t.rotation.clone(),
          scale: t.scale.clone(),
        });
      }
    });
    return snapshot;
  }

  private restoreTransforms(snapshot: Map<GameObject, TransformSnapshot>): void {
    for (const [object, t] of snapshot) {
      object.transform.position = t.position.clone();
      object.transform.rotation = t.rotation.clone();
      object.transform.scale = t.scale.clone();
    }
  }
}
