// Node - the scene-graph base: a named element with a non-owning parent link and owned
// children. A Node has no transform of its own; the only spatial element is the
// overridable localMatrix() seam (identity by default) that concrete nodes such as
// GameObject and Camera supply. World transforms are composed by walking ancestors in
// worldMatrix().
//
// Column-vector / WebGPU-native: world = parent_world * local, so ancestors multiply on
// the left.

import { Matrix4x4 } from '../math/Matrix4x4';

export type NodeVisitor = (node: Node) => void;

export class Node {
  readonly name: string;

  /** Non-owning link set by addChild; null for a detached node or the root. */
  parent: Node | null = null;

  private readonly _children: Node[] = [];

  constructor(name = '') {
    this.name = name;
  }

  get children(): readonly Node[] {
    return this._children;
  }

  // --- create ---

  /** Adds an existing child (takes ownership), sets its parent, and returns it. */
  addChild<T extends Node>(child: T): T {
    child.parent = this;
    this._children.push(child);
    return child;
  }

  /** Removes `child` from this node. Returns false if it was not a child here. */
  removeChild(child: Node): boolean {
    const i = this._children.indexOf(child);
    if (i < 0) return false;
    this._children.splice(i, 1);
    child.parent = null;
    return true;
  }

  // --- search ---

  /** First node in this subtree (this node included) whose name matches, else null. */
  findByName(name: string): Node | null {
    if (this.name === name) return this;
    for (const child of this._children) {
      const found = child.findByName(name);
      if (found) return found;
    }
    return null;
  }

  // --- traverse (visitor invoked once per node, this node included) ---

  traversePreOrder(visit: NodeVisitor): void {
    visit(this);
    for (const child of this._children) child.traversePreOrder(visit);
  }

  traversePostOrder(visit: NodeVisitor): void {
    for (const child of this._children) child.traversePostOrder(visit);
    visit(this);
  }

  traverseBreadthFirst(visit: NodeVisitor): void {
    const queue: Node[] = [this];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      visit(node);
      for (const child of node._children) queue.push(child);
    }
  }

  // --- spatial seam ---

  /**
   * Local transform relative to the parent. The base contributes identity; concrete
   * nodes override to supply their own (e.g. from a Transform).
   */
  localMatrix(): Matrix4x4 {
    return Matrix4x4.identity();
  }

  /**
   * World transform: this node's local matrix composed with all ancestors'. Column-
   * vector, so ancestors multiply on the left: root_local * ... * parent_local * local.
   */
  worldMatrix(): Matrix4x4 {
    let world = this.localMatrix();
    for (let p = this.parent; p !== null; p = p.parent) {
      world = p.localMatrix().mul(world);
    }
    return world;
  }
}
