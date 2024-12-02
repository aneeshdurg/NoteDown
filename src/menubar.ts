// Nested drop-down stype menu defined by a JSON object (see menubar.json for example
// configuration)

/**
 * A single item in a menu that could have a list of child menus displayed on
 * hover
 */
interface MenubarItem {
  name: string,
  children?: MenubarItem[],
}

/**
 * Wrapper around an HTML element representing a menu label
 */
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

/**
 * A clickable entry in a menu that could have child items that are displayed on hover
 */
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

  /**
   * Render this object
   */
  attach(parent: HTMLElement) {
    parent.appendChild(this.el);
  }

  /**
   * Set display text
   */
  setLabel(text: string) {
    this.label.set(text);
  }

  /**
   * Create children storage container
   */
  getChild() {
    if (this.child === null) {
      const menuchild = document.createElement("div");
      menuchild.classList.add("menuchild");
      this.child = menuchild;
      this.el.appendChild(this.child);
    }
    return this.child;
  }

  /**
   * Add callback for selection of this item
   */
  setOnClick(fn: () => void) {
    this.el.onclick = fn;
  };
}

/**
 * Create a menu bar. All ids of child elements will be prefixed by {name}.
 *
 * Child elements can be selected by id with {name}.{path...} where {path...}
 * represents the chain of menu selections needed to get to that entry.
 */
export function createMenubar(name: string, items: MenubarItem[]) {
  function createMenubarHelper(prefix: string, parent: HTMLElement, item: MenubarItem) {
    const menuitem = new MenuItem(prefix, item.name, prefix === "Menubar.");
    menuitem.attach(parent);

    if (item.children) {
      if (prefix !== "Menubar.") {
        menuitem.setLabel(`${item.name} >`);
      }
      const menuchild = menuitem.getChild()
      for (let child of item.children) {
        createMenubarHelper(prefix + item.name + ".", menuchild, child);
      }
    }
  }

  const container = document.getElementById("menubar")!;
  for (let item of items) {
    createMenubarHelper(name + ".", container, item);
  }
}
