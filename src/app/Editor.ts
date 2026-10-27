import { SvgDocument } from '../model/SvgDocument';
import { Shape } from '../model/Shape';
import { Group } from '../model/Group';
import { ShapeFactory } from '../model/ShapeFactory';
import { SvgValue } from '../model/SvgValue';
import { CommandHistory } from '../command/CommandHistory';
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
import { CommandToken } from '../parser/CommandToken';
import { SvgSerializer } from '../io/SvgSerializer';
import { SvgReader } from '../io/SvgReader';

export class Editor {
  private doc: SvgDocument | null = null;
  private history: CommandHistory = new CommandHistory();
  private parser: CommandParser = new CommandParser();
  private serializer: SvgSerializer = new SvgSerializer();
  private reader: SvgReader = new SvgReader();

  private factory: ShapeFactory = new ShapeFactory();

  handleLine(line: string): string | null {
    try {
      const result = this.dispatch(line);
      return result?.startsWith('error:') ? result.replace(/[\r\n]+/g, ' ') : result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `error: ${message.replace(/[\r\n]+/g, ' ')}`;
    }
  }

  private dispatch(line: string): string | null {
    const tokens = this.parser.parse(line);
    if (!tokens) return null;

    const cmd = tokens[0].value;
    const args = tokens.slice(1).map(token => token.value);

    switch (cmd) {
      case 'init': return this.handleInit(args);
      case 'read': return this.handleRead(args);
      case 'save': return this.handleSave(args);
      case 'canvas': return this.handleCanvas(args);
      case 'create': return this.handleCreate(args, tokens.slice(3));
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
      case 'help':
        this.checkArgs(args, 0, 0, 'help');
        return this.handleHelp();
      case 'undo':
      case 'redo': {
        this.checkArgs(args, 0, 0, cmd);
        const doc = this.requireDoc();
        if (typeof doc === 'string') return doc;
        return cmd === 'undo' ? this.history.undo() : this.history.redo();
      }
      default: return `error: unknown command: ${cmd}`;
    }
  }

  private requireDoc(): SvgDocument | string {
    if (!this.doc) return "error: no document. use 'init' or 'read' first";
    return this.doc;
  }

  private checkArgs(args: string[], min: number, max: number, syntax: string): void {
    if (args.length < min || args.length > max) throw new Error(`usage: ${syntax}`);
  }

  private handleInit(args: string[]): string {
    this.checkArgs(args, 0, 2, 'init [w] [h]');
    const w = SvgValue.positive(args[0] ?? 800, 'canvas width');
    const h = SvgValue.positive(args[1] ?? 600, 'canvas height');
    this.doc = new SvgDocument(w, h);
    this.history.clear();
    this.history.markIoBlocked();
    return `canvas ${w}x${h} created`;
  }

  private handleRead(args: string[]): string {
    this.checkArgs(args, 1, 1, 'read <file.svg>');
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
    this.checkArgs(args, 0, 1, 'save [file.svg]');
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    const filePath = args.length > 0 ? args[0] : docOrErr.filePath;
    if (!filePath) return 'error: no file path specified';

    const result = this.serializer.save(docOrErr, filePath);
    if (result.startsWith('error:')) return result;
    docOrErr.filePath = filePath;
    this.history.markIoBlocked();
    return result;
  }

  private handleCanvas(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length === 0) {
      return `canvas ${docOrErr.width}x${docOrErr.height}`;
    }
    this.checkArgs(args, 1, 2, 'canvas [w] [h]');
    const width = SvgValue.positive(args[0], 'canvas width');
    const height = SvgValue.positive(args[1] ?? docOrErr.height, 'canvas height');
    docOrErr.width = width;
    docOrErr.height = height;
    this.history.markIoBlocked();
    return `canvas ${docOrErr.width}x${docOrErr.height}`;
  }

  private handleCreate(args: string[], parameterTokens: CommandToken[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    if (args.length < 2) return 'error: usage: create <type> <id> [params…] [in <containerId>]';

    const type = args[0];
    const id = args[1];
    if (docOrErr.hasId(id)) {
      return `error: id already exists: ${id}`;
    }

    const { params, containerId } = this.parser.extractInClause(parameterTokens);

    let container: Group | null = null;
    if (containerId) {
      const containerShape = docOrErr.findById(containerId);
      if (!containerShape) return `error: no such container: ${containerId}`;
      if (!containerShape.isGroup()) return `error: not a container: ${containerId}`;
      container = containerShape;
    }

    const shape = this.factory.createFromArgs(type, id, params);

    const cmd = new CreateCommand(docOrErr, shape, container);
    return this.history.execute(cmd);
  }

  private handleDelete(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    this.checkArgs(args, 1, 1, 'delete <id>');
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new DeleteCommand(docOrErr, shape);
    return this.history.execute(cmd);
  }

  private handleMove(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    this.checkArgs(args, 3, 3, 'move <id> <dx> <dy>');
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new MoveCommand(shape, SvgValue.number(args[1], 'dx'), SvgValue.number(args[2], 'dy'));
    return this.history.execute(cmd);
  }

  private handleScale(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    this.checkArgs(args, 2, 2, 'scale <id> <factor>');
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const factor = SvgValue.positive(args[1], 'scale factor');

    const cmd = new ScaleCommand(shape, factor);
    return this.history.execute(cmd);
  }

  private handleSet(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    this.checkArgs(args, 3, 3, 'set <id> <attr> <value>');
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const attr = args[1];
    const value = args[2];

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

    this.checkArgs(args, 1, 1, 'ungroup <gid>');
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

    this.checkArgs(args, 2, 2, 'addto <gid> <id>');
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

    this.checkArgs(args, 1, 1, 'front <id>');
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new FrontCommand(docOrErr, shape);
    return this.history.execute(cmd);
  }

  private handleBack(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    this.checkArgs(args, 1, 1, 'back <id>');
    const shape = docOrErr.findById(args[0]);
    if (!shape) return `error: no such shape: ${args[0]}`;

    const cmd = new BackCommand(docOrErr, shape);
    return this.history.execute(cmd);
  }

  private handleTree(args: string[]): string {
    this.checkArgs(args, 0, 1, 'tree [id]');
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    return docOrErr.treeString(args[0]);
  }

  private handleShow(args: string[]): string {
    const docOrErr = this.requireDoc();
    if (typeof docOrErr === 'string') return docOrErr;

    this.checkArgs(args, 1, 1, 'show <id>');
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
