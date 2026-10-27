import { SvgDocument } from '../model/SvgDocument';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { Rect } from '../model/Rect';
import { Circle } from '../model/Circle';
import { Ellipse } from '../model/Ellipse';
import { Line } from '../model/Line';
import { TextShape } from '../model/TextShape';
import { CommandHistory } from '../command/CommandHistory';
import { Command } from '../command/Command';
import { CreateCommand } from '../command/CreateCommand';
import { DeleteCommand } from '../command/DeleteCommand';
import { MoveCommand } from '../command/MoveCommand';
import { ScaleCommand } from '../command/ScaleCommand';
import { SetCommand } from '../command/SetCommand';
import { GroupCommand } from '../command/GroupCommand';
import { UngroupCommand } from '../command/UngroupCommand';
import { AddtoCommand } from '../command/AddtoCommand';
import { FrontCommand } from '../command/FrontCommand';
import { BackCommand } from '../command/BackCommand';
import { CommandParser } from '../parser/CommandParser';
import { SvgSerializer } from '../io/SvgSerializer';
import { SvgReader } from '../io/SvgReader';

export class Editor {
  private doc: SvgDocument | null = null;
  private history: CommandHistory = new CommandHistory();
  private parser: CommandParser = new CommandParser();
  private serializer: SvgSerializer = new SvgSerializer();
  private reader: SvgReader = new SvgReader();

  private static KNOWN_TYPES = new Set(['rect', 'circle', 'ellipse', 'line', 'text', 'g']);

  handleLine(line: string): string | null {
    const tokens = this.parser.parse(line);
    if (!tokens) return null;

    const cmd = tokens[0];
    const args = tokens.slice(1);

    switch (cmd) {
      case 'init': return this.handleInit(args);
      case 'read': return this.handleRead(args);
      case 'save': return this.handleSave(args);
      case 'canvas': return this.handleCanvas(args);
      case 'create': return this.handleCreate(args);
      case 'delete': return this.handleDelete(args);
      case 'move': return this.handleMove(args);
      case 'scale': return this.handleScale(args);
      case 'set': return this.handleSet(args);
      case 'group': return this.handleGroup(args);
      case 'ungroup': return this.handleUngroup(args);
      case 'addto': return this.handleAddto(args);
      case 'front': return this.handleFront(args);
      case 'back': return this.handleBack(args);
      case 'tree': return this.handleTree(args);
      case 'show': return this.handleShow(args);
      case 'help': return this.handleHelp();
      case 'undo': return this.history.undo();
      case 'redo': return this.history.redo();
      default: return `error: unknown command: ${cmd}`;
    }
  }

  private requireDoc(): SvgDocument | string {
    if (!this.doc) return "error: no document. use 'init' or 'read' first";
    return this.doc;
  }

  private handleInit(args: string[]): string {
    const w = args.length > 0 ? Number(args[0]) : 800;
    const h = args.length > 1 ? Number(args[1]) : 600;
    this.doc = new SvgDocument(w, h);
    this.history.clear();
    this.history.markIoBlocked();
    return `canvas ${w}x${h} created`;
  }

  private handleRead(args: string[]): string {
    if (args.length < 1) return 'error: usage: read <file.svg>';
    const filePath = args[0];
    const result = this.reader.read(filePath);
    if (typeof result === 'string') return result;

    this.doc = result.doc;
    this.history.clear();
    this.history.markIoBlocked();

    const lines: string[] = [];
    for (const w of result.warnings) {
      lines.push(w);
    }
    lines.push(`read ${filePath} (${this.doc.countElements()} elements)`);
    return lines.join('\n');
  }

  private handleSave(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    let filePath = args.length > 0 ? args[0] : docOrErr.filePath;
    if (!filePath) return 'error: no file path specified';

    docOrErr.filePath = filePath;
    this.history.markIoBlocked();
    return this.serializer.save(docOrErr, filePath);
  }

  private handleCanvas(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length === 0) {
      return `canvas ${docOrErr.width}x${docOrErr.height}`;
    }
    docOrErr.width = Number(args[0]);
    if (args.length > 1) docOrErr.height = Number(args[1]);
    this.history.markIoBlocked();
    return `canvas ${docOrErr.width}x${docOrErr.height}`;
  }

  private handleCreate(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 2) return 'error: usage: create <type> <id> [params…] [in <containerId>]';

    const type = args[0];
    const id = args[1];
    const rest = args.slice(2);

    if (!Editor.KNOWN_TYPES.has(type)) {
      return `error: unknown shape type: ${type} (is the plugin loaded?)`;
    }

    if (docOrErr.hasId(id)) {
      return `error: id already exists: ${id}`;
    }

    const { params, containerId } = this.parser.extractInClause(rest);

    let container: Group | null = null;
    if (containerId) {
      const containerShape = docOrErr.findById(containerId);
      if (!containerShape) return `error: no such container: ${containerId}`;
      if (!containerShape.isGroup()) return `error: not a container: ${containerId}`;
      container = containerShape;
    }

    const shape = this.createShape(type, id, params);
    if (typeof shape === 'string') return shape;

    const cmd = new CreateCommand(docOrErr, shape, container);
    return this.history.execute(cmd);
  }

  private createShape(type: string, id: string, params: string[]): Shape | string {
    switch (type) {
      case 'rect': {
        if (params.length < 4) return 'error: usage: create rect <id> <x> <y> <w> <h> [fill]';
        const fill = params.length > 4 ? params[4] : undefined;
        return new Rect(id, Number(params[0]), Number(params[1]), Number(params[2]), Number(params[3]), fill);
      }
      case 'circle': {
        if (params.length < 3) return 'error: usage: create circle <id> <cx> <cy> <r> [fill]';
        const fill = params.length > 3 ? params[3] : undefined;
        return new Circle(id, Number(params[0]), Number(params[1]), Number(params[2]), fill);
      }
      case 'ellipse': {
        if (params.length < 4) return 'error: usage: create ellipse <id> <cx> <cy> <rx> <ry> [fill]';
        const fill = params.length > 4 ? params[4] : undefined;
        return new Ellipse(id, Number(params[0]), Number(params[1]), Number(params[2]), Number(params[3]), fill);
      }
      case 'line': {
        if (params.length < 4) return 'error: usage: create line <id> <x1> <y1> <x2> <y2> [stroke]';
        const stroke = params.length > 4 ? params[4] : undefined;
        return new Line(id, Number(params[0]), Number(params[1]), Number(params[2]), Number(params[3]), stroke);
      }
      case 'text': {
        if (params.length < 3) return 'error: usage: create text <id> <x> <y> "content"';
        return new TextShape(id, Number(params[0]), Number(params[1]), params[2]);
      }
      case 'g': {
        return new Group(id);
      }
      default:
        return `error: unknown shape type: ${type} (is the plugin loaded?)`;
    }
  }

  private handleDelete(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 1) return 'error: usage: delete <id>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new DeleteCommand(docOrErr, shape);
    return this.history.execute(cmd);
  }

  private handleMove(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 3) return 'error: usage: move <id> <dx> <dy>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new MoveCommand(shape, Number(args[1]), Number(args[2]));
    return this.history.execute(cmd);
  }

  private handleScale(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 2) return 'error: usage: scale <id> <factor>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const factor = Number(args[1]);
    if (factor <= 0) return 'error: scale factor must be positive';

    const cmd = new ScaleCommand(shape, factor);
    return this.history.execute(cmd);
  }

  private handleSet(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 3) return 'error: usage: set <id> <attr> <value>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const attr = args[1];
    const value = args.slice(2).join(' ');

    if (!shape.allowedAttributes().includes(attr)) {
      return `error: unknown attribute: ${attr}`;
    }

    const cmd = new SetCommand(shape, attr, value);
    return this.history.execute(cmd);
  }

  private handleGroup(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 3) return 'error: usage: group <newGid> <id1> <id2>…';
    const gid = args[0];
    const ids = args.slice(1);

    if (docOrErr.hasId(gid)) return `error: id already exists: ${gid}`;

    const shapes: Shape[] = [];
    for (const id of ids) {
      const s = docOrErr.findById(id);
      if (!s) return `error: no such shape: ${id}`;
      shapes.push(s);
    }

    for (let i = 0; i < shapes.length; i++) {
      for (let j = 0; j < shapes.length; j++) {
        const sj = shapes[j];
        if (i !== j && sj.isGroup() && sj.containsDescendant(shapes[i])) {
          return `error: cannot group a container into its own descendant: ${sj.id}`;
        }
      }
    }

    const cmd = new GroupCommand(docOrErr, gid, ids);
    return this.history.execute(cmd);
  }

  private handleUngroup(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 1) return 'error: usage: ungroup <gid>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;
    if (!shape.isGroup()) return `error: not a container: ${args[0]}`;

    if (docOrErr.isTopLevel(shape)) {
      return `error: cannot ungroup top-level container: ${args[0]}`;
    }

    const cmd = new UngroupCommand(docOrErr, shape);
    return this.history.execute(cmd);
  }

  private handleAddto(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 2) return 'error: usage: addto <gid> <id>';
    const container = docOrErr.findById(args[0]);
    if (!container) return `error: no such container: ${args[0]}`;
    if (!container.isGroup()) return `error: not a container: ${args[0]}`;

    const shape = docOrErr.findById(args[1]);
    if (!shape) return `error: no such shape: ${args[1]}`;

    const cmd = new AddtoCommand(docOrErr, container, shape);
    return this.history.execute(cmd);
  }

  private handleFront(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 1) return 'error: usage: front <id>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new FrontCommand(docOrErr, shape);
    return this.history.execute(cmd);
  }

  private handleBack(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 1) return 'error: usage: back <id>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new BackCommand(docOrErr, shape);
    return this.history.execute(cmd);
  }

  private handleTree(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    return docOrErr.treeString(args[0]);
  }

  private handleShow(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 1) return 'error: usage: show <id>';
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    return shape.showDetails();
  }

  private handleHelp(): string {
    return [
      'Document commands:',
      '  init [w] [h]             — create new canvas (default 800x600)',
      '  read <file.svg>          — read SVG file',
      '  save [file.svg]          — save current document',
      '  canvas [w] [h]           — show/set canvas size',
      '',
      'Edit commands (undoable):',
      '  create <type> <id> [params…] [in <gid>]',
      '    rect   <id> <x> <y> <w> <h> [fill]',
      '    circle <id> <cx> <cy> <r> [fill]',
      '    ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      '    line   <id> <x1> <y1> <x2> <y2> [stroke]',
      '    text   <id> <x> <y> "content"',
      '    g      <id>',
      '  delete <id>              — delete shape (with descendants)',
      '  move <id> <dx> <dy>     — translate shape',
      '  scale <id> <factor>     — scale shape geometry',
      '  set <id> <attr> <value> — set attribute',
      '  group <gid> <id1> <id2>… — group shapes into new container',
      '  ungroup <gid>           — dissolve container',
      '  addto <gid> <id>        — move shape into container',
      '  front <id>              — bring to front (z-order)',
      '  back <id>               — send to back (z-order)',
      '',
      'Display commands:',
      '  tree [id]               — show structure tree',
      '  show <id>               — show shape details',
      '  help                    — this message',
      '',
      'Undo/Redo:',
      '  undo                    — undo last edit',
      '  redo                    — redo last undo',
    ].join('\n');
  }
}
