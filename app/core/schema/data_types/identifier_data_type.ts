import is from '@adonisjs/core/helpers/is'
import { Schema } from 'effect'
import { isValid as isValidUlid } from 'ulidx'

export namespace IdentifierSchemaDataType {
  /**
   * Schema that validates string as a valid ULID representation.
   *
   * @category Schema Data Type
   */
  export const UlidFromSelf = Schema.declare(
    (input): input is string => is.string(input) && isValidUlid(input),
    {
      identifier: 'UlidFromSelf',
      description: 'Validates that a string is a valid ULID representation of itself.',
      jsonSchema: {
        type: 'string',
        pattern: '^[0-9A-Za-z]{26}$',
      },
    },
  )
}
