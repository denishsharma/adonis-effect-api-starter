import type { MergeWithoutConflict } from '#types/object_type'

/**
 * Merges an array of utility objects into a single type while ensuring no key conflicts.
 *
 * @template T Array of utility objects to merge.
 *
 * @example
 * ```ts
 * import * as UtilA from "./utilA"
 * import * as UtilB from "./utilB"
 *
 * type MergedUtilities = ModuleUtility<[typeof UtilA, typeof UtilB]>
 * // ✅ Merges UtilA and UtilB into a single type.
 *
 * type Conflict = ModuleUtility<[UtilA, { someKey: string }]>
 * // ❌ never (key conflict detected).
 * ```
 */
export type ModuleUtility<T extends object[]> = T extends [infer A extends object, ...infer B extends object[]]
  ? B extends []
    ? A
    : MergeWithoutConflict<A, ModuleUtility<B>>
  : object
