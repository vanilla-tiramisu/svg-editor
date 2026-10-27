import { Shape } from './Shape';

export class Ellipse extends Shape {
  private _cx: number;
  private _cy: number;
  private _rx: number;
  private _ry: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id);
    this._cx = cx;
    this._cy = cy;
    this._rx = rx;
    this._ry = ry;
    if (fill !== undefined) this._fill = fill;
  }

  get type(): string { return 'ellipse'; }

  move(dx: number, dy: number): void {
    this._cx += dx;
    this._cy += dy;
  }

  scale(factor: number): void {
    this._cx *= factor;
    this._cy *= factor;
    this._rx *= factor;
    this._ry *= factor;
  }

  allowedAttributes(): string[] {
    return [...this.commonAllowed(), 'cx', 'cy', 'rx', 'ry'];
  }

  getAttribute(name: string): string | undefined {
    switch (name) {
      case 'cx': return String(this._cx);
      case 'cy': return String(this._cy);
      case 'rx': return String(this._rx);
      case 'ry': return String(this._ry);
      default: return this.getCommonAttribute(name);
    }
  }

  setAttribute(name: string, value: string): void {
    this.validateAttribute(name, value);
    if (this.setCommonAttribute(name, value)) return;
    switch (name) {
      case 'cx': this._cx = Number(value); break;
      case 'cy': this._cy = Number(value); break;
      case 'rx': this._rx = Number(value); break;
      case 'ry': this._ry = Number(value); break;
    }
  }

  positionLabel(): string {
    return `(${this._cx},${this._cy})`;
  }

  treeLabel(): string {
    const tag = `ellipse#${this.id}`;
    const pad = Math.max(tag.length + 1, 16);
    let s = tag.padEnd(pad);
    s += `cx=${this._cx} cy=${this._cy} rx=${this._rx} ry=${this._ry}`;
    if (this._fill !== undefined) s += ` fill=${this._fill}`;
    return s;
  }

  showDetails(): string {
    const lines: string[] = [];
    lines.push(`ellipse#${this.id}  parent=${this.parentLabel()}`);
    lines.push(`  cx=${this._cx} cy=${this._cy} rx=${this._rx} ry=${this._ry}`);
    if (this._fill !== undefined) lines.push(`  fill=${this._fill}`);
    if (this._stroke !== undefined) lines.push(`  stroke=${this._stroke}`);
    if (this._strokeWidth !== undefined) lines.push(`  stroke-width=${this._strokeWidth}`);
    return lines.join('\n');
  }

  toSvgElement(indent: string): string {
    let s = `${indent}<ellipse id="${this.svgId()}" cx="${this._cx}" cy="${this._cy}" rx="${this._rx}" ry="${this._ry}"`;
    s += this.commonSvgAttrs();
    s += '/>';
    return s;
  }
}
