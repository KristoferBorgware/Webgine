// Composition root for rendering a Scene: wires the GPU context, the resize observer and
// the frame loop, then each frame ticks the scene and draws every GameObject that carries
// a MeshComponent at its world matrix, through the scene's active camera.

import { CanvasResizer } from '../systems/CanvasResizer';
import { createGpuContext } from '../systems/GpuContext';
import { FrameRenderer, type FrameContext } from '../systems/FrameRenderer';
import { GameObject } from '../scene/GameObject';
import { MeshComponent } from '../scene/MeshComponent';
import type { Scene } from '../scene/Scene';
import { MatrixUniform } from './frameUniforms';
import { uploadMesh, type GpuMesh } from './mesh';
import {
  createFrameBindGroupLayout,
  createMeshPipeline,
  createObjectBindGroupLayout,
} from './meshPipeline';

const DEPTH_FORMAT: GPUTextureFormat = 'depth24plus';
const SAMPLE_COUNT = 4;
const CLEAR_COLOR: GPUColor = { r: 0.07, g: 0.07, b: 0.09, a: 1 };

/** Per-object GPU resources, cached across frames and rebuilt if the mesh changes. */
interface ObjectResources {
  gpuMesh: GpuMesh;
  uniform: MatrixUniform;
}

export interface SceneRendererHandle {
  readonly scene: Scene;
  destroy(): void;
}

export interface CreateSceneRendererOptions {
  /** Reports asynchronous GPU device/validation errors that otherwise fail silently. */
  onDeviceError?: (message: string) => void;
}

/**
 * Starts rendering `scene` into `canvas` and returns a handle to stop and release it.
 * Throws if WebGPU is unavailable.
 */
export async function createSceneRenderer(
  canvas: HTMLCanvasElement,
  scene: Scene,
  options: CreateSceneRendererOptions = {},
): Promise<SceneRendererHandle> {
  const gpu = await createGpuContext(canvas);

  gpu.device.addEventListener('uncapturederror', (event) => {
    const message = (event as GPUUncapturedErrorEvent).error.message;
    console.error('WebGPU device error:', message);
    options.onDeviceError?.(message);
  });

  gpu.device.pushErrorScope('validation');
  const frameLayout = createFrameBindGroupLayout(gpu.device);
  const objectLayout = createObjectBindGroupLayout(gpu.device);
  const pipeline = createMeshPipeline(gpu.device, {
    format: gpu.format,
    depthFormat: DEPTH_FORMAT,
    sampleCount: SAMPLE_COUNT,
    frameLayout,
    objectLayout,
  });
  const frameUniform = new MatrixUniform(gpu.device, frameLayout);
  gpu.device.popErrorScope().then((error) => {
    if (error) {
      console.error('WebGPU pipeline setup error:', error.message);
      options.onDeviceError?.(error.message);
    }
  });

  const resources = new Map<MeshComponent, ObjectResources>();
  const resize = new CanvasResizer(canvas);

  const draw = ({ pass, dt, width, height }: FrameContext): void => {
    scene.update(dt);
    const camera = scene.activeCamera;
    if (!camera || height === 0) return;

    frameUniform.write(camera.viewProjection(width / height).toGPU());
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, frameUniform.bindGroup);

    scene.root.traversePreOrder((node) => {
      if (!(node instanceof GameObject)) return;
      const mesh = node.getComponent(MeshComponent);
      if (!mesh) return;

      let object = resources.get(mesh);
      if (!object) {
        object = {
          gpuMesh: uploadMesh(gpu.device, mesh.mesh),
          uniform: new MatrixUniform(gpu.device, objectLayout),
        };
        resources.set(mesh, object);
      }

      object.uniform.write(node.worldMatrix().toGPU());
      pass.setBindGroup(1, object.uniform.bindGroup);
      pass.setVertexBuffer(0, object.gpuMesh.vertexBuffer);
      pass.setIndexBuffer(object.gpuMesh.indexBuffer, 'uint16');
      pass.drawIndexed(object.gpuMesh.indexCount);
    });
  };

  const frameRenderer = new FrameRenderer(gpu, resize, draw, {
    clearColor: CLEAR_COLOR,
    depthFormat: DEPTH_FORMAT,
    sampleCount: SAMPLE_COUNT,
  });
  frameRenderer.start();

  return {
    scene,
    destroy(): void {
      frameRenderer.stop();
      for (const object of resources.values()) {
        object.gpuMesh.vertexBuffer.destroy();
        object.gpuMesh.indexBuffer.destroy();
        object.uniform.destroy();
      }
      resources.clear();
      frameUniform.destroy();
      resize.dispose();
      gpu.device.destroy();
    },
  };
}
