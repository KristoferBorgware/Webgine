// YAML persistence for the scene graph: text <-> SceneDoc <-> live tree.
//
//     SceneDoc  --emit-->  YAML text  --parse-->  SceneDoc  --instantiate-->  live tree
//        ^                                                                       |
//        +--------------------------------- capture ------------------------------+
//
// The `yaml` library handles lexing/parsing/emitting; this module owns the schema mapping,
// the reference resolution that turns the flat records back into a parented tree, and the
// dispatch from a component record's `type` to a factory that builds it. Built-in factories
// cover the engine's own components; a caller can add more (e.g. script components) without
// the engine depending on those layers.

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import { Quaternion } from '../math/Quaternion';
import { Vector3 } from '../math/Vector3';
import type { DynamicBoxOptions, PhysicsWorld } from '../physics/PhysicsWorld';
import { GameObject } from '../scene/GameObject';
import { MeshComponent } from '../scene/MeshComponent';
import type { Node } from '../scene/Node';
import { RigidBodyComponent } from '../scene/RigidBodyComponent';
import type { Scene } from '../scene/Scene';
import { createCubeMesh, cubeBounds, createGroundMesh, groundBounds } from '../scene/primitives';
import { findComponent, type ComponentDesc, type SceneDoc, type TransformDesc } from './SceneDoc';

const IDENTITY_TRANSFORM: TransformDesc = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

/** Builds and attaches one component onto `object` from its record. */
export type ComponentFactory = (
  object: GameObject,
  desc: ComponentDesc,
  context: InstantiateContext,
) => void;

export interface InstantiateContext {
  /** Physics world used by rigid-body components. */
  physics?: PhysicsWorld | null;
  /** Extra factories keyed by component `type`, merged over the built-ins. */
  factories?: Record<string, ComponentFactory>;
}

// --- text <-> document ---

/** Serializes a document to YAML text. */
export function emit(doc: SceneDoc): string {
  return stringifyYaml({
    scene: { name: doc.name },
    gameObjects: doc.gameObjects.map((o) => ({
      id: o.id,
      name: o.name,
      parent: o.parent,
      children: o.children,
      transform: {
        position: o.transform.position,
        rotation: o.transform.rotation,
        scale: o.transform.scale,
      },
      components: o.components,
    })),
    components: doc.components.map((c) => ({ ...c })),
  });
}

/** Parses YAML text into a document. Throws on malformed YAML. */
export function parse(text: string): SceneDoc {
  const raw = (parseYaml(text) ?? {}) as {
    scene?: { name?: string };
    gameObjects?: RawGameObject[];
    components?: ComponentDesc[];
  };

  return {
    name: raw.scene?.name ?? '',
    gameObjects: (raw.gameObjects ?? []).map((o) => ({
      id: o.id,
      name: o.name ?? '',
      parent: o.parent ?? null,
      children: o.children ?? [],
      transform: normalizeTransform(o.transform),
      components: o.components ?? [],
    })),
    components: (raw.components ?? []).map((c) => ({ ...c })),
  };
}

interface RawGameObject {
  id: string;
  name?: string;
  parent?: string | null;
  children?: string[];
  transform?: Partial<TransformDesc>;
  components?: string[];
}

function normalizeTransform(t: Partial<TransformDesc> | undefined): TransformDesc {
  return {
    position: t?.position ?? [...IDENTITY_TRANSFORM.position],
    rotation: t?.rotation ?? [...IDENTITY_TRANSFORM.rotation],
    scale: t?.scale ?? [...IDENTITY_TRANSFORM.scale],
  };
}

// --- component factories ---

function asVec3(value: unknown, fallback: [number, number, number]): [number, number, number] {
  return Array.isArray(value) && value.length === 3
    ? (value as [number, number, number])
    : fallback;
}

const BUILTIN_FACTORIES: Record<string, ComponentFactory> = {
  MeshComponent(object, desc) {
    if (desc.primitive === 'ground') {
      object.addComponent(MeshComponent, createGroundMesh(), groundBounds(), 'ground');
    } else {
      object.addComponent(MeshComponent, createCubeMesh(), cubeBounds(), 'cube');
    }
  },

  RigidBodyComponent(object, desc, context) {
    const world = context.physics;
    if (!world) return;

    if (desc.body === 'staticGround') {
      const h = asVec3(desc.halfExtents, [15, 0.1, 15]);
      const y = typeof desc.y === 'number' ? desc.y : 0;
      const body = world.createStaticGround({ halfExtents: new Vector3(h[0], h[1], h[2]), y });
      object.addComponent(RigidBodyComponent, body, 'static', {
        body: 'staticGround',
        halfExtents: h,
        y,
      });
      return;
    }

    // dynamicBox
    const h = asVec3(desc.halfExtents, [1, 1, 1]);
    const density = typeof desc.density === 'number' ? desc.density : 1;
    const angularVelocity = Array.isArray(desc.angularVelocity)
      ? asVec3(desc.angularVelocity, [0, 0, 0])
      : null;
    const options: DynamicBoxOptions = {
      halfExtents: new Vector3(h[0], h[1], h[2]),
      position: object.transform.position.clone(),
      density,
    };
    if (angularVelocity) {
      options.angularVelocity = new Vector3(
        angularVelocity[0],
        angularVelocity[1],
        angularVelocity[2],
      );
    }
    const body = world.createDynamicBox(options);
    object.addComponent(RigidBodyComponent, body, 'dynamic', {
      body: 'dynamicBox',
      halfExtents: h,
      density,
      ...(angularVelocity ? { angularVelocity } : {}),
    });
  },
};

// --- document <-> live tree ---

/**
 * Rebuilds every described GameObject under `parent`, resolving parent/child and component
 * references. Component records are dispatched to factories by `type` (built-ins plus any in
 * `context.factories`). Robust to record order. Returns the number of GameObjects created.
 */
export function instantiate(doc: SceneDoc, parent: Node, context: InstantiateContext = {}): number {
  const factories = { ...BUILTIN_FACTORIES, ...context.factories };
  const byId = new Map<string, GameObject>();

  // Pass 1: create every object with its transform and components (no parenting yet).
  for (const desc of doc.gameObjects) {
    const object = new GameObject(desc.name, desc.id);
    applyTransform(object, desc.transform);
    for (const componentId of desc.components) {
      const component = findComponent(doc, componentId);
      const factory = component && factories[component.type];
      if (component && factory) factory(object, component, context);
    }
    byId.set(desc.id, object);
  }

  // Pass 2: parent each object to its named parent, or to `parent` if root-level.
  for (const desc of doc.gameObjects) {
    const object = byId.get(desc.id);
    if (!object) continue;
    const target = desc.parent ? (byId.get(desc.parent) ?? parent) : parent;
    target.addChild(object);
  }

  return doc.gameObjects.length;
}

function applyTransform(object: GameObject, t: TransformDesc): void {
  object.transform.position = new Vector3(t.position[0], t.position[1], t.position[2]);
  object.transform.rotation = new Quaternion(
    t.rotation[0],
    t.rotation[1],
    t.rotation[2],
    t.rotation[3],
  );
  object.transform.scale = new Vector3(t.scale[0], t.scale[1], t.scale[2]);
}

/**
 * Flattens a live scene's structure (ids, names, hierarchy, transforms) into a document, with
 * each component serialized through its own `serialize()`.
 */
export function capture(scene: Scene, name = 'Scene'): SceneDoc {
  const doc: SceneDoc = { name, gameObjects: [], components: [] };

  scene.root.traversePreOrder((node) => {
    if (!(node instanceof GameObject)) return;

    const componentIds: string[] = [];
    for (const component of node.components) {
      const serialized = component.serialize();
      if (!serialized) continue;
      const id = uuidv4();
      doc.components.push({ id, ...serialized });
      componentIds.push(id);
    }

    const parent = node.parent instanceof GameObject ? node.parent.id : null;
    const children = node.children
      .filter((c): c is GameObject => c instanceof GameObject)
      .map((c) => c.id);

    doc.gameObjects.push({
      id: node.id,
      name: node.name,
      parent,
      children,
      transform: transformDesc(node),
      components: componentIds,
    });
  });

  return doc;
}

function transformDesc(object: GameObject): TransformDesc {
  const { position: p, rotation: r, scale: s } = object.transform;
  return {
    position: [p.x, p.y, p.z],
    rotation: [r.x, r.y, r.z, r.w],
    scale: [s.x, s.y, s.z],
  };
}

// --- demo ---

/** A small authored document: two cubes, one at the origin and one offset and scaled down. */
export function buildDemoScene(): SceneDoc {
  const meshA = uuidv4();
  const meshB = uuidv4();
  return {
    name: 'Webgine Demo Scene',
    gameObjects: [
      {
        id: uuidv4(),
        name: 'cube',
        parent: null,
        children: [],
        transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        components: [meshA],
      },
      {
        id: uuidv4(),
        name: 'cube-small',
        parent: null,
        children: [],
        transform: { position: [3.5, 1, 0], rotation: [0, 0, 0, 1], scale: [0.5, 0.5, 0.5] },
        components: [meshB],
      },
    ],
    components: [
      { id: meshA, type: 'MeshComponent', primitive: 'cube' },
      { id: meshB, type: 'MeshComponent', primitive: 'cube' },
    ],
  };
}
