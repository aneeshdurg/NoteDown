import { MockStorageManager } from './utils/mock_storage.ts';
import { MockCanvasContext } from './utils/mock_canvas.ts';
import { NoteDownRenderer } from '../src/renderer.ts';
import { documentCreator } from './utils/documentCreator.ts';
import { RenderedLineNumber } from '../src/types.ts';

describe("Moving lines", () => {
  it("idk", async () => {
    const storage = new MockStorageManager();
    storage.setActiveNotebook("test");

    const spec = `
----
----
  ----
    ----
`;
    const doc = await documentCreator(storage, spec);


    const ctx = new MockCanvasContext();
    const renderer = new NoteDownRenderer("test", false, ctx, doc, storage);
    await renderer.toggleLineHidden(2 as RenderedLineNumber);
    await renderer.toggleLineHidden(1 as RenderedLineNumber);

    // Current rendered view is:
    //  line0
    // +line1
    //  line5
    //  ...

    // Scroll down by two lines - everything should be hidden now
    for (let i = 0; i < (2 / (renderer.scroll_delta)); i++) {
      await renderer.scrollDown()
    }
    // Current rendered view is:
    //  line5
    //  line6
    //  ...
    expect(renderer.lineToRealLine.get(0 as RenderedLineNumber)).toEqual(5);

    // Scroll down up one line
    for (let i = 0; i < (1 / (renderer.scroll_delta)); i++) {
      await renderer.scrollUp()
    }
    // Current rendered view is:
    // +line1
    //  line5
    //  ...
    expect(renderer.lineToRealLine.get(0 as RenderedLineNumber)).toEqual(1);

  });
});
