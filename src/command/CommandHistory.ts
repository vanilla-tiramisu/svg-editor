import { Command } from './Command';

export class CommandHistory {
  private _undoStack: Command[] = [];
  private _redoStack: Command[] = [];
  private _ioBlocked: boolean = false;

  execute(cmd: Command): string {
    const result = cmd.execute();
    this._undoStack.push(cmd);
    this._redoStack = [];
    this._ioBlocked = false;
    return result;
  }

  undo(): string {
    if (this._ioBlocked) {
      return 'error: undo not allowed after io command';
    }
    if (this._undoStack.length === 0) {
      return 'error: nothing to undo';
    }
    const cmd = this._undoStack.pop()!;
    const result = cmd.undo();
    this._redoStack.push(cmd);
    return result;
  }

  redo(): string {
    if (this._ioBlocked) {
      return 'error: undo not allowed after io command';
    }
    if (this._redoStack.length === 0) {
      return 'error: nothing to redo';
    }
    const cmd = this._redoStack.pop()!;
    const result = cmd.execute();
    this._undoStack.push(cmd);
    return result;
  }

  markIoBlocked(): void {
    this._ioBlocked = true;
  }

  clear(): void {
    this._undoStack = [];
    this._redoStack = [];
    this._ioBlocked = false;
  }
}
