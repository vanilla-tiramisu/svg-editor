import { Shape } from './Shape';

export class Line extends Shape {
  private _x1: number;
  private _y1: number;
  private _x2: number;
  private _y2: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id);
    this._x1 = x1;
    this._y1 = y1;
    this._x2 = x2;
    this._y2 = y2;
    if (stroke !== undefined) this._stroke = stroke;
  }

  get type(): string { return 'line'; }

  move(dx: number, dy: number): void {
    this._x1 += dx;
    this._y1 += dy;
    this._x2 += dx;
    this._y2 += dy;
  }

  scale(factor: number): void {
    this._x1 *= factor;
    this._y1 *= factor;
    this._x2 *= factor;
    this._y2 *= factor;
  }

  allowedAttributes(): string[] {
    return [...this.commonAllowed(), 'x1', 'y1', 'x2', 'y2'];
  }

  getAttribute(name: string): string | undefined {
    switch (name) {
      case 'x1': return String(this._x1);
      case 'y1': return String(this._y1);
      case 'x2': return String(this._x2);
      case 'y2': return String(this._y2);
      default: return this.getCommonAttribute(name);
    }
  }

  setAttribute(name: string, value: string): void {
    if (this.setCommonAttribute(name, value)) return;
    switch (name) {
      case 'x1': this._x1 = Number(value); break;
      case 'y1': this._y1 = Number(value); break;
      case 'x2': this._x2 = Number(value); break;
      case 'y2': this._y2 = Number(value); break;
    }
  }

  positionLabel(): string {
    return `(${this._x1},${this._y1})`;
  }

  treeLabel(): string {
    const tag = `line#${this.id}`;
    const pad = Math.max(tag.length + 1, 16);
    let s = tag.padEnd(pad);
    s += `(${this._x1},${this._y1}) -> (${this._x2},${this._y2})`;
    if (this._stroke !== undefined) s += ` stroke=${this._stroke}`;
    return s;
  }

  showDetails(): string {
    const lines: string[] = [];
    lines.push(`line#${this.id}  parent=${this.parentLabel()}`);
    lines.push(`  x1=${this._x1} y1=${this._y1} x2=${this._x2} y2=${this._y2}`);
    if (this._fill !== undefined) lines.push(`  fill=${this._fill}`);
    if (this._stroke !== undefined) lines.push(`  stroke=${this._stroke}`);
    if (this._strokeWidth !== undefined) lines.push(`  stroke-width=${this._strokeWidth}`);
    return lines.join('\n');
  }

  toSvgElement(indent: string): string {
    let s = `${indent}<line id="${this.id}" x1="${this._x1}" y1="${this._y1}" x2="${this._x2}" y2="${this._y2}"`;
    s += this.commonSvgAttrs();
    s += '/>';
    return s;
  }
}
