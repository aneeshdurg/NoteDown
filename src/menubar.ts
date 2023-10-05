interface MenubarItem {
  name: string,
  children?: MenubarItem[],
}

class MenuLabel {
  el: HTMLDivElement;
  constructor(name: string) {
    this.el = document.createElement("div");
    this.el.classList.add("menulabel");
    this.el.innerText = name;
  }

  attach(parent: HTMLElement) {
    parent.appendChild(this.el);
  }

  set(text: string) {
    this.el.innerText = text;
  }
};

export class MenuItem {
  el: HTMLDivElement;
  label: MenuLabel;
  child: HTMLDivElement | null = null;

  constructor(prefix: string, name: string, add_padding: boolean = false) {
    this.el = document.createElement("div");
    this.el.classList.add("menuitem");
    this.el.id = `${prefix}${name}`;
    if (add_padding) {
      this.el.style.paddingRight = "0.25em";
    }
    this.label = new MenuLabel(name);
    this.label.attach(this.el);
  }

  attach(parent: HTMLElement) {
    parent.appendChild(this.el);
  }

  setLabel(text: string) {
    this.label.set(text);
  }

  getChild() {
    if (this.child === null) {
      const menuchild = document.createElement("div");
      menuchild.classList.add("menuchild");
      this.child = menuchild;
      this.el.appendChild(this.child);
    }
    return this.child;
  }

  setOnClick(fn: () => void) {
    this.el.onclick = fn;
  };
}

export function setupMenubar(name: string, items: MenubarItem[]) {
  function setupMenubarHelper(prefix: string, parent: HTMLElement, item: MenubarItem) {
    const menuitem = new MenuItem(prefix, item.name, prefix === "Menubar.");
    menuitem.attach(parent);

    if (item.children) {
      if (prefix !== "Menubar.") {
        menuitem.setLabel(`${item.name} >`);
      }
      const menuchild = menuitem.getChild()
      for (let child of item.children) {
        setupMenubarHelper(prefix + item.name + ".", menuchild, child);
      }
    }
  }

  const container = document.getElementById("menubar")!;
  for (let item of items) {
    setupMenubarHelper(name + ".", container, item);
  }
}
