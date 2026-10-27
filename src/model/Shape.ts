import type { Group } from './Group';
import { SvgValue } from './SvgValue';

export abstract class Shape {
  private _parent: Group | null = null;

  constructor(protected _id: string) {
    SvgValue.id(_id);
  }

  get id(): string {
    return this._id;
  }

  get parent(): Group | null {
    return this._parent;
  }

  set parent(p: Group | null) {
    this._parent = p;
  }

  abstract get type(): string;

  abstract move(dx: number, dy: number): void;

  abstract scale(factor: number): void;

  abstract getAttribute(name: string): string | undefined;

  abstract setAttribute(name: string, value: string): void;

  abstract allowedAttributes(): string[];

  abstract toSvgElement(indent: string): string;

  abstract treeLabel(): string;

  abstract showDetails(): string;

  abstract positionLabel(): string;

  creationAttributes(): { required: string[]; optional: string[] } {
    return { required: this.geometryAttributes(), optional: ['fill'] };
  }

  geometryAttributes(): string[] {
    return this.allowedAttributes().filter(name => !this.commonAllowed().includes(name) && name !== 'text');
  }

  validateAttribute(name: string, value: string): void {
    if (!this.allowedAttributes().includes(name)) throw new Error(`unknown attribute: ${name}`);
    SvgValue.text(value);
    if (this.geometryAttributes().includes(name) || name === 'stroke-width') {
      const nonnegative = ['width', 'height', 'r', 'rx', 'ry', 'stroke-width'].includes(name);
      SvgValue.number(value, name, nonnegative ? 0 : undefined);
    }
  }

  validate(): void {
    for (const name of this.allowedAttributes()) {
      const value = this.getAttribute(name);
      if (value !== undefined) this.validateAttribute(name, value);
    }
  }

  removeAttribute(name: string): void {
    if (!this.commonAllowed().includes(name)) throw new Error(`cannot remove attribute: ${name}`);
    this.setCommonAttribute(name, undefined);
  }

  protected svgId(): string {
    return SvgValue.escape(this.id);
  }

  isGroup(): this is Group {
    return false;
  }

  parentLabel(): string {
    if (this._parent) {
      return `g#${this._parent.id}`;
    }
    return 'svg';
  }

  protected commonAllowed(): string[] {
    return ['fill', 'stroke', 'stroke-width'];
  }

  protected _fill?: string;
  protected _stroke?: string;
  protected _strokeWidth?: string;

  get fill(): string | undefined { return this._fill; }
  get stroke(): string | undefined { return this._stroke; }
  get strokeWidth(): string | undefined { return this._strokeWidth; }

  protected getCommonAttribute(name: string): string | undefined {
    switch (name) {
      case 'fill': return this._fill;
      case 'stroke': return this._stroke;
      case 'stroke-width': return this._strokeWidth;
      default: return undefined;
    }
  }

  protected setCommonAttribute(name: string, value: string | undefined): boolean {
    switch (name) {
      case 'fill': this._fill = value; return true;
      case 'stroke': this._stroke = value; return true;
      case 'stroke-width': this._strokeWidth = value; return true;
      default: return false;
    }
  }

  protected commonSvgAttrs(): string {
    let s = '';
    if (this._fill !== undefined) s += ` fill="${SvgValue.escape(this._fill)}"`;
    if (this._stroke !== undefined) s += ` stroke="${SvgValue.escape(this._stroke)}"`;
    if (this._strokeWidth !== undefined) s += ` stroke-width="${SvgValue.escape(this._strokeWidth)}"`;
    return s;
  }

  saveGeometry(): Record<string, string> {
    const geo: Record<string, string> = {};
    for (const attr of this.allowedAttributes()) {
      const val = this.getAttribute(attr);
      if (val !== undefined) {
        geo[attr] = val;
      }
    }
    return geo;
  }

  restoreGeometry(geo: Record<string, string>): void {
    for (const [attr, val] of Object.entries(geo)) {
      this.setAttribute(attr, val);
    }
  }
}
