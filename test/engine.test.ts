import { MockStorageManager } from './utils/mock_storage.ts';
import { documentCreator } from './utils/documentCreator.ts';
import { DeleteLineEvent, NoteDownEngine } from '../src/engine.ts';
import { RealLineNumber } from '../src/types.ts';

describe("NoteDownEngine", () => {
  it("should delete a line", async () => {
    const storage = new MockStorageManager();
    storage.setActiveNotebook("test");
    const spec = `
a
 b
  c
`;
    const doc = await documentCreator(storage, spec);
    let engine = new NoteDownEngine(doc, storage);
    let evt = new DeleteLineEvent(0 as RealLineNumber, 1);
    expect(doc.linesTofirstContent.get(0 as RealLineNumber)).toEqual(0);
    evt.execute(engine);
    expect(doc.linesTofirstContent.get(0 as RealLineNumber)).toEqual(doc.indentWidth);
  });
});
