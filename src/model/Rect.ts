import { Shape } from './Shape';

export class Rect extends Shape {
  private _x: number;
  private _y: number;
  private _width: number;
  private _height: number;

  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id);
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    if (fill !== undefined) this._fill = fill;
  }

  get type(): string { return 'rect'; }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get width(): number { return this._width; }
  get height(): number { return this._height; }

  move(dx: number, dy: number): void {
    this._x += dx;
    this._y += dy;
  }

  scale(factor: number): void {
    this._x *= factor;
    this._y *= factor;
    this._width *= factor;
    this._height *= factor;
  }

  allowedAttributes(): string[] {
    return [...this.commonAllowed(), 'x', 'y', 'width', 'height'];
  }

  getAttribute(name: string): string | undefined {
    switch (name) {
      case 'x': return String(this._x);
      case 'y': return String(this._y);
      case 'width': return String(this._width);
      case 'height': return String(this._height);
      default: return this.getCommonAttribute(name);
    }
  }

  setAttribute(name: string, value: string): void {
    if (this.setCommonAttribute(name, value)) return;
    switch (name) {
      case 'x': this._x = Number(value); break;
      case 'y': this._y = Number(value); break;
      case 'width': this._width = Number(value); break;
      case 'height': this._height = Number(value); break;
    }
  }

  positionLabel(): string {
    return `(${this._x},${this._y})`;
  }

  treeLabel(): string {
    const tag = `rect#${this.id}`;
    const pad = Math.max(tag.length + 1, 16);
    let s = tag.padEnd(pad);
    s += `x=${this._x} y=${this._y} w=${this._width} h=${this._height}`;
    if (this._fill !== undefined) s += ` fill=${this._fill}`;
    return s;
  }

  showDetails(): string {
    const lines: string[] = [];
    lines.push(`rect#${this.id}  parent=${this.parentLabel()}`);
    lines.push(`  x=${this._x} y=${this._y} width=${this._width} height=${this._height}`);
    if (this._fill !== undefined) lines.push(`  fill=${this._fill}`);
    if (this._stroke !== undefined) lines.push(`  stroke=${this._stroke}`);
    if (this._strokeWidth !== undefined) lines.push(`  stroke-width=${this._strokeWidth}`);
    return lines.join('\n');
  }

  toSvgElement(indent: string): string {
    let s = `${indent}<rect id="${this.id}" x="${this._x}" y="${this._y}" width="${this._width}" height="${this._height}"`;
    s += this.commonSvgAttrs();
    s += '/>';
    return s;
  }
}
