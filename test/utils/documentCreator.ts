import { NoteDownStorageManager } from '../../src/storage_manager.ts';
import { NoteDownDocument } from '../../src/document.ts';
import { NoteDownRenderer } from '../../src/renderer.ts';
import { Stroke } from '../../src/stroke.ts';
import { RealLineNumber } from '../../src/types.ts';


export async function documentCreator(storage: NoteDownStorageManager, spec: string): Promise<NoteDownDocument> {
  const line_height = NoteDownRenderer.prototype.line_spacing;
  const doc = new NoteDownDocument();
  const lines = spec.split("\n");
  if (lines[0] === "") {
    lines.shift();
  }
  let lineNumber = 0;
  for (const line of lines) {
    let x_pos = 0;
    for (const c of line) {
      if (c != ' ') {
        const stroke = new Stroke(0);
        stroke.add(x_pos, line_height / 2);
        stroke.add(x_pos + doc.indentWidth, line_height / 2);
        await doc.add_stroke(lineNumber as RealLineNumber, stroke, storage);
      }
      x_pos += doc.indentWidth;
    }
    lineNumber += 1;
  }

  return doc;
}
