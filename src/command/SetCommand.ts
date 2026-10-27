import { Command } from './Command';
import { Shape } from '../model/Shape';

export class SetCommand implements Command {
  private shape: Shape;
  private attr: string;
  private newValue: string;
  private oldValue: string | undefined;

  constructor(shape: Shape, attr: string, value: string) {
    this.shape = shape;
    this.attr = attr;
    this.newValue = value;
    this.oldValue = shape.getAttribute(attr);
  }

  execute(): string {
    this.shape.setAttribute(this.attr, this.newValue);
    return `${this.shape.type}#${this.shape.id} updated: ${this.attr}=${this.formatValue(this.newValue)}`;
  }

  undo(): string {
    if (this.oldValue !== undefined) {
      this.shape.setAttribute(this.attr, this.oldValue);
    } else {
      this.shape.removeAttribute(this.attr);
    }
    const value = this.oldValue === undefined ? '(unset)' : this.formatValue(this.oldValue);
    return `${this.shape.type}#${this.shape.id} updated: ${this.attr}=${value}`;
  }

  private formatValue(val: string): string {
    if (this.attr === 'text') return `"${val}"`;
    return val;
  }
}
