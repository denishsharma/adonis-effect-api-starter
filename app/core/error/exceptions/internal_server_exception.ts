import type { TaggedExceptionOptions } from '#core/error/factories/tagged_exception'
import type { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { InternalErrorCode } from '#constants/internal_error_constant'
import { _internals } from '#constants/proto_marker_constant'
import { TaggedException } from '#core/error/factories/tagged_exception'
import { inferCauseFromUnknownError } from '#core/error/internals/error_cause'
import { toSchemaParseError } from '#core/error/internals/error_conversion'
import { isTaggedInternalError } from '#core/error/internals/is_error_type'
import { Exception } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import app from '@adonisjs/core/services/app'
import { defu } from 'defu'
import { Effect, Match, Option, Ref, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as lodash from 'lodash-es'

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
export default class InternalServerException extends TaggedException('internal_server')({
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

  constructor(error: unknown, message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    super({ error: null }, message, options)

    const exception = Match.value(error).pipe(
      Match.when(isTaggedInternalError<string, any>(), this.makeInternalServerExceptionFromInternalError(message, options)),
      Match.when(Match.instanceOf(Exception), this.makeInternalServerExceptionFromException(message, options)),
      Match.when(Match.instanceOf(Error), this.makeInternalServerExceptionFromError(message, options)),
      Match.orElse(() => InternalServerException.make(defu(
        options,
        {
          message,
          data: {
            error: InternalErrorCode.I_UNKNOWN_ERROR,
          },
        },
      ))),
    )

    Object.assign(this, exception)
  }

  /**
   * Create instance of `InternalServerException` from
   * an unknown error by parsing the error.
   *
   * @param message - Human-readable error message to provide more context
   * @param options - Additional options for configuring the `InternalServerException`
   */
  static fromUnknownError(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    return (error: unknown) => new InternalServerException(error, message, options)
  }

  private makeInternalServerExceptionFromInternalError(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    return (error: TaggedInternalError<string, any>) => {
      const cause = lodash.defaultTo(inferCauseFromUnknownError()(error), error)
      const exception = InternalServerException.make(defu(
        options,
        {
          cause,
          message,
          data: {
            error: error.code,
          },
        },
      ))
      Object.assign(exception, {
        stack: cause.stack,
        data: () => Effect.gen(this, function* () {
          if (is.nullOrUndefined(exception[_internals].schema)) {
            return Option.none()
          }

          const dataRef = yield* Ref.make<unknown>(undefined)
          yield* Effect.gen(function* () {
            return Option.match(yield* error.data(), {
              onNone: () => undefined,
              onSome: value => value,
            })
          }).pipe(
            Effect.flatMap(data => Ref.set(dataRef, data)),
            Effect.when(() => this.debug),
          )

          const data = yield* dataRef.get
          const schema = Schema.extend(exception[_internals].schema, Schema.Struct({
            context: Schema.optionalWith(Schema.UndefinedOr(Schema.Any), { nullable: true, default: () => undefined }),
          }))

          const decoded = yield* Effect.suspend(() => Schema.decode(schema, { errors: 'all' })({ error: error.code, context: data }).pipe(
            toSchemaParseError('Unexpected error while decoding data context for internal server exception.', { error: error.code, context: data }),
          ))

          return Option.some(decoded)
        }),
      })
      return exception
    }
  }

  private makeInternalServerExceptionFromException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    return (error: Exception) => {
      const cause = lodash.defaultTo(inferCauseFromUnknownError()(error), error)
      const exception = InternalServerException.make(defu(
        options,
        {
          cause,
          message,
          data: {
            error: error.code,
          },
          status: error.status,
        },
      ))
      Object.assign(exception, {
        stack: cause.stack,
      })
      return exception
    }
  }

  private makeInternalServerExceptionFromError(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    return (error: Error) => {
      const exception = InternalServerException.make(defu(
        options,
        {
          cause: error,
          message,
          data: {
            error: InternalErrorCode.I_UNKNOWN_ERROR,
          },
        },
      ))
      Object.assign(exception, {
        stack: error.stack,
      })
      return exception
    }
  }
}
