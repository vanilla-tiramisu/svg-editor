import { Command } from './Command';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { SvgDocument } from '../model/SvgDocument';

interface ShapeOrigin {
  shape: Shape;
  parent: Group | null;
  index: number;
}

export class GroupCommand implements Command {
  private doc: SvgDocument;
  private group: Group;
  private shapeIds: string[];
  private origins: ShapeOrigin[] = [];

  constructor(doc: SvgDocument, groupId: string, shapeIds: string[]) {
    this.doc = doc;
    this.group = new Group(groupId);
    this.shapeIds = shapeIds;
  }

  execute(): string {
    for (const id of this.shapeIds) {
      const shape = this.doc.findById(id)!;
      const { parent, index } = this.doc.removeFromParent(shape);
      this.origins.push({ shape, parent, index });
    }

    this.doc.addChild(this.group);

    for (const origin of this.origins) {
      this.group.addChild(origin.shape);
    }

    return `g#${this.group.id} created with ${this.shapeIds.length} children`;
  }

  undo(): string {
    for (let i = this.origins.length - 1; i >= 0; i--) {
      const { shape, parent, index } = this.origins[i];
      this.group.removeChild(shape);
      this.doc.insertIntoParent(shape, parent, index);
    }

    this.doc.removeChild(this.group);
    this.doc.unregisterShape(this.group);
    this.origins = [];
    return `g#${this.group.id} ungrouped`;
  }
}
