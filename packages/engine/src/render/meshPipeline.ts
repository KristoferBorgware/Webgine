// Render pipeline for the mesh lane: a per-frame bind group (view-projection) and a
// per-object bind group (model matrix), feeding position+color vertices to the mesh
// shader. Renders with back-face culling, counter-clockwise front faces, and depth test.

import { MESH_VERTEX_LAYOUT } from './mesh';
import { MESH_WGSL } from './mesh.wgsl';

/** Bind group layout for the per-frame view-projection uniform (group 0). */
export function createFrameBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }],
  });
}

/** Bind group layout for the per-object model uniform (group 1). */
export function createObjectBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }],
  });
}

export interface MeshPipelineOptions {
  format: GPUTextureFormat;
  depthFormat: GPUTextureFormat;
  sampleCount: number;
  frameLayout: GPUBindGroupLayout;
  objectLayout: GPUBindGroupLayout;
}

export function createMeshPipeline(
  device: GPUDevice,
  options: MeshPipelineOptions,
): GPURenderPipeline {
  const module = device.createShaderModule({ code: MESH_WGSL });
  const layout = device.createPipelineLayout({
    bindGroupLayouts: [options.frameLayout, options.objectLayout],
  });

  return device.createRenderPipeline({
    layout,
    vertex: {
      module,
      entryPoint: 'vs_main',
      buffers: [MESH_VERTEX_LAYOUT],
    },
    fragment: {
      module,
      entryPoint: 'fs_main',
      targets: [{ format: options.format }],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
      frontFace: 'ccw',
    },
    depthStencil: {
      format: options.depthFormat,
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
    multisample: { count: options.sampleCount },
  });
}
