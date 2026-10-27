import { Command } from './Command';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { SvgDocument } from '../model/SvgDocument';

export class UngroupCommand implements Command {
  private doc: SvgDocument;
  private group: Group;
  private parentGroup: Group | null = null;
  private groupIndex: number = -1;
  private children: Shape[] = [];

  constructor(doc: SvgDocument, group: Group) {
    this.doc = doc;
    this.group = group;
  }

  execute(): string {
    this.children = [...this.group.children];
    this.parentGroup = this.group.parent;

    if (this.parentGroup) {
      this.groupIndex = this.parentGroup.indexOf(this.group);
      this.parentGroup.removeChild(this.group);
      for (let i = 0; i < this.children.length; i++) {
        this.group.removeChild(this.children[i]);
        this.parentGroup.addChildAt(this.children[i], this.groupIndex + i);
      }
    } else {
      this.groupIndex = this.doc.removeChild(this.group);
      for (let i = 0; i < this.children.length; i++) {
        this.group.removeChild(this.children[i]);
        this.doc.addChildAt(this.children[i], this.groupIndex + i);
      }
    }

    this.doc.unregisterShape(this.group);
    return `g#${this.group.id} ungrouped (${this.children.length} children promoted)`;
  }

  undo(): string {
    for (const child of this.children) {
      if (this.parentGroup) {
        this.parentGroup.removeChild(child);
      } else {
        this.doc.removeChild(child);
      }
      this.group.addChild(child);
    }

    if (this.parentGroup) {
      this.parentGroup.addChildAt(this.group, this.groupIndex);
    } else {
      this.doc.addChildAt(this.group, this.groupIndex);
    }

    this.doc.registerShape(this.group);
    return `g#${this.group.id} regrouped`;
  }
}
