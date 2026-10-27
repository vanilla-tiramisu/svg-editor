import { Shape } from './Shape';

export class TextShape extends Shape {
  private _x: number;
  private _y: number;
  private _content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this._x = x;
    this._y = y;
    this._content = content;
  }

  get type(): string { return 'text'; }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get content(): string { return this._content; }

  move(dx: number, dy: number): void {
    this._x += dx;
    this._y += dy;
  }

  scale(factor: number): void {
    this._x *= factor;
    this._y *= factor;
  }

  allowedAttributes(): string[] {
    return [...this.commonAllowed(), 'x', 'y', 'text'];
  }

  getAttribute(name: string): string | undefined {
    switch (name) {
      case 'x': return String(this._x);
      case 'y': return String(this._y);
      case 'text': return this._content;
      default: return this.getCommonAttribute(name);
    }
  }

  setAttribute(name: string, value: string): void {
    if (this.setCommonAttribute(name, value)) return;
    switch (name) {
      case 'x': this._x = Number(value); break;
      case 'y': this._y = Number(value); break;
      case 'text': this._content = value; break;
    }
  }

  positionLabel(): string {
    return `(${this._x},${this._y})`;
  }

  treeLabel(): string {
    const tag = `text#${this.id}`;
    const pad = Math.max(tag.length + 1, 16);
    let s = tag.padEnd(pad);
    s += `(${this._x},${this._y}) "${this._content}"`;
    return s;
  }

  showDetails(): string {
    const lines: string[] = [];
    lines.push(`text#${this.id}  parent=${this.parentLabel()}`);
    lines.push(`  x=${this._x} y=${this._y}`);
    lines.push(`  text="${this._content}"`);
    if (this._fill !== undefined) lines.push(`  fill=${this._fill}`);
    if (this._stroke !== undefined) lines.push(`  stroke=${this._stroke}`);
    if (this._strokeWidth !== undefined) lines.push(`  stroke-width=${this._strokeWidth}`);
    return lines.join('\n');
  }

  toSvgElement(indent: string): string {
    let s = `${indent}<text id="${this.id}" x="${this._x}" y="${this._y}"`;
    s += this.commonSvgAttrs();
    s += `>${this.escapeXml(this._content)}</text>`;
    return s;
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
