// The on-disk scene schema: a flat document with id references, distinct from the runtime
// tree. Every GameObject and every Component is a top-level record with a stable UUID
// `id`; relationships are expressed as id references (a GameObject names its `parent` by
// id and lists its `components` by id) rather than by nesting. This keeps records
// order-independent, appendable and diff-able.

export interface TransformDesc {
  position: [number, number, number];
  /** Quaternion [x, y, z, w]. */
  rotation: [number, number, number, number];
  scale: [number, number, number];
}

/** One component record. `type` selects which extra fields are meaningful. */
export interface ComponentDesc {
  id: string;
  type: 'MeshComponent';
  /** MeshComponent: which built-in primitive supplies the geometry. */
  primitive: 'cube';
}

/** One entity record. `parent` is null for a root-level object. */
export interface GameObjectDesc {
  id: string;
  name: string;
  parent: string | null;
  /** Redundant with parent links; emitted for readability and validated on load. */
  children: string[];
  transform: TransformDesc;
  /** Component ids into {@link SceneDoc.components}. */
  components: string[];
}

/** A whole scene as two flat tables cross-referenced by id. */
export interface SceneDoc {
  name: string;
  gameObjects: GameObjectDesc[];
  components: ComponentDesc[];
}

export function findGameObject(doc: SceneDoc, id: string): GameObjectDesc | undefined {
  return doc.gameObjects.find((o) => o.id === id);
}

export function findComponent(doc: SceneDoc, id: string): ComponentDesc | undefined {
  return doc.components.find((c) => c.id === id);
}
