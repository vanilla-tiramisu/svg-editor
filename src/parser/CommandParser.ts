export class CommandParser {
  parse(line: string): string[] | null {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return null;

    const tokens: string[] = [];
    let i = 0;

    while (i < trimmed.length) {
      if (trimmed[i] === ' ' || trimmed[i] === '\t') {
        i++;
        continue;
      }

      if (trimmed[i] === '"') {
        i++;
        let str = '';
        while (i < trimmed.length && trimmed[i] !== '"') {
          str += trimmed[i];
          i++;
        }
        if (i < trimmed.length) i++;
        tokens.push(str);
      } else {
        let token = '';
        while (i < trimmed.length && trimmed[i] !== ' ' && trimmed[i] !== '\t') {
          token += trimmed[i];
          i++;
        }
        tokens.push(token);
      }
    }

    return tokens.length > 0 ? tokens : null;
  }

  extractInClause(tokens: string[]): { params: string[]; containerId: string | null } {
    if (tokens.length >= 2 && tokens[tokens.length - 2] === 'in') {
      return {
        params: tokens.slice(0, tokens.length - 2),
        containerId: tokens[tokens.length - 1],
      };
    }
    return { params: tokens, containerId: null };
  }
}
