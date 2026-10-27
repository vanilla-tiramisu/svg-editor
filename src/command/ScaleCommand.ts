import { Command } from './Command';
import { Shape } from '../model/Shape';

export class ScaleCommand implements Command {
  private shape: Shape;
  private factor: number;
  private savedGeometry: Map<Shape, Record<string, string>> = new Map();

  constructor(shape: Shape, factor: number) {
    this.shape = shape;
    this.factor = factor;
  }

  execute(): string {
    this.saveGeometry(this.shape);
    this.shape.scale(this.factor);
    return `${this.shape.type}#${this.shape.id} scaled by ${this.factor}`;
  }

  undo(): string {
    this.restoreGeometry(this.shape);
    return `${this.shape.type}#${this.shape.id} scale restored`;
  }

  private saveGeometry(shape: Shape): void {
    this.savedGeometry.set(shape, shape.saveGeometry());
    if (shape.isGroup()) {
      for (const child of shape.children) {
        this.saveGeometry(child);
      }
    }
  }

  private restoreGeometry(shape: Shape): void {
    const geo = this.savedGeometry.get(shape);
    if (geo) {
      shape.restoreGeometry(geo);
    }
    if (shape.isGroup()) {
      for (const child of shape.children) {
        this.restoreGeometry(child);
      }
    }
  }
}
