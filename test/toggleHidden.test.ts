import { MockStorageManager } from './utils/mock_storage.ts';
import { MockCanvasContext } from './utils/mock_canvas.ts';
import { NoteDownRenderer } from '../src/renderer.ts';
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


    const ctx = new MockCanvasContext();
    const renderer = new NoteDownRenderer("test", false, ctx, doc, storage);

    await renderer.clickHandler({ x: renderer.left_margin / 2, y: 1.5 * renderer.line_spacing });
    expect(renderer.hidden_roots).toEqual(new Set([1]));
  });
});
