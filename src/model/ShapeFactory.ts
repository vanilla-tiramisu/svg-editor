import { Shape } from './Shape';
import { Rect } from './Rect';
import { Circle } from './Circle';
import { Ellipse } from './Ellipse';
import { Line } from './Line';
import { TextShape } from './TextShape';
import { Group } from './Group';

export class ShapeFactory {
  // The single type dispatch shared by CLI creation and SVG import.
  create(type: string, id: string): Shape {
    switch (type) {
      case 'rect': return new Rect(id, 0, 0, 0, 0);
      case 'circle': return new Circle(id, 0, 0, 0);
      case 'ellipse': return new Ellipse(id, 0, 0, 0, 0);
      case 'line': return new Line(id, 0, 0, 0, 0);
      case 'text': return new TextShape(id, 0, 0, '');
      case 'g': return new Group(id);
      default: throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  createFromArgs(type: string, id: string, params: string[]): Shape {
    const shape = this.create(type, id);
    const { required, optional } = shape.creationAttributes();
    if (params.length < required.length || params.length > required.length + optional.length) {
      const syntax = [...required.map(name => `<${name}>`), ...optional.map(name => `[${name}]`)];
      throw new Error(`usage: create ${type} <id> ${syntax.join(' ')}`.trim());
    }
    const attributes = [...required, ...optional];
    params.forEach((value, index) => shape.setAttribute(attributes[index], value));
    return shape;
  }
}
