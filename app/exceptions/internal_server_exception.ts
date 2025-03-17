import type { TaggedExceptionOptions } from '#core/error_and_exception/tagged_exception'
import type { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { InternalErrorCode } from '#constants/internal_error_constant'
import { TaggedException } from '#core/error_and_exception/tagged_exception'
import { ErrorUtility } from '#core/error_and_exception/utils/error_utility'
import { SchemaUtility } from '#core/schema/utils/schema_utility'
import { Exception } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import app from '@adonisjs/core/services/app'
import { Effect, Match, Option, Ref, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when an unrecognized error is thrown
 * during the runtime.
 *
 * This exception is used to catch any error that is not recognized
 * as an exception or an internal error and convert it into an
 * internal server error.
 *
 * @category Exception
 */
export default class InternalServerException<T extends string, F extends Schema.Struct.Fields | undefined = undefined> extends TaggedException('internal_server')({
  status: StatusCodes.INTERNAL_SERVER_ERROR,
  code: ExceptionCode.E_INTERNAL_SERVER_ERROR,
  message: ExceptionCodeMetadata[ExceptionCode.E_INTERNAL_SERVER_ERROR].message,
  schema: Schema.Struct({
    error: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  }),
}) {
  /**
   * Whether to display verbose errors with
   * additional information.
   */
  protected debug: boolean = !app.inProduction

  /**
   * Create a new instance of the exception.
   *
   * @param error The error that caused the exception.
   * @param message The message to display.
   * @param options The options to customize the exception.
   */
  constructor(error: Error | TaggedInternalError<T, F> | unknown, message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    super({ error: null }, message, options)

    /**
     * Match the error to determine the type of error
     * and handle it accordingly.
     */
    Match.value(error).pipe(
      Match.when(
        ErrorUtility.isInternalError(),
        err => () => {
          const cause = err.cause ?? err

          /**
           * Update the error code and data
           * from the internal error.
           */
          this.update((draft) => {
            draft.error = err.code
          })

          /**
           * If the internal error has a schema, then
           * decode the data from the error and assign
           * it to the exception.
           */
          Object.assign(this, {
            cause,
            stack: cause.stack,
            data: () => Effect.gen(this, function* () {
              if (is.nullOrUndefined(this.schema) || is.nullOrUndefined(err.schema)) {
                return Option.none()
              }

              const dataRef = yield* Ref.make<unknown>(undefined)
              yield* Effect.gen(function* () {
                return Option.match(yield* err.data(), {
                  onNone: () => undefined,
                  onSome: value => value,
                })
              }).pipe(
                Effect.flatMap(data => Ref.set(dataRef, data)),
                Effect.when(() => this.debug),
              )

              const data = yield* dataRef.get
              const schema = Schema.extend(this.schema, Schema.Struct({
                context: Schema.optionalWith(Schema.UndefinedOr(Schema.Any), { nullable: true, default: () => undefined }),
              }))

              const decoded = yield* Effect.suspend(() => Schema.decode(schema, { errors: 'all' })({ error: err.code, context: data }).pipe(
                SchemaUtility.toSchemaParseError('Unexpected error while decoding data context for internal server exception.', { error: err.code, context: data }),
              ))

              return Option.some(decoded)
            }),
          })
        },
      ),
      Match.when(
        (err: unknown) => err instanceof Exception,
        err => () => {
          const cause = (!is.nullOrUndefined(err.cause) && is.error(err.cause)) ? err.cause : err

          /**
           * Update the error code and data
           * from the exception.
           */
          this.update((draft) => {
            draft.error = err.code
          })

          /**
           * Set the cause, stack, and status
           * from the exception.
           */
          Object.assign(this, {
            cause,
            stack: cause.stack,
            status: err.status,
          })
        },
      ),
      Match.when(
        (err: unknown) => err instanceof Error,
        err => () => {
          /**
           * If the error is an instance of Error, then
           * assign the unknown error code to the exception.
           */
          this.update((draft) => {
            draft.error = InternalErrorCode.I_UNKNOWN_ERROR
          })

          Object.assign(this, {
            cause: err,
            stack: err.stack,
          })
        },
      ),
      Match.orElse(() => () => {
        /**
         * If the error is none of the above, then
         * assign the unknown error code to the exception.
         *
         * This is the default case, and here cause
         * is undefined.
         */
        this.update((draft) => {
          draft.error = InternalErrorCode.I_UNKNOWN_ERROR
        })

        Object.assign(this, {
          cause: undefined,
        })
      }),
    )()
  }
}
