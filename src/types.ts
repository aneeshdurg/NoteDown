declare const tag: unique symbol
class OpaqueTag<S extends symbol> {
  [tag]: S | null = null;
}

type Opaque<T, S extends symbol> = T & OpaqueTag<S>;

declare const RenderedLineNumberS: unique symbol
export type RenderedLineNumber = Opaque<number, typeof RenderedLineNumberS>

declare const RealLineNumberS: unique symbol
export type RealLineNumber = Opaque<number, typeof RealLineNumberS>
