import { MockStorageManager } from './utils/mock_storage.ts';
import { MockCanvasContext } from './utils/mock_canvas.ts';
import { NoteDownRenderer } from '../src/renderer.ts';
import { documentCreator } from './utils/documentCreator.ts';
import { RenderedLineNumber } from '../src/types.ts';

describe("Moving lines", () => {
  it("should move roots and track which lines are hidden", async () => {
    const storage = new MockStorageManager();
    storage.setActiveNotebook("test");

    const spec = `
----
----
  ----
`;
    const doc = await documentCreator(storage, spec);


    const ctx = new MockCanvasContext();
    const renderer = new NoteDownRenderer(ctx, doc, storage);
    await renderer.toggleLineHidden(1 as RenderedLineNumber);

    expect(renderer.hidden_roots).toEqual(new Set([1]));
    await renderer.move(1 as RenderedLineNumber, 0 as RenderedLineNumber);
    expect(renderer.hidden_roots).toEqual(new Set([0]));
    await renderer.move(0 as RenderedLineNumber, 2 as RenderedLineNumber);
    expect(renderer.hidden_roots).toEqual(new Set([1]));
  });
});
