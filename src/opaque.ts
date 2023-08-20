declare const tag: unique symbol
class OpaqueTag<S extends symbol> {
  [tag]: S | null = null;
}

export type Opaque<T, S extends symbol> = T & OpaqueTag<S>;
