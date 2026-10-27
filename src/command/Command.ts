export interface Command {
  execute(): string;
  undo(): string;
}
