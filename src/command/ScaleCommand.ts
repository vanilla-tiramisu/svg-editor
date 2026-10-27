import { Command } from './Command';
import { Shape } from '../model/Shape';
import { SvgValue } from '../model/SvgValue';
import { ShapeSnapshot } from './ShapeSnapshot';

export class ScaleCommand implements Command {
  private shape: Shape;
  private factor: number;
  private snapshot?: ShapeSnapshot;

  constructor(shape: Shape, factor: number) {
    this.shape = shape;
    this.factor = factor;
  }

  execute(): string {
    SvgValue.positive(this.factor, 'scale factor');
    this.snapshot = new ShapeSnapshot(this.shape);
    this.snapshot.apply(() => this.shape.scale(this.factor));
    return `${this.shape.type}#${this.shape.id} scaled by ${this.factor}`;
  }

  undo(): string {
    this.snapshot!.restore();
    return `${this.shape.type}#${this.shape.id} scale restored`;
  }
}
