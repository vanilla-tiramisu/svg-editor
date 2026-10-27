import { Command } from './Command';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { SvgDocument } from '../model/SvgDocument';

export class AddtoCommand implements Command {
  private doc: SvgDocument;
  private targetGroup: Group;
  private shape: Shape;
  private oldParent: Group | null = null;
  private oldIndex: number = -1;

  constructor(doc: SvgDocument, targetGroup: Group, shape: Shape) {
    this.doc = doc;
    this.targetGroup = targetGroup;
    this.shape = shape;
  }

  execute(): string {
    this.targetGroup.assertCanContain(this.shape);
    const { parent, index } = this.doc.removeFromParent(this.shape);
    this.oldParent = parent;
    this.oldIndex = index;
    this.targetGroup.addChild(this.shape);
    this.doc.registerShape(this.shape);
    return `${this.shape.type}#${this.shape.id} added to g#${this.targetGroup.id}`;
  }

  undo(): string {
    this.targetGroup.removeChild(this.shape);
    this.doc.insertIntoParent(this.shape, this.oldParent, this.oldIndex);
    return `${this.shape.type}#${this.shape.id} moved back`;
  }
}
