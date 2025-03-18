import type { ExceptionCode } from '#constants/exception_constant'
import type { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import type { Exception } from '@adonisjs/core/exceptions'
import type { Brand } from 'effect'
import type { StatusCodes as HttpStatusCode } from 'http-status-codes'
import type { Draft } from 'mutative'
import type { Class } from 'type-fest'
import { ErrorKind } from '#core/error_and_exception/constants/error_kind_constant'
import { SchemaUtility } from '#core/schema/utils/schema_utility'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Data, Effect, Match, Option, Schema } from 'effect'
import { create } from 'mutative'

/**
 * Unique symbol to mark the error as an exception.
 *
 * This is used to identify the error as an exception
 * and is used for filtering out exceptions from other
 * errors.
 */
export const EXCEPTION_MARKER: unique symbol = Symbol('@error/exception')

/**
 * Default options to be used when creating
 * a new exception instance.
 */
interface DefaultExceptionOptions {
  /**
   * The HTTP status code to be used when
   * sending the response.
   */
  status: HttpStatusCode

  /**
   * Unique application-wide exception code
   * to identify the exception.
   */
  code: ExceptionCode

  /**
   * A human-readable message that describes
   * the exception in detail and can be used
   * for debugging purposes.
   */
  message: string
}

/**
 * Options that can be passed to exception
 * constructor.
 *
 * This can be used to customize the specific
 * behavior of the exception instance.
 */
export interface TaggedExceptionOptions {
  /**
   * The HTTP status code to be used when
   * sending the response.
   */
  status?: HttpStatusCode

  /**
   * Unique application-wide exception code
   * to identify the exception.
   */
  code?: ExceptionCode

  /**
   * The original error that caused this exception.
   *
   * This can be used to provide more context about
   * the exception.
   */
  cause?: Error | TaggedInternalError<any, any> | Exception
}
/**
 * Constructor arguments for the exception instance.
 *
 * If the first argument is an object, then it is the data
 * context that is attached to the exception and rest of the
 * arguments are the message and options.
 *
 * If the first argument is a string, then it is the message
 * and rest of the arguments are the options.
 */
export type TaggedExceptionConstructor<F extends Schema.Struct.Fields | undefined = undefined> = F extends undefined
  ? [message?: string, options?: TaggedExceptionOptions]
  : [data: Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, message?: string, options?: TaggedExceptionOptions]

/**
 * Internal function to create a base exception class
 * that can be extended to create custom exceptions.
 *
 * @param tag Unique tag for this exception.
 * @param schema The schema that additional data context must adhere to.
 */
function baseException<
  T extends string,
  F extends Schema.Struct.Fields | undefined = undefined,
>(
  tag: T,
  schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>,
) {
  class Base extends Data.Error {
    static readonly [EXCEPTION_MARKER] = EXCEPTION_MARKER

    /**
     * The HTTP status code to be used when
     * sending the response.
     */
    readonly status: HttpStatusCode

    /**
     * Unique application-wide exception code
     * to identify the exception.
     */
    readonly code: ExceptionCode

    /**
     * A human-readable message that describes
     * the exception in detail and can be used
     * for debugging purposes.
     */
    readonly message: string

    /**
     * The original error that caused this exception.
     *
     * This can be used to provide more context about
     * the exception.
     */
    readonly cause?: Error | TaggedInternalError<any, any> | Exception

    /**
     * The schema that the data must adhere to.
     * If the data does not adhere to the schema,
     * the error will be thrown.
     *
     * It is used to validate the additional data
     * context that can be attached to the exception.
     */
    readonly schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>

    /**
     * Additional data context that can be attached
     * to the exception.
     */
    private _data: Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>> | undefined

    /**
     * Unique tag for this exception.
     * This is used to identify the error type
     * and is used for debugging purposes.
     *
     * This is a unique string that is used to
     * identify the error type and is used for
     * type checking and filtering.
     */
    readonly _tag: T = tag

    /**
     * Represents the category of error.
     */
    readonly _kind: ErrorKind.EXCEPTION = ErrorKind.EXCEPTION

    constructor(defaults: DefaultExceptionOptions, ...args: TaggedExceptionConstructor<F>) {
      super()

      /**
       * Set the schema for the exception instance.
       *
       * This is used to validate the additional
       * data context that can be attached to the
       * exception.
       */
      this.schema = schema

      /**
       * Parse the arguments to determine the
       * message, data, and options.
       */
      const [
        messageOrData,
        messageorOptions,
        options,
      ] = args

      /**
       * If the first argument is an object, then
       * it is the data context that is attached to
       * the exception.
       */
      if (is.object(messageOrData)) {
        this._data = messageOrData as Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>
      } else {
        this._data = undefined
      }

      /**
       * Default options for the exception.
       * constructor argument if not provided.
       */
      const defaultOptions = {
        status: defaults.status,
        code: defaults.code,
        cause: undefined,
      }

      /**
       * Resolve the arguments to determine the
       * message and options for the exception based
       * on the first argument type.
       */
      const resolvedArguments = Match.value(!is.nullOrUndefined(this._data)).pipe(
        Match.withReturnType<{ message: string, options: TaggedExceptionOptions }>(),
        Match.when(true, () => ({
          message: (messageorOptions ?? defaults.message) as string,
          options: defu(options, defaultOptions),
        })),
        Match.orElse(() => ({
          message: (messageOrData ?? defaults.message) as string,
          options: defu((messageorOptions ?? {}) as TaggedExceptionOptions, defaultOptions),
        })),
      )

      /**
       * Set the status, exception code, message, and cause
       * based on the resolved arguments.
       */
      this.status = resolvedArguments.options.status
      this.code = resolvedArguments.options.code
      this.message = resolvedArguments.message
      this.cause = resolvedArguments.options.cause

      /**
       * Capture the stack trace for the exception instance.
       */
      Error.captureStackTrace(this, Object.getPrototypeOf(this).constructor)
    }

    get [Symbol.toStringTag]() {
      return this._tag
    }

    /**
     * When the exception is converted to a string,
     * it should return the exception tag, code, and
     * message.
     */
    toString(): string {
      return `<${this._tag}> ${this.status} [${this.code}]: ${this.message}`
    }

    /**
     * When the exception is converted to JSON,
     * it should return the exception tag, code,
     * message, cause, and data.
     */
    toJSON() {
      return {
        _tag: this._tag,
        _kind: this._kind,
        status: this.status,
        code: this.code,
        message: this.message,
        cause: is.error(this.cause)
          ? {
              name: this.cause.name,
              message: this.cause.message,
              stack: this.cause.stack,
            }
          : this.cause,
        data: (
          (is.nullOrUndefined(this.schema) || is.nullOrUndefined(this._data))
            ? undefined
            : Effect.gen(this, function* () {
                const data = yield* this.data()
                if (Option.isNone(data) || is.nullOrUndefined(this.schema)) {
                  return undefined
                }

                const schemaToEncode = this.schema
                return yield* Effect.suspend(() => Schema.encode(schemaToEncode)(data.value).pipe(
                  SchemaUtility.toSchemaParseError('Unexpected error while encoding exception data context.', data.value),
                ))
              }).pipe(Effect.runSync)
        ) as F extends undefined ? undefined : Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>,
        stack: this.stack,
      }
    }

    /**
     * Get the decoded data context that is
     * attached to the exception.
     *
     * It will return validated and transformed
     * data context based on the schema.
     */
    data() {
      return Effect.gen(this, function* () {
        if (is.nullOrUndefined(this.schema) || is.nullOrUndefined(this._data)) {
          return Option.none()
        }

        const decoded = yield* Schema.decode(this.schema, { errors: 'all' })(this._data).pipe(
          SchemaUtility.toSchemaParseError('Unexpected error while decoding exception data context.', this._data),
        )
        return Option.some(decoded)
      })
    }

    /**
     * Update the data context that is attached
     * to the exception.
     *
     * It will update the data context based on
     * the updater function provided.
     *
     * @param updater The updater function that will update the data context.
     */
    update(updater: F extends undefined ? never : (draft: Draft<Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>>) => void) {
      if (is.nullOrUndefined(this.schema) || is.nullOrUndefined(this._data) || !is.function(updater)) {
        return
      }

      this._data = create(this._data, updater)
    }
  }
  ;(Base.prototype as any).name = tag

  return Base
}

/**
 * Instance type of the base exception class.
 *
 * This is used to infer the instance type of the exception class
 * that is created using the tagged exception class.
 */
type BaseExceptionInstanceType<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = InstanceType<ReturnType<typeof baseException<T, F>>>

/**
 * Create a tagged exception class that can be extended
 * to create custom exceptions.
 *
 * Tag is extended with `@error/exception/` prefix to ensure
 * that the tag is unique and can be used for type checking
 * and filtering.
 *
 * @param tag Unique tag for this exception class.
 * @returns A new class extending the base exception with the given tag.
 */
export function TaggedException<T extends string>(tag: T) {
  type Tag = `@error/exception/${T}`
  const resolvedTag: Tag = `@error/exception/${tag}` as Tag

  return <F extends Schema.Struct.Fields | undefined = undefined>(
    defaults: DefaultExceptionOptions & {
      schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>
    },
  ) => {
    class InternalError extends baseException<Tag, F>(resolvedTag, defaults.schema) {
      constructor(...args: TaggedExceptionConstructor<F>) {
        const { schema, ...rest } = defaults
        super(rest, ...args)
      }
    }
    ;(InternalError.prototype as any).name = resolvedTag
    ;(InternalError as any).__tag__ = resolvedTag

    return InternalError as unknown as new (...args: TaggedExceptionConstructor<F>) => Brand.Branded<InstanceType<Class<InternalError>>, ErrorKind.EXCEPTION>
  }
}

/**
 * Type guard to check if the error is an instance
 * of the tagged exception class.
 */
export type TaggedException<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = Brand.Branded<BaseExceptionInstanceType<T, F>, ErrorKind.EXCEPTION>
