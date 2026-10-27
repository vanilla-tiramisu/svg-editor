export class SvgValue {
  static number(value: string | number, name: string, minimum?: number): number {
    const text = String(value).trim();
    const number = Number(text);
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(number)) {
      throw new Error(`${name} must be a finite number`);
    }
    if (minimum !== undefined && number < minimum) {
      throw new Error(`${name} must be at least ${minimum}`);
    }
    return number;
  }

  static positive(value: string | number, name: string): number {
    const number = this.number(value, name);
    if (number <= 0) throw new Error(`${name} must be positive`);
    return number;
  }

  static text(value: string): void {
    for (const character of value) {
      const code = character.codePointAt(0)!;
      if (code !== 9 && code !== 10 && code !== 13 &&
          (code < 32 || (code >= 0xd800 && code <= 0xdfff) || code === 0xfffe || code === 0xffff)) {
        throw new Error('text contains an invalid XML character');
      }
    }
  }

  static id(value: string): void {
    this.text(value);
    if (!value || /\s/.test(value)) throw new Error('id must be nonempty and contain no whitespace');
  }

  static escape(value: string): string {
    this.text(value);
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
  }
}
