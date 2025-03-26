import type { ColumnOptions } from '@adonisjs/lucid/types/model'
import UnknownError from '#core/error/errors/unknown_error'
import is from '@adonisjs/core/helpers/is'
import { column } from '@adonisjs/lucid/orm'
import { defu } from 'defu'
import * as lodash from 'lodash-es'

export type BooleanColumnOptions<N extends boolean = false> = Partial<Omit<ColumnOptions, 'consume' | 'prepare'>> & {
  /**
   * Options for the boolean column
   */
  boolean: {
    /**
     * Whether the column is nullable or not
     *
     * @defaultValue `false`
     */
    nullable?: N;
  } & (
    N extends true
      ? {
          /**
           * The default value for the column when column
           * is nullable
           *
           * @defaultValue `null`
           */
          defaultTo?: boolean | null;
        }
      : {
        /**
         * The default value for the column when column
         * is not nullable (required)
         */
          defaultTo: boolean;
        }
    );
}

/**
 * Define a boolean column with boolean conversion.
 *
 * This is suitable for columns that store boolean values
 * as integers (0 or 1) in the database.
 *
 * @param options The column options
 *
 * @category Lucid Column Decorator
 */
export function booleanColumn<N extends boolean = false>(
  ...[options]: N extends true ? [BooleanColumnOptions<N>?] : [BooleanColumnOptions<N>]
) {
  const [nullable, defaultTo] = [options?.boolean.nullable ?? false, options?.boolean.defaultTo ?? null]

  /**
   * Ensure that a default value is provided for non-nullable columns.
   */
  if (!nullable && is.nullOrUndefined(defaultTo)) {
    throw new UnknownError('Default value for non-nullable boolean column is required.')
  }

  return column(defu(
    {
      consume: (v: number | null) => {
        if (!is.number(v) && !is.nullOrUndefined(v)) {
          throw new UnknownError('Invalid value for boolean column when consuming from database.')
        }

        return nullable
          ? is.nullOrUndefined(v)
            ? defaultTo
            : v === 1
          : is.nullOrUndefined(v)
            ? defaultTo
            : v === 1
      },
      prepare: (v: boolean | null) => {
        if (!is.boolean(v) && !is.nullOrUndefined(v)) {
          throw new UnknownError('Invalid value for boolean column when preparing to save.')
        }

        return nullable
          ? is.nullOrUndefined(v)
            ? is.nullOrUndefined(defaultTo)
              ? null
              : defaultTo
                ? 1
                : 0
            : v
              ? 1
              : 0
          : is.nullOrUndefined(v)
            ? defaultTo
              ? 1
              : 0
            : v
              ? 1
              : 0
      },
    } as Partial<ColumnOptions>,
    lodash.omit(options, 'boolean', 'consume', 'prepare'),
  ))
}
