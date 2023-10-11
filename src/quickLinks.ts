import { NoteDownDocument } from './document.ts';
import { Modal } from './modal.ts';
import { NoteDownRenderer } from './renderer.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import { RealLineNumber } from './types.ts';

export async function quickLinks(doc: NoteDownDocument, storage: NoteDownStorageManager, renderer: NoteDownRenderer) {
  const modal = new Modal("Quick Links");

  const quick_links = doc.rootOnlyDoc();
  const ctx = modal.add_canvas();
  const toc_ui = new NoteDownRenderer(ctx, quick_links.doc, storage, true);
  toc_ui.clearAndRedraw();
  toc_ui.installEventHandlers();
  toc_ui.on_line_tap = (line_no: RealLineNumber) => {
    renderer.infer_line_mapping(quick_links.mapping.get(line_no)!);
    renderer.y_offset = 0;
    renderer.clearAndRedraw();
    modal.close_container();
  };

  modal.attach(document.body);
}
