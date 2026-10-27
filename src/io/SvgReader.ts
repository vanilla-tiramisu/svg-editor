import * as fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';
import { SaxesParser } from 'saxes';
import { SvgDocument } from '../model/SvgDocument';
import { Shape } from '../model/Shape';
import { ShapeFactory } from '../model/ShapeFactory';
import { SvgValue } from '../model/SvgValue';

export class SvgReader {
  private warnings: string[] = [];
  private idCounter: Map<string, number> = new Map();
  private usedIds: Set<string> = new Set();
  private factory = new ShapeFactory();

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

    try {
      SvgValue.text(content);
      const validator = new SaxesParser({ xmlns: true });
      validator.on('error', error => { throw error; });
      validator.on('doctype', () => { throw new Error('DOCTYPE is not supported'); });
      validator.write(content).close();
      let malformed = false;
      const parser = new DOMParser({
        errorHandler: {
          warning: () => { malformed = true; },
          error: () => { malformed = true; },
          fatalError: () => { malformed = true; },
        },
      });
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      const svgEl = xmlDoc?.documentElement;
      if (malformed || !svgEl || svgEl.localName !== 'svg' || !this.isSvgNamespace(svgEl)) {
        throw new Error('malformed XML or missing SVG root');
      }
      if (xmlDoc.doctype) throw new Error('DOCTYPE is not supported');
      for (let i = 0; i < xmlDoc.childNodes.length; i++) {
        const node = xmlDoc.childNodes[i];
        if (node.nodeType === 3 && node.nodeValue?.trim()) throw new Error('text outside SVG root');
      }

      const width = SvgValue.positive(svgEl.hasAttribute('width') ? svgEl.getAttribute('width')! : 800, 'canvas width');
      const height = SvgValue.positive(svgEl.hasAttribute('height') ? svgEl.getAttribute('height')! : 600, 'canvas height');
      const doc = new SvgDocument(width, height);
      doc.filePath = filePath;
      this.collectExistingIds(svgEl);
      this.warnAttributes(svgEl, ['width', 'height', 'viewBox']);
      if (svgEl.hasAttribute('viewBox')) {
        const parts = svgEl.getAttribute('viewBox')!.trim().split(/[\s,]+/).map(Number);
        if (parts.length !== 4 || parts.some((value, index) => value !== [0, 0, width, height][index])) {
          this.warnings.push('warning: ignored unsupported viewBox; using canvas dimensions');
        }
      }
      for (const shape of this.parseChildren(svgEl, 0)) doc.addChild(shape);
      return { doc, warnings: this.warnings };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return `error: invalid SVG file: ${filePath}: ${reason}`.replace(/[\r\n]+/g, ' ');
    }
  }

  private collectExistingIds(el: Element, depth: number = 0): void {
    if (depth > 256) throw new Error('SVG nesting exceeds 256 levels');
    const id = el.getAttribute('id');
    if (el.hasAttribute('id')) {
      SvgValue.id(id!);
      if (this.usedIds.has(id!)) throw new Error(`id already exists: ${id}`);
      this.usedIds.add(id!);
    }
    const children = el.childNodes;
    for (let i = 0; i < children.length; i++) {
      if (children[i].nodeType === 1) {
        this.collectExistingIds(children[i] as Element, depth + 1);
      }
    }
  }

  private autoId(tagName: string): string {
    let count = (this.idCounter.get(tagName) || 0) + 1;
    let id = `${tagName}${count}`;
    while (this.usedIds.has(id)) {
      id = `${tagName}${++count}`;
    }
    this.idCounter.set(tagName, count);
    this.usedIds.add(id);
    return id;
  }

  private ensureId(el: Element): string {
    let id = el.getAttribute('id');
    if (!id) {
      id = this.autoId(el.localName);
      this.warnings.push(`warning: assigned id ${id} to unnamed <${el.tagName}>`);
    }
    return id;
  }

  private isSvgNamespace(el: Element): boolean {
    return !el.namespaceURI || el.namespaceURI === 'http://www.w3.org/2000/svg';
  }

  private parseElement(el: Element, depth: number): Shape | null {
    if (!this.isSvgNamespace(el)) {
      this.warnings.push(`warning: skipped unsupported element <${el.tagName}> and its subtree`);
      return null;
    }
    let shape: Shape;
    try {
      shape = this.factory.create(el.localName, this.ensureId(el));
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('unknown shape type:')) throw error;
      this.warnings.push(`warning: skipped unsupported element <${el.tagName}> and its subtree`);
      return null;
    }
    const attributes = shape.allowedAttributes().filter(name => name !== 'text');
    this.warnAttributes(el, ['id', ...attributes]);
    for (const name of attributes) {
      if (el.hasAttribute(name)) shape.setAttribute(name, el.getAttribute(name)!);
    }
    if (shape.isGroup()) {
      for (const child of this.parseChildren(el, depth)) shape.addChild(child);
    } else {
      for (let i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 1) {
          throw new Error(`unsupported child element in <${el.tagName}>`);
        }
      }
      if (shape.allowedAttributes().includes('text')) {
        shape.setAttribute('text', el.textContent || '');
      } else if (el.textContent?.trim()) {
        throw new Error(`unexpected text in <${el.tagName}>`);
      }
    }
    shape.validate();
    return shape;
  }

  private parseChildren(el: Element, depth: number): Shape[] {
    const shapes: Shape[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node.nodeType === 1) {
        const shape = this.parseElement(node as Element, depth + 1);
        if (shape) shapes.push(shape);
      } else if ((node.nodeType === 3 || node.nodeType === 4) && node.nodeValue?.trim()) {
        throw new Error(`unexpected text in <${el.tagName}>`);
      }
    }
    return shapes;
  }

  private warnAttributes(el: Element, allowed: string[]): void {
    for (let i = 0; i < el.attributes.length; i++) {
      const name = el.attributes[i].name;
      if (name === 'xmlns' || name.startsWith('xmlns:')) continue;
      if (!allowed.includes(name)) {
        this.warnings.push(`warning: ignored unsupported attribute ${name} on <${el.tagName}>`);
      }
    }
  }
}
