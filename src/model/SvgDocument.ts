import { Shape } from './Shape';
import { Group } from './Group';

export class SvgDocument {
  private _width: number;
  private _height: number;
  private _children: Shape[] = [];
  private _shapesById: Map<string, Shape> = new Map();
  private _filePath: string | null = null;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get children(): ReadonlyArray<Shape> { return this._children; }
  get filePath(): string | null { return this._filePath; }

  set width(w: number) { this._width = w; }
  set height(h: number) { this._height = h; }
  set filePath(p: string | null) { this._filePath = p; }

  hasId(id: string): boolean {
    return this._shapesById.has(id);
  }

  findById(id: string): Shape | undefined {
    return this._shapesById.get(id);
  }

  registerShape(shape: Shape): void {
    this._shapesById.set(shape.id, shape);
    if (shape.isGroup()) {
      for (const child of shape.allDescendants()) {
        this._shapesById.set(child.id, child);
      }
    }
  }

  unregisterShape(shape: Shape): void {
    this._shapesById.delete(shape.id);
    if (shape.isGroup()) {
      for (const child of shape.allDescendants()) {
        this._shapesById.delete(child.id);
      }
    }
  }

  addChild(shape: Shape): void {
    this._children.push(shape);
    shape.parent = null;
    this.registerShape(shape);
  }

  addChildAt(shape: Shape, index: number): void {
    this._children.splice(index, 0, shape);
    shape.parent = null;
    this.registerShape(shape);
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

  removeFromParent(shape: Shape): { parent: Group | null; index: number } {
    const parent = shape.parent;
    if (parent) {
      const index = parent.removeChild(shape);
      return { parent, index };
    } else {
      const index = this.removeChild(shape);
      return { parent: null, index };
    }
  }

  insertIntoParent(shape: Shape, parent: Group | null, index: number): void {
    if (parent) {
      parent.addChildAt(shape, index);
    } else {
      this.addChildAt(shape, index);
    }
    this.registerShape(shape);
  }

  isTopLevel(shape: Shape): boolean {
    return this._children.includes(shape);
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

  toSvg(): string {
    let s = '<?xml version="1.0" encoding="UTF-8"?>\n';
    s += `<svg xmlns="http://www.w3.org/2000/svg" width="${this._width}" height="${this._height}" viewBox="0 0 ${this._width} ${this._height}">\n`;
    for (const child of this._children) {
      s += child.toSvgElement('  ') + '\n';
    }
    s += '</svg>\n';
    return s;
  }

  treeString(rootId?: string): string {
    if (rootId) {
      const shape = this.findById(rootId);
      if (!shape) return `error: no such shape: ${rootId}`;
      return this.buildTree(shape, '', true);
    }

    const lines: string[] = [`svg (${this._width}x${this._height})`];
    for (let i = 0; i < this._children.length; i++) {
      const isLast = i === this._children.length - 1;
      lines.push(this.buildTree(this._children[i], '', isLast));
    }
    return lines.join('\n');
  }

  private buildTree(shape: Shape, prefix: string, isLast: boolean): string {
    const connector = isLast ? '└── ' : '├── ';
    let line = prefix + connector + shape.treeLabel();

    if (shape.isGroup()) {
      const children = shape.children;
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      for (let i = 0; i < children.length; i++) {
        const childIsLast = i === children.length - 1;
        line += '\n' + this.buildTree(children[i], childPrefix, childIsLast);
      }
    }

    return line;
  }
}
