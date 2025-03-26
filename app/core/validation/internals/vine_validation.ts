import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes, ValidationOptions } from '@vinejs/vine/types'
import ValidationException from '#core/validation/exceptions/validation_exception'
import { defu } from 'defu'
import { Effect } from 'effect'

type ValidateWithVineOptions<M extends undefined | Record<string, any> = undefined> = {
  exception?: {
    validation?: string;
    unknown?: string;
  };
} & ([undefined] extends M ? { validator?: ValidationOptions<M> | undefined } : { validator: ValidationOptions<M> })

/**
 * Validates the provided data using the VineJS validator.
 *
 * This method utilizes the VineJS validation library to validate the provided
 * data based on the specified validator and options.
 *
 * @param validator - The VineJS validator to validate the data
 * @param options - The options to use while validating the data
 */
export function validateWithVine<S extends SchemaTypes, M extends undefined | Record<string, any>>(
  validator: VineValidator<S, M>,
  options?: ValidateWithVineOptions<M>,
) {
  /**
   * @param data - The data to validate. If an effect is provided, it will be resolved before validation
   */
  return <E = never, R = never>(data: Effect.Effect<unknown, E, R> | unknown) =>
    Effect.gen(function* () {
      const resolvedOptions = defu(
        options,
        {
          exception: {
            validation: 'Validation error occurred while validating the provided data.',
            unknown: 'Unknown error occurred while validating the provided data.',
          },
          validator: undefined,
        },
      )

      const dataToValidate = yield* Effect.isEffect(data) ? data as Effect.Effect<unknown, E, R> : Effect.sync(() => data)
      return yield* Effect.tryPromise({
        try: async () => {
          return (await validator.validate(dataToValidate, resolvedOptions.validator as any)) as Infer<S>
        },
        catch: ValidationException.toValidationExceptionOrUnknownError({
          validation: resolvedOptions.exception.validation,
          unknown: resolvedOptions.exception.unknown,
        }),
      })
    })
}
