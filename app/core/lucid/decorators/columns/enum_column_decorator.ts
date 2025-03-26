import type { ColumnOptions } from '@adonisjs/lucid/types/model'
import UnknownError from '#core/error/errors/unknown_error'
import is from '@adonisjs/core/helpers/is'
import { column } from '@adonisjs/lucid/orm'
import { defu } from 'defu'
import * as lodash from 'lodash-es'

export type EnumColumnOptions<T extends { [x: string]: string | number }, N extends boolean = false> = Partial<Omit<ColumnOptions, 'consume' | 'prepare'>> & {
  enum: {
    /**
     * The enum values
     */
    values: T;
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
          defaultTo?: T[keyof T] | null;
        }
      : {
        /**
         * The default value for the column when column
         * is not nullable (required)
         */
          defaultTo: T[keyof T];
        }
    );
}

/**
 * Define an enum/enum-like column with enum conversion.
 *
 * This is suitable for columns that store enum values
 * as strings or integers or native enum types in the database.
 *
 * @param options The column options
 *
 * @category Lucid Column Decorator
 */
export function enumColumn<T extends { [x: string]: string | number }, N extends boolean = false>(
  ...[options]: N extends true ? [EnumColumnOptions<T, N>?] : [EnumColumnOptions<T, N>]
) {
  const [
    values,
    nullable,
    defaultTo,
  ] = [
    options?.enum.values ?? {},
    options?.enum.nullable ?? false,
    options?.enum.defaultTo ?? null,
  ]

  /**
   * Ensure that the provided enum values are not empty.
   */
  if (Object.keys(values).length === 0) {
    throw new UnknownError('Provided enum values for enum column is empty.')
  }

  /**
   * Ensure that the default value is set when the column is not nullable.
   */
  if (!nullable && is.nullOrUndefined(defaultTo)) {
    throw new UnknownError('Default value for enum column is required when column is not nullable.')
  }

  return column(defu(
    {
      consume: (v: string | number | null) => {
        if (!is.string(v) && !is.number(v) && !is.nullOrUndefined(v)) {
          throw new UnknownError('Invalid value for enum column when consuming from database.')
        }

        return nullable
          ? is.nullOrUndefined(v)
            ? defaultTo
            : Object.values(values).includes(v)
              ? v
              : defaultTo
          : is.nullOrUndefined(v)
            ? defaultTo
            : Object.values(values).includes(v)
              ? v
              : defaultTo
      },
      prepare: (v: T[keyof T] | null) => {
        if (!Object.values(values).includes(v) && !is.nullOrUndefined(v)) {
          throw new UnknownError('Invalid value for enum column when preparing for database.')
        }

        return nullable
          ? is.nullOrUndefined(v)
            ? is.nullOrUndefined(defaultTo)
              ? null
              : defaultTo
            : v
          : is.nullOrUndefined(v)
            ? defaultTo
            : v
      },
    } as Partial<ColumnOptions>,
    lodash.omit(options, 'enum', 'consume', 'prepare'),
  ))
}
