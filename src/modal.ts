// TODO(aneesh) replace this with HTMLDialogElement instead since that's widely
// available now.

/**
 * Generic modal window class
 */
export class Modal {
  container: HTMLElement;
  dialog: HTMLElement;
  on_close: (() => void) | null = null;
  on_blur: (() => void) | null = null;

  constructor(title: string) {
    const modal_container = document.createElement("div");
    modal_container.classList.add("modal");
    const modal_dialog = document.createElement("div");
    modal_dialog.classList.add("modal-dialog");
    modal_container.appendChild(modal_dialog);

    const title_el = document.createElement("h1");
    title_el.innerText = title;
    modal_dialog.appendChild(title_el);

    modal_container.onclick = () => {
      if (this.on_blur) {
        this.on_blur();
      }
      this.close_container();
    }
    modal_dialog.onclick = (e) => {
      e.stopPropagation();
    };

    this.container = modal_container;
    this.dialog = modal_dialog;
  }

  /** Adds a canvas to the modal */
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

  /** Appends an element to the modal */
  appendChild(el: HTMLElement) {
    this.dialog.appendChild(el);
  }

  /** Close the modal */
  close_container() {
    this.container.remove();
    if (this.on_close) {
      this.on_close();
    }
  }

  /** Render the modal */
  attach(parent: HTMLElement) {
    parent.appendChild(this.container);
  }
}

/** Display an alert-style pop-up as a modal */
export function modalAlert(msg: string): Modal {
  const modal = new Modal(msg);
  const ok = document.createElement("button");
  ok.classList.add("modalalert-ok");
  ok.innerText = "ok";
  ok.onclick = () => {
    modal.close_container();
  }
  modal.appendChild(ok);
  modal.attach(document.body);
  return modal;
}

/** Display an prompt-style pop-up as a modal and collect a response */
export function modalPrompt(msg: string): Promise<string | null> {
  return new Promise<string | null>((r) => {
    const modal = new Modal(msg);
    modal.on_blur = () => {
      r(null);
    };

    const input = document.createElement("input");
    input.classList.add("modalprompt-input");
    modal.appendChild(input);
    const ok = document.createElement("button");
    ok.classList.add("modalalert-ok");
    ok.innerText = "ok";
    ok.onclick = () => {
      modal.close_container();
      r(input.value);
    };
    modal.appendChild(ok);
    const cancel = document.createElement("button");
    cancel.classList.add("modalalert-cancel");
    cancel.innerText = "cancel";
    cancel.onclick = () => {
      modal.close_container();
      r(null);
    }
    modal.appendChild(cancel);

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ok.click();
      }
    });
    modal.attach(document.body);
  });
}

/** Display an confirmation dialogue as a modal and collect a response */
export function modalConfirm(msg: string): Promise<boolean> {
  return new Promise<boolean>((r) => {
    const modal = new Modal(msg);
    modal.on_blur = () => {
      r(false);
    };

    const ok = document.createElement("button");
    ok.classList.add("modalalert-ok");
    ok.innerText = "ok";
    ok.onclick = () => {
      modal.close_container();
      r(true);
    };
    modal.appendChild(ok);
    const cancel = document.createElement("button");
    cancel.classList.add("modalalert-cancel");
    cancel.innerText = "cancel";
    cancel.onclick = () => {
      modal.close_container();
      r(false);
    }
    modal.appendChild(cancel);
    modal.attach(document.body);
  });
}
