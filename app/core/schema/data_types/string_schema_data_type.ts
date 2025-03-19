import is from '@adonisjs/core/helpers/is'
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
  ).pipe(Schema.annotations({
    identifier: 'SnakeCase',
    description: 'Transforms a string to snake case.',
  }))

  /**
   * Transforms a string to trimmed string and
   * then ensures it is not empty.
   *
   * This is useful for ensuring that a string is not empty
   * after trimming it.
   *
   * @category Schema Composition
   */
  export const NonEmptyTrimmedString = Schema.compose(Schema.Trim, Schema.NonEmptyString).pipe(Schema.annotations({
    identifier: 'NonEmptyTrimmedString',
    description: 'Transforms a string to trimmed string and then ensures it is not empty.',
  }))

  /**
   * Schema that validates a valid slug representation.
   *
   * A slug is a string that contains only lowercase letters
   * and numbers, separated by hyphens.
   *
   * @category Schema Data Type
   */
  export const SlugFromSelf = Schema.declare(
    (input): input is string => is.string(input) && input === stringHelpers.slug(input),
    {
      identifier: 'SlugFromSelf',
      description: 'Validates that a string is a slug representation of itself.',
      jsonSchema: {
        type: 'string',
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
      },
    },
  )

  /**
   * Transforms a trimmed non-empty string to a slug representation.
   *
   * It is not reversible once transformed,
   * decode and encode will always return the same value.
   *
   * @category Schema Transformation
   */
  export const SlugFromString = Schema.transform(
    Schema.NonEmptyTrimmedString,
    SlugFromSelf,
    {
      strict: true,
      decode: value => stringHelpers.slug(value),
      encode: value => stringHelpers.slug(value),
    },
  ).pipe(Schema.annotations({
    identifier: 'SlugFromString',
    description: 'Transforms a string to a slug representation.',
  }))
}
