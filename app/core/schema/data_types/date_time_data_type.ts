import { makeErrorMessageFromParseIssue } from '#core/schema/internals/schema_error'
import { Schema } from 'effect'
import { DateTime as LuxonDateTime } from 'luxon'

/**
 * Schema that validates a valid Luxon DateTime instance.
 *
 * This schema ensures that the input is an instance of `luxon.DateTime`.
 * It checks if the input is a valid Luxon DateTime and returns a validation error message if not.
 *
 * It also provides a `jsonSchema` property for integration with tools that support JSON schema validation.
 *
 * @category Schema Data Type
 */
export const LuxonDateTimeFromSelf = Schema.declare(
  (input): input is LuxonDateTime => LuxonDateTime.isDateTime(input),
  {
    identifier: 'LuxonDateTimeFromSelf',
    description: 'Validates that the input is a valid Luxon DateTime instance from luxon.DateTime.',
    message: makeErrorMessageFromParseIssue('Input is not a valid Luxon DateTime instance.', 'luxon.DateTime'),
    jsonSchema: {
      type: 'string',
      format: 'date-time',
    },
  },
)

/**
 * Transforms a valid JavaScript `Date` instance into a Luxon `DateTime` instance.
 *
 * This schema ensures that the input is a valid JavaScript `Date` object before
 * transforming it into a Luxon `DateTime` instance using `LuxonDateTime.fromJSDate()`.
 * The transformation includes strict validation and supports both encoding and decoding.
 *
 * The transformation is strict, meaning only valid JavaScript `Date` instances
 * will be processed, and invalid values will be rejected.
 *
 * The output of this transformation is a Luxon `DateTime` instance, which can be
 * converted back to a standard JavaScript `Date` object using `toJSDate()`.
 *
 * @category Schema Transformation
 */
export const LuxonDateTimeFromDate = Schema.transform(
  Schema.DateFromSelf.pipe(
    Schema.validDate(),
    Schema.annotations({
      description: 'Validates that the input is a valid JS Date instance.',
      jsonSchema: {
        type: 'string',
        format: 'date-time',
      },
    }),
  ),
  LuxonDateTimeFromSelf,
  {
    strict: true,
    decode: value => LuxonDateTime.fromJSDate(value),
    encode: value => value.toJSDate(),
  },
).pipe(Schema.annotations({
  identifier: 'LuxonDateTimeFromDate',
  description: 'Transforms a valid JS Date instance to a Luxon DateTime instance.',
  jsonSchema: {
    type: 'string',
    format: 'date-time',
  },
}))

/**
 * Transforms a valid string to a Luxon `DateTime` instance.
 *
 * This schema validates that the input is a valid string representation of a
 * date and time, and transforms it into a Luxon `DateTime` instance. The
 * transformation is strict, meaning only valid date strings will be accepted.
 * The string is parsed into a `DateTime` instance using `LuxonDateTime.fromJSDate()`.
 *
 * @category Schema Transformation
 */

export const LuxonDateTimeFromString = Schema.transform(
  Schema.DateFromString.pipe(Schema.validDate()),
  LuxonDateTimeFromSelf,
  {
    strict: true,
    decode: value => LuxonDateTime.fromJSDate(value),
    encode: value => value.toJSDate(),
  },
).pipe(Schema.annotations({
  identifier: 'LuxonDateTimeFromString',
  description: 'Transforms a valid string to a Luxon DateTime instance.',
  jsonSchema: {
    type: 'string',
    format: 'date-time',
  },
}))
