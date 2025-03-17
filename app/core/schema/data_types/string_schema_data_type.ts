import stringHelpers from '@adonisjs/core/helpers/string'
import { Schema } from 'effect'

export namespace StringSchemaDataType {
  /**
   * Transforms a string to snake case.
   *
   * It is not reversible once transformed,
   * decode and encode will always return the same value.
   *
   * @category Schema Transformation
   */
  export const SnakeCase = Schema.transform(
    Schema.String,
    Schema.String,
    {
      strict: true,
      decode: value => stringHelpers.snakeCase(value).toUpperCase(),
      encode: value => stringHelpers.snakeCase(value).toUpperCase(),
    },
  )
}
