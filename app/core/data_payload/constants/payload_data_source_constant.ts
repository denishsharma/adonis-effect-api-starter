import { Data } from 'effect'

export type PayloadDataSource<T = unknown> = Data.TaggedEnum<{
  /**
   * The data is explicitly typed and known.
   */
  known: { data: T };

  /**
   * The data type is not specified and can be anything.
   */
  unknown: { data: unknown };
}>

export interface PayloadDataSourceDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: PayloadDataSource<this['A']>;
}

/**
 * Represents the source of a payload's data.
 *
 * - `known`: The data is explicitly typed and known.
 * - `unknown`: The data type is not specified and can be anything.
 *
 * @example
 * ```ts
 * const source = PayloadDataSource.known({ data: "example" })
 * console.log(source.data) // Output: "example"
 * ```
 */
export const PayloadDataSource = Data.taggedEnum<PayloadDataSourceDefinition>()
