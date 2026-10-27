import { Command } from './Command';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { SvgDocument } from '../model/SvgDocument';

export class DeleteCommand implements Command {
  private doc: SvgDocument;
  private shape: Shape;
  private savedParent: Group | null = null;
  private savedIndex: number = -1;

  constructor(doc: SvgDocument, shape: Shape) {
    this.doc = doc;
    this.shape = shape;
  }

  execute(): string {
    const { parent, index } = this.doc.removeFromParent(this.shape);
    this.savedParent = parent;
    this.savedIndex = index;
    this.doc.unregisterShape(this.shape);
    return `${this.shape.type}#${this.shape.id} deleted`;
  }

  undo(): string {
    this.doc.insertIntoParent(this.shape, this.savedParent, this.savedIndex);
    const parentLabel = this.savedParent ? `g#${this.savedParent.id}` : 'svg';
    return `${this.shape.type}#${this.shape.id} restored into ${parentLabel}`;
  }
}
