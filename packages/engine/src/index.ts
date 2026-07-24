// Public surface of the engine.

// Math
export * from './math/Vector2';
export * from './math/Vector3';
export * from './math/Vector4';
export * from './math/Matrix4x4';
export * from './math/Quaternion';
export * from './math/Transform';
export * from './math/Ray';
export * from './math/AABB';

// Scene graph
export * from './scene/Node';
export * from './scene/Component';
export * from './scene/GameObject';
export * from './scene/MeshComponent';
export * from './scene/RigidBodyComponent';
export * from './scene/Scene';
export * from './scene/primitives';
export * from './scene/raycast';

// Physics
export * from './physics/PhysicsWorld';
export * from './physics/RigidBody';

// Cameras
export * from './camera/Camera';
export * from './camera/OrbitCamera';
export * from './camera/FreeFloatCamera';

// Systems
export * from './systems/GpuContext';
export * from './systems/CanvasResizer';
export * from './systems/FrameRenderer';

// Rendering
export * from './render/mesh';
export * from './render/SceneRenderer';

// Serialization
export * from './serialization/SceneDoc';
export * as SceneSerializer from './serialization/SceneSerializer';

// Engine core + editor facade
export { EngineCore } from './core/EngineCore';
export { EditorHost } from './editor/EditorHost';
export type { PlayState } from './editor/PlayState';
export type { ComponentDescriptor } from './scene/Component';
export type {
  EngineEvent,
  EngineEventListener,
  SelectionChangedEvent,
  PlayStateChangedEvent,
  TreeNode,
  TransformState,
  InspectorData,
} from './editor/messages';
