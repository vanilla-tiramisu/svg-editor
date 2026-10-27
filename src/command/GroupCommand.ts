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
    const selected = new Set(this.shapeIds);
    if (selected.size !== this.shapeIds.length) throw new Error('duplicate id in group command');
    if (this.doc.hasId(this.group.id)) throw new Error(`id already exists: ${this.group.id}`);
    for (const id of selected) {
      if (!this.doc.hasId(id)) throw new Error(`no such shape: ${id}`);
    }
    const shapes = this.doc.orderedShapes().filter(shape => selected.has(shape.id));
    for (const shape of shapes) {
      if (shape.isGroup() && shape.allDescendants().some(child => selected.has(child.id))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }

    this.origins = [];
    for (const shape of shapes) {
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
