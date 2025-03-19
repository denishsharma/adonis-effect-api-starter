import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes, ValidationOptions } from '@vinejs/vine/types'
import ValidationException from '#exceptions/validation_exception'
import { Effect } from 'effect'

export namespace VineUtility {
  /**
   * Validate the provided data using the VineJS validator.
   *
   * @param validator The VineJS validator to validate the data
   * @param options The options to use while validating the data
   */
  export function validate<S extends SchemaTypes, M extends undefined | Record<string, any>>(
    validator: VineValidator<S, M>,
    ...[options]: [undefined] extends M
      ? [options?: ValidationOptions<M> | undefined]
      : [options: ValidationOptions<M>]
  ) {
    /**
     * @param data The data to validate
     */
    return (data: unknown) =>
      Effect.tryPromise({
        try: async () => (await validator.validate(data, options as any)) as Infer<S>,
        catch: ValidationException.toValidationExceptionOrUnknownError({
          validation: 'Validation error occurred while validating the provided data.',
          unknown: 'Unknown error occurred while validating the provided data.',
        }),
      })
  }
}
