import { Group } from './Group';

export abstract class Shape {
  private _parent: Group | null = null;

  constructor(protected _id: string) {}

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

  protected setCommonAttribute(name: string, value: string): boolean {
    switch (name) {
      case 'fill': this._fill = value; return true;
      case 'stroke': this._stroke = value; return true;
      case 'stroke-width': this._strokeWidth = value; return true;
      default: return false;
    }
  }

  protected commonSvgAttrs(): string {
    let s = '';
    if (this._fill !== undefined) s += ` fill="${this._fill}"`;
    if (this._stroke !== undefined) s += ` stroke="${this._stroke}"`;
    if (this._strokeWidth !== undefined) s += ` stroke-width="${this._strokeWidth}"`;
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
