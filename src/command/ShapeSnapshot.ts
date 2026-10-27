import { Shape } from '../model/Shape';

export class ShapeSnapshot {
  private values = new Map<Shape, Record<string, string>>();

  constructor(shape: Shape) {
    const nodes = [shape, ...(shape.isGroup() ? shape.allDescendants() : [])];
    for (const node of nodes) this.values.set(node, node.saveGeometry());
  }

  restore(): void {
    for (const [shape, attributes] of this.values) shape.restoreGeometry(attributes);
  }

  apply(change: () => void): void {
    try {
      change();
      for (const shape of this.values.keys()) shape.validate();
    } catch (error) {
      this.restore();
      throw error;
    }
  }
}
