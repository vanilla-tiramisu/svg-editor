import { Command } from './Command';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { SvgDocument } from '../model/SvgDocument';

export class FrontCommand implements Command {
  private doc: SvgDocument;
  private shape: Shape;
  private oldIndex: number = -1;

  constructor(doc: SvgDocument, shape: Shape) {
    this.doc = doc;
    this.shape = shape;
  }

  execute(): string {
    const parent = this.shape.parent;
    if (parent) {
      this.oldIndex = parent.indexOf(this.shape);
      parent.moveToFront(this.shape);
    } else {
      this.oldIndex = this.doc.indexOf(this.shape);
      this.doc.removeChild(this.shape);
      this.doc.addChild(this.shape);
    }
    return `${this.shape.type}#${this.shape.id} moved to front`;
  }

  undo(): string {
    const parent = this.shape.parent;
    if (parent) {
      parent.removeChild(this.shape);
      parent.addChildAt(this.shape, this.oldIndex);
    } else {
      this.doc.removeChild(this.shape);
      this.doc.addChildAt(this.shape, this.oldIndex);
    }
    return `${this.shape.type}#${this.shape.id} z-order restored`;
  }
}
