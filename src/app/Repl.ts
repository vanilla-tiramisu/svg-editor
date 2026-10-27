import * as readline from 'readline';
import { Editor } from './Editor';

export class Repl {
  private editor: Editor;

  constructor() {
    this.editor = new Editor();
  }

  start(): void {
    console.log("svg-editor 0.1 — type 'help' for commands");
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'svg> ',
    });

    rl.prompt();

    rl.on('line', (line: string) => {
      const result = this.editor.handleLine(line);
      if (result !== null) {
        console.log(result);
      }
      console.log('');
      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }
}
