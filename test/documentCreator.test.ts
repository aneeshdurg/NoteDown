import { MockStorageManager } from './utils/mock_storage.ts';
import { RealLineNumber } from '../src/types.ts';
import { documentCreator } from './utils/documentCreator.ts';

describe("Hiding lines", () => {
  it("should hide lines when the margin is clicked on", async () => {
    const storage = new MockStorageManager();
    storage.setActiveNotebook("test");

    const spec = `
----
----
  ----
`;
    const doc = await documentCreator(storage, spec);

    expect(doc.childLines(0 as RealLineNumber)).toEqual([]);
    expect(doc.childLines(1 as RealLineNumber)).toEqual([2, 3]);
    expect(doc.childLines(2 as RealLineNumber)).toEqual([3]);
    expect(doc.childLines(3 as RealLineNumber)).toEqual([]);
  });
});
