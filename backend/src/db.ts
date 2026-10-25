// The only database features the app needs: run a query, get rows back.
// Both the `pg` driver and PGlite (used in tests) fit this shape.
export interface Db {
  query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close?(): Promise<void>;
}
