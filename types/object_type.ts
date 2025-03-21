/**
 * Merges two object types if they have no overlapping keys.
 * Returns `never` if there are conflicts.
 *
 * It only merges the first level of keys and does not
 * merge nested keys.
 *
 * @template T First object type.
 * @template U Second object type.
 *
 * @example
 * ```ts
 * type A = { foo: string }
 * type B = { bar: number }
 * type Merged = MergeWithoutConflict<A, B> // ✅ { foo: string, bar: number }
 *
 * type C = { foo: boolean }
 * type Conflict = MergeWithoutConflict<A, C> // ❌ never (key conflict)
 * ```
 */
export type MergeWithoutConflict<T extends object, U extends object> = keyof T & keyof U extends never ? T & U : never
