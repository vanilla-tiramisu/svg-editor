import { CommandToken } from './CommandToken';

export class CommandParser {
  parse(line: string): CommandToken[] | null {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return null;

    const tokens: CommandToken[] = [];
    let i = 0;

    while (i < trimmed.length) {
      if (/\s/.test(trimmed[i])) {
        i++;
        continue;
      }

      if (trimmed[i] === '"') {
        i++;
        let str = '';
        while (i < trimmed.length && trimmed[i] !== '"') {
          if (trimmed[i] === '\\' && (trimmed[i + 1] === '"' || trimmed[i + 1] === '\\')) {
            i++;
          }
          str += trimmed[i];
          i++;
        }
        if (i === trimmed.length) throw new Error('unclosed double quote');
        i++;
        if (i < trimmed.length && !/\s/.test(trimmed[i])) {
          throw new Error('expected whitespace after quoted argument');
        }
        tokens.push(new CommandToken(str, true));
      } else {
        let token = '';
        while (i < trimmed.length && !/\s/.test(trimmed[i])) {
          if (trimmed[i] === '"') throw new Error('double quote must start an argument');
          token += trimmed[i];
          i++;
        }
        tokens.push(new CommandToken(token));
      }
    }

    return tokens.length > 0 ? tokens : null;
  }

  extractInClause(tokens: CommandToken[]): { params: string[]; containerId: string | null } {
    const last = tokens[tokens.length - 1];
    const beforeLast = tokens[tokens.length - 2];
    if (last?.value === 'in' && !last.quoted && !(beforeLast?.value === 'in' && !beforeLast.quoted)) {
      throw new Error('usage: in <containerId> (quote "in" when used as a value)');
    }
    if (beforeLast?.value === 'in' && !beforeLast.quoted) {
      if (!last.value) throw new Error('container id must not be empty');
      return {
        params: tokens.slice(0, -2).map(token => token.value),
        containerId: last.value,
      };
    }
    return { params: tokens.map(token => token.value), containerId: null };
  }
}
