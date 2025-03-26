import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { Schema } from 'effect'

/**
 * Transforms a string to snake case.
 *
 * This schema takes a string input and converts it to snake case format,
 * ensuring that all characters are in uppercase and separated by underscores.
 * The transformation is not reversible, meaning that decoding and encoding
 * will always return the same value.
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
 * Transforms a string to a trimmed string and then ensures it is not empty.
 *
 * This schema first trims the input string (removes leading and trailing spaces)
 * and then ensures that the resulting string is not empty. This ensures that
 * any string input will be non-empty after trimming.
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
 * A slug is a string that contains only lowercase letters and numbers,
 * separated by hyphens. This schema ensures the string adheres to the pattern
 * of a slug, where characters are lowercase, alphanumeric, and separated
 * by hyphens.
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
 * This transformation ensures that a string is first trimmed and checked
 * for non-emptiness before converting it into a valid slug. The slug will
 * consist of lowercase letters, numbers, and hyphens, making it suitable
 * for URLs and other contexts where a slug is needed.
 *
 * This transformation is not reversible. The decode and encode methods
 * will always return the same value once the transformation is applied.
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
