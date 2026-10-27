import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { SvgDocument } from '../model/SvgDocument';

export class SvgSerializer {
  save(doc: SvgDocument, filePath: string): string {
    const temporary = `${filePath}.${randomUUID()}.tmp`;
    try {
      for (const shape of doc.orderedShapes()) shape.validate();
      const content = doc.toSvg();
      // Replace only after the complete file has been written successfully.
      fs.writeFileSync(temporary, content, { encoding: 'utf-8', flag: 'wx' });
      fs.renameSync(temporary, filePath);
      return `saved to ${filePath} (${doc.countElements()} elements)`;
    } catch {
      return `error: cannot write file: ${filePath}`;
    } finally {
      try {
        fs.unlinkSync(temporary);
      } catch {
        // A successful rename (or a failed open) leaves no temporary file.
      }
    }
  }
}
