import { Command } from './Command';
import { Shape } from '../model/Shape';

export class MoveCommand implements Command {
  private shape: Shape;
  private dx: number;
  private dy: number;

  constructor(shape: Shape, dx: number, dy: number) {
    this.shape = shape;
    this.dx = dx;
    this.dy = dy;
  }

  execute(): string {
    this.shape.move(this.dx, this.dy);
    if (this.shape.isGroup()) {
      return `g#${this.shape.id} moved by (${this.dx},${this.dy})`;
    }
    return `${this.shape.type}#${this.shape.id} moved to ${this.shape.positionLabel()}`;
  }

  undo(): string {
    this.shape.move(-this.dx, -this.dy);
    if (this.shape.isGroup()) {
      return `g#${this.shape.id} moved back by (${-this.dx},${-this.dy})`;
    }
    return `${this.shape.type}#${this.shape.id} moved back to ${this.shape.positionLabel()}`;
  }
}
