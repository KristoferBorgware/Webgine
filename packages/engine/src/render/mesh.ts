// Mesh data and GPU layout for the mesh lane. MeshData is CPU-side geometry (no GPU
// objects), so scene content can be built and tested without a device; the renderer
// uploads it to a GpuMesh on demand. Each vertex is a position (vec3) plus an RGBA color
// (vec4); triangles index into the vertex list.

/** Floats per vertex: position (3) + color (4). */
export const MESH_VERTEX_FLOATS = 7;
/** Vertex size in bytes. */
export const MESH_VERTEX_STRIDE = MESH_VERTEX_FLOATS * 4;

/** Interleaved vertex layout for the mesh pipeline: position vec3, color vec4. */
export const MESH_VERTEX_LAYOUT: GPUVertexBufferLayout = {
  arrayStride: MESH_VERTEX_STRIDE,
  attributes: [
    { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
    { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color (rgba)
  ],
};

/** CPU-side geometry: interleaved vertices and 16-bit triangle indices. */
export interface MeshData {
  /** Interleaved [x, y, z, r, g, b, a] per vertex. */
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint16Array<ArrayBuffer>;
}

/** GPU resources uploaded from a MeshData; owned and destroyed by the renderer. */
export interface GpuMesh {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
}

/** Uploads CPU geometry into GPU vertex/index buffers. */
export function uploadMesh(device: GPUDevice, data: MeshData): GpuMesh {
  const vertexBuffer = device.createBuffer({
    size: data.vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, data.vertices);

  // Index buffers must be a multiple of 4 bytes; pad an odd 16-bit count.
  const indexBytes = Math.ceil((data.indices.length * 2) / 4) * 4;
  const indexBuffer = device.createBuffer({
    size: indexBytes,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, data.indices);

  return { vertexBuffer, indexBuffer, indexCount: data.indices.length };
}
