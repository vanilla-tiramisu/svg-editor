import { Shape } from './Shape';

export class Group extends Shape {
  private _children: Shape[] = [];

  constructor(id: string) {
    super(id);
  }

  get type(): string { return 'g'; }

  get children(): ReadonlyArray<Shape> {
    return this._children;
  }

  isGroup(): this is Group {
    return true;
  }

  addChild(shape: Shape): void {
    this._children.push(shape);
    shape.parent = this;
  }

  addChildAt(shape: Shape, index: number): void {
    this._children.splice(index, 0, shape);
    shape.parent = this;
  }

  removeChild(shape: Shape): number {
    const idx = this._children.indexOf(shape);
    if (idx !== -1) {
      this._children.splice(idx, 1);
      shape.parent = null;
    }
    return idx;
  }

  indexOf(shape: Shape): number {
    return this._children.indexOf(shape);
  }

  moveToFront(shape: Shape): void {
    const idx = this._children.indexOf(shape);
    if (idx !== -1 && idx < this._children.length - 1) {
      this._children.splice(idx, 1);
      this._children.push(shape);
    }
  }

  moveToBack(shape: Shape): void {
    const idx = this._children.indexOf(shape);
    if (idx > 0) {
      this._children.splice(idx, 1);
      this._children.unshift(shape);
    }
  }

  containsDescendant(shape: Shape): boolean {
    for (const child of this._children) {
      if (child === shape) return true;
      if (child.isGroup() && child.containsDescendant(shape)) return true;
    }
    return false;
  }

  allDescendants(): Shape[] {
    const result: Shape[] = [];
    for (const child of this._children) {
      result.push(child);
      if (child.isGroup()) {
        result.push(...child.allDescendants());
      }
    }
    return result;
  }

  move(dx: number, dy: number): void {
    for (const child of this._children) {
      child.move(dx, dy);
    }
  }

  scale(factor: number): void {
    for (const child of this._children) {
      child.scale(factor);
    }
  }

  allowedAttributes(): string[] {
    return this.commonAllowed();
  }

  getAttribute(name: string): string | undefined {
    return this.getCommonAttribute(name);
  }

  setAttribute(name: string, value: string): void {
    this.setCommonAttribute(name, value);
  }

  positionLabel(): string {
    return '';
  }

  treeLabel(): string {
    return `g#${this.id}`;
  }

  showDetails(): string {
    const lines: string[] = [];
    lines.push(`g#${this.id}  parent=${this.parentLabel()}`);
    lines.push(`  children: ${this._children.map(c => `${c.type}#${c.id}`).join(', ')}`);
    if (this._fill !== undefined) lines.push(`  fill=${this._fill}`);
    if (this._stroke !== undefined) lines.push(`  stroke=${this._stroke}`);
    if (this._strokeWidth !== undefined) lines.push(`  stroke-width=${this._strokeWidth}`);
    return lines.join('\n');
  }

  toSvgElement(indent: string): string {
    let s = `${indent}<g id="${this.id}"`;
    s += this.commonSvgAttrs();
    s += '>\n';
    for (const child of this._children) {
      s += child.toSvgElement(indent + '  ') + '\n';
    }
    s += `${indent}</g>`;
    return s;
  }

  countElements(): number {
    let count = 0;
    for (const child of this._children) {
      count++;
      if (child.isGroup()) {
        count += child.countElements();
      }
    }
    return count;
  }
}
