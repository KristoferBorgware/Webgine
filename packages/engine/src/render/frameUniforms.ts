// Uniform buffers for the mesh lane: one per-frame view-projection matrix (group 0) and
// a small per-object model matrix (group 1), each a single mat4x4<f32>.

/** Size of a mat4x4<f32> uniform, in bytes. */
export const MATRIX_UNIFORM_SIZE = 64;

/** A single mat4x4<f32> uniform buffer plus its bind group. */
export class MatrixUniform {
  readonly buffer: GPUBuffer;
  readonly bindGroup: GPUBindGroup;

  constructor(
    private readonly device: GPUDevice,
    layout: GPUBindGroupLayout,
  ) {
    this.buffer = device.createBuffer({
      size: MATRIX_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.bindGroup = device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    });
  }

  write(matrix: Float32Array<ArrayBuffer>): void {
    this.device.queue.writeBuffer(this.buffer, 0, matrix);
  }

  destroy(): void {
    this.buffer.destroy();
  }
}
