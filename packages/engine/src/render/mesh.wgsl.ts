// Shader for the mesh lane: a per-frame view-projection uniform and a per-object model
// matrix transform each vertex to clip space; the vertex color is interpolated to the
// fragment unchanged.

export const MESH_WGSL = /* wgsl */ `
struct Frame {
  viewProjection : mat4x4<f32>,
};

struct ObjectData {
  model : mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> frame : Frame;
@group(1) @binding(0) var<uniform> object : ObjectData;

struct VertexOut {
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec4<f32>,
};

@vertex
fn vs_main(
  @location(0) position : vec3<f32>,
  @location(1) color : vec4<f32>,
) -> VertexOut {
  var out : VertexOut;
  out.position = frame.viewProjection * object.model * vec4<f32>(position, 1.0);
  out.color = color;
  return out;
}

@fragment
fn fs_main(in : VertexOut) -> @location(0) vec4<f32> {
  return in.color;
}
`;
