import { MockStorageManager } from './utils/mock_storage.ts';
import { documentCreator } from './utils/documentCreator.ts';
import { NoteDownDocument } from '../src/document.ts';
import { Stroke } from '../src/stroke.ts';
import { RealLineNumber } from '../src/types.ts';

describe("NoteDownDocument", () => {
  it("should correctly set the firstContent", () => {
    const storage = new MockStorageManager();
    storage.setActiveNotebook("test");

    const doc = new NoteDownDocument();

    const stroke = new Stroke(0);

    // A straight horizontal line of width 5
    stroke.add(10, 10);
    stroke.add(15, 10);

    doc.add_stroke(0 as RealLineNumber, stroke, storage);

    expect(doc.linesTofirstContent.get(0 as RealLineNumber)).toEqual(10);
  });

  it("should correctly set line children", () => {
    const storage = new MockStorageManager();
    storage.setActiveNotebook("test");

    const doc = new NoteDownDocument();

    {
      const stroke = new Stroke(0);
      // A straight horizontal line of width 5
      stroke.add(10, 10);
      stroke.add(15, 10);
      doc.add_stroke(0 as RealLineNumber, stroke, storage);
    }
    {
      const stroke = new Stroke(0);
      // A straight horizontal line of width 5
      stroke.add(110, 10);
      stroke.add(115, 10);
      doc.add_stroke(1 as RealLineNumber, stroke, storage);
    }

    // Line 1 + the empty line 2
    expect(doc.childLines(0 as RealLineNumber)).toEqual([1, 2] as RealLineNumber[]);
  });

  it("should capture past single empty lines, but not past two", async () => {
    const storage = new MockStorageManager();
    storage.setActiveNotebook("test");
    const spec = `
x
  a

    b
  c


y
`;
    const doc = await documentCreator(storage, spec);

    // Children of "x": ["a", "", "b", "c", ""]
    expect(doc.childLines(0 as RealLineNumber)).toEqual([1, 2, 3, 4, 5] as RealLineNumber[]);
    expect(doc.childLines(1 as RealLineNumber)).toEqual([2, 3] as RealLineNumber[]);
    expect(doc.childLines(5 as RealLineNumber)).toEqual([] as RealLineNumber[]);
    expect(doc.childLines(6 as RealLineNumber)).toEqual([] as RealLineNumber[]);
  });
});
