import { Shape } from './Shape';

export class Circle extends Shape {
  private _cx: number;
  private _cy: number;
  private _r: number;

  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id);
    this._cx = cx;
    this._cy = cy;
    this._r = r;
    if (fill !== undefined) this._fill = fill;
  }

  get type(): string { return 'circle'; }

  get cx(): number { return this._cx; }
  get cy(): number { return this._cy; }
  get r(): number { return this._r; }

  move(dx: number, dy: number): void {
    this._cx += dx;
    this._cy += dy;
  }

  scale(factor: number): void {
    this._cx *= factor;
    this._cy *= factor;
    this._r *= factor;
  }

  allowedAttributes(): string[] {
    return [...this.commonAllowed(), 'cx', 'cy', 'r'];
  }

  getAttribute(name: string): string | undefined {
    switch (name) {
      case 'cx': return String(this._cx);
      case 'cy': return String(this._cy);
      case 'r': return String(this._r);
      default: return this.getCommonAttribute(name);
    }
  }

  setAttribute(name: string, value: string): void {
    if (this.setCommonAttribute(name, value)) return;
    switch (name) {
      case 'cx': this._cx = Number(value); break;
      case 'cy': this._cy = Number(value); break;
      case 'r': this._r = Number(value); break;
    }
  }

  positionLabel(): string {
    return `(${this._cx},${this._cy})`;
  }

  treeLabel(): string {
    const tag = `circle#${this.id}`;
    const pad = Math.max(tag.length + 1, 16);
    let s = tag.padEnd(pad);
    s += `cx=${this._cx} cy=${this._cy} r=${this._r}`;
    if (this._fill !== undefined) s += ` fill=${this._fill}`;
    return s;
  }

  showDetails(): string {
    const lines: string[] = [];
    lines.push(`circle#${this.id}  parent=${this.parentLabel()}`);
    lines.push(`  cx=${this._cx} cy=${this._cy} r=${this._r}`);
    if (this._fill !== undefined) lines.push(`  fill=${this._fill}`);
    if (this._stroke !== undefined) lines.push(`  stroke=${this._stroke}`);
    if (this._strokeWidth !== undefined) lines.push(`  stroke-width=${this._strokeWidth}`);
    return lines.join('\n');
  }

  toSvgElement(indent: string): string {
    let s = `${indent}<circle id="${this.id}" cx="${this._cx}" cy="${this._cy}" r="${this._r}"`;
    s += this.commonSvgAttrs();
    s += '/>';
    return s;
  }
}
