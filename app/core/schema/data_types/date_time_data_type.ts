import { SchemaUtility } from '#core/schema/utils/schema_utility'
import { Schema } from 'effect'
import { DateTime as LuxonDateTime } from 'luxon'

export namespace DateTimeSchemaDataType {
  /**
   * Schema that validates a valid Luxon DateTime instance.
   *
   * @category Schema Data Type
   */
  export const LuxonDateTimeFromSelf = Schema.declare(
    (input): input is LuxonDateTime => LuxonDateTime.isDateTime(input),
    {
      identifier: 'LuxonDateTimeFromSelf',
      description: 'Validates that the input is a valid Luxon DateTime instance from luxon.DateTime.',
      message: SchemaUtility.makeErrorMessageFromParseIssue('Input is not a valid Luxon DateTime instance.', 'luxon.DateTime'),
      jsonSchema: {
        type: 'string',
        format: 'date-time',
      },
    },
  )

  /**
   * Transforms a valid JS Date instance to a Luxon DateTime instance.
   *
   * @category Schema Transformation
   */
  export const LuxonDateTimeFromDate = Schema.transform(
    Schema.ValidDateFromSelf,
    LuxonDateTimeFromSelf,
    {
      strict: true,
      decode: value => LuxonDateTime.fromJSDate(value),
      encode: value => value.toJSDate(),
    },
  ).pipe(Schema.annotations({
    identifier: 'LuxonDateTimeFromDate',
    description: 'Transforms a valid JS Date instance to a Luxon DateTime instance.',
  }))

  /**
   * Transforms a valid string to a Luxon DateTime instance.
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
  }))
}
