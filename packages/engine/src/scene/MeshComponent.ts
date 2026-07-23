// MeshComponent - gives a GameObject something to render: CPU mesh geometry plus the
// object-space bounding box that matches it. The geometry is uploaded to the GPU by the
// renderer; the bounds are used for culling and picking.

import type { AABB } from '../math/AABB';
import type { MeshData } from '../render/mesh';
import { Component } from './Component';
import type { GameObject } from './GameObject';

export class MeshComponent extends Component {
  constructor(
    owner: GameObject,
    readonly mesh: MeshData,
    /** Object-space bounds matching `mesh`. */
    readonly bounds: AABB,
    /** Name of the primitive that built this mesh (e.g. "cube"); "" if custom. */
    readonly primitive: string = '',
  ) {
    super(owner);
  }
}
