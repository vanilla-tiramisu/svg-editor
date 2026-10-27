import { Command } from './Command';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { SvgDocument } from '../model/SvgDocument';

export class CreateCommand implements Command {
  private doc: SvgDocument;
  private shape: Shape;
  private container: Group | null;

  constructor(doc: SvgDocument, shape: Shape, container: Group | null) {
    this.doc = doc;
    this.shape = shape;
    this.container = container;
  }

  execute(): string {
    if (this.container) {
      this.container.addChild(this.shape);
      this.doc.registerShape(this.shape);
      return `${this.shape.type}#${this.shape.id} created in g#${this.container.id}`;
    }
    this.doc.addChild(this.shape);
    return `${this.shape.type}#${this.shape.id} created`;
  }

  undo(): string {
    this.doc.unregisterShape(this.shape);
    if (this.container) {
      this.container.removeChild(this.shape);
    } else {
      this.doc.removeChild(this.shape);
    }
    return `${this.shape.type}#${this.shape.id} removed`;
  }
}
