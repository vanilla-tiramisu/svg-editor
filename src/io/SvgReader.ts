import * as fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';
import { SvgDocument } from '../model/SvgDocument';
import { Shape } from '../model/Shape';
import { Rect } from '../model/Rect';
import { Circle } from '../model/Circle';
import { Ellipse } from '../model/Ellipse';
import { Line } from '../model/Line';
import { TextShape } from '../model/TextShape';
import { Group } from '../model/Group';

export class SvgReader {
  private warnings: string[] = [];
  private idCounter: Map<string, number> = new Map();
  private usedIds: Set<string> = new Set();

  read(filePath: string): { doc: SvgDocument; warnings: string[] } | string {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return `error: cannot read file: ${filePath}`;
    }

    this.warnings = [];
    this.idCounter = new Map();
    this.usedIds = new Set();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    const svgEl = xmlDoc.documentElement;

    if (!svgEl || svgEl.tagName !== 'svg') {
      return `error: invalid SVG file: ${filePath}`;
    }

    const width = Number(svgEl.getAttribute('width') || '800');
    const height = Number(svgEl.getAttribute('height') || '600');
    const doc = new SvgDocument(width, height);
    doc.filePath = filePath;

    this.collectExistingIds(svgEl);

    const children = svgEl.childNodes;
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.nodeType === 1) {
        const shape = this.parseElement(node as Element);
        if (shape) {
          doc.addChild(shape);
        }
      }
    }

    return { doc, warnings: this.warnings };
  }

  private collectExistingIds(el: Element): void {
    const id = el.getAttribute('id');
    if (id) this.usedIds.add(id);
    const children = el.childNodes;
    for (let i = 0; i < children.length; i++) {
      if (children[i].nodeType === 1) {
        this.collectExistingIds(children[i] as Element);
      }
    }
  }

  private autoId(tagName: string): string {
    const count = (this.idCounter.get(tagName) || 0) + 1;
    this.idCounter.set(tagName, count);
    let id = `${tagName}${count}`;
    while (this.usedIds.has(id)) {
      this.idCounter.set(tagName, count + 1);
      id = `${tagName}${this.idCounter.get(tagName)}`;
    }
    this.usedIds.add(id);
    return id;
  }

  private ensureId(el: Element): string {
    let id = el.getAttribute('id');
    if (!id) {
      id = this.autoId(el.tagName);
      this.warnings.push(`warning: assigned id ${id} to unnamed <${el.tagName}>`);
    }
    return id;
  }

  private parseElement(el: Element): Shape | null {
    const tag = el.tagName;
    const id = this.ensureId(el);

    switch (tag) {
      case 'rect': return this.parseRect(el, id);
      case 'circle': return this.parseCircle(el, id);
      case 'ellipse': return this.parseEllipse(el, id);
      case 'line': return this.parseLine(el, id);
      case 'text': return this.parseText(el, id);
      case 'g': return this.parseGroup(el, id);
      default: return null;
    }
  }

  private parseRect(el: Element, id: string): Rect {
    const x = Number(el.getAttribute('x') || '0');
    const y = Number(el.getAttribute('y') || '0');
    const w = Number(el.getAttribute('width') || '0');
    const h = Number(el.getAttribute('height') || '0');
    const fill = el.getAttribute('fill') || undefined;
    const rect = new Rect(id, x, y, w, h, fill);
    this.applyCommonAttrs(el, rect);
    return rect;
  }

  private parseCircle(el: Element, id: string): Circle {
    const cx = Number(el.getAttribute('cx') || '0');
    const cy = Number(el.getAttribute('cy') || '0');
    const r = Number(el.getAttribute('r') || '0');
    const fill = el.getAttribute('fill') || undefined;
    const circle = new Circle(id, cx, cy, r, fill);
    this.applyCommonAttrs(el, circle);
    return circle;
  }

  private parseEllipse(el: Element, id: string): Ellipse {
    const cx = Number(el.getAttribute('cx') || '0');
    const cy = Number(el.getAttribute('cy') || '0');
    const rx = Number(el.getAttribute('rx') || '0');
    const ry = Number(el.getAttribute('ry') || '0');
    const fill = el.getAttribute('fill') || undefined;
    const ellipse = new Ellipse(id, cx, cy, rx, ry, fill);
    this.applyCommonAttrs(el, ellipse);
    return ellipse;
  }

  private parseLine(el: Element, id: string): Line {
    const x1 = Number(el.getAttribute('x1') || '0');
    const y1 = Number(el.getAttribute('y1') || '0');
    const x2 = Number(el.getAttribute('x2') || '0');
    const y2 = Number(el.getAttribute('y2') || '0');
    const stroke = el.getAttribute('stroke') || undefined;
    const line = new Line(id, x1, y1, x2, y2, stroke);
    this.applyCommonAttrs(el, line);
    return line;
  }

  private parseText(el: Element, id: string): TextShape {
    const x = Number(el.getAttribute('x') || '0');
    const y = Number(el.getAttribute('y') || '0');
    const content = el.textContent || '';
    const text = new TextShape(id, x, y, content);
    const fill = el.getAttribute('fill') || undefined;
    if (fill) text.setAttribute('fill', fill);
    this.applyCommonAttrs(el, text);
    return text;
  }

  private parseGroup(el: Element, id: string): Group {
    const group = new Group(id);
    const fill = el.getAttribute('fill') || undefined;
    if (fill) group.setAttribute('fill', fill);
    this.applyCommonAttrs(el, group);

    const children = el.childNodes;
    for (let i = 0; i < children.length; i++) {
      if (children[i].nodeType === 1) {
        const child = this.parseElement(children[i] as Element);
        if (child) {
          group.addChild(child);
        }
      }
    }
    return group;
  }

  private applyCommonAttrs(el: Element, shape: Shape): void {
    const stroke = el.getAttribute('stroke');
    if (stroke) shape.setAttribute('stroke', stroke);
    const strokeWidth = el.getAttribute('stroke-width');
    if (strokeWidth) shape.setAttribute('stroke-width', strokeWidth);
  }
}
