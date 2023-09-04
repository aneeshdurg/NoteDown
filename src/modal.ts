export class Modal {
  container: HTMLElement;
  dialog: HTMLElement;
  on_close: (() => void) | null = null;

  constructor(title: string) {
    const modal_container = document.createElement("div");
    modal_container.classList.add("modal");
    const modal_dialog = document.createElement("div");
    modal_dialog.classList.add("modal-dialog");
    modal_container.appendChild(modal_dialog);

    const title_el = document.createElement("h1");
    title_el.innerText = title;
    modal_dialog.appendChild(title_el);

    modal_container.onclick = this.close_container.bind(this);
    modal_dialog.onclick = (e) => {
      e.stopPropagation();
    };

    this.container = modal_container;
    this.dialog = modal_dialog;
  }

  add_canvas(): CanvasRenderingContext2D {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1000;
    canvas.style.height = "85%";
    canvas.style.width = "100%";
    const ctx = canvas.getContext("2d")!;

    this.dialog.appendChild(canvas);
    return ctx;
  }

  appendChild(el: HTMLElement) {
    this.dialog.appendChild(el);
  }

  close_container() {
    this.container.remove();
    if (this.on_close) {
      this.on_close();
    }
  }

  attach(parent: HTMLElement) {
    parent.appendChild(this.container);
  }
}

export function modalAlert(msg: string) {
  const modal = new Modal(msg);
  const ok = document.createElement("button");
  ok.classList.add("modalalert-ok");
  ok.innerText = "ok";
  ok.onclick = () => {
    modal.close_container();
  }
  modal.appendChild(ok);
  modal.attach(document.body);
}
