import * as fs from 'fs';
import { SvgDocument } from '../model/SvgDocument';

export class SvgSerializer {
  save(doc: SvgDocument, filePath: string): string {
    try {
      fs.writeFileSync(filePath, doc.toSvg(), 'utf-8');
      return `saved to ${filePath} (${doc.countElements()} elements)`;
    } catch {
      return `error: cannot write file: ${filePath}`;
    }
  }
}
