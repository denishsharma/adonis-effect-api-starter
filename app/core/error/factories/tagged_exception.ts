import type { ExceptionCode } from '#constants/exception_constant'
import type { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import type { Exception } from '@adonisjs/core/exceptions'
import type { Brand } from 'effect'
import type { StatusCodes as HttpStatusCode } from 'http-status-codes'
import type { Draft } from 'mutative'
import type { Class, Spread } from 'type-fest'
import { _internals, _kind } from '#constants/proto_marker_constant'
import { ErrorKind } from '#core/error/constants/error_kind_constant'
import { EXCEPTION_MARKER } from '#core/error/internals/constants/error_marker_constant'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Data, Effect, Match, Option, Schema } from 'effect'
import * as lodash from 'lodash-es'
import { create } from 'mutative'

/**
 * Default options to be used when creating
 * a new exception instance.
 */
interface DefaultExceptionOptions {
  /**
   * The HTTP status code to be used when
   * sending the response.
   */
  status: HttpStatusCode;

  /**
   * Unique application-wide exception code
   * to identify the exception.
   */
  code: ExceptionCode;

  /**
   * A human-readable message that describes
   * the exception in detail and can be used
   * for debugging purposes.
   */
  message: string;
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
  status?: HttpStatusCode;

  /**
   * Unique application-wide exception code
   * to identify the exception.
   */
  code?: ExceptionCode;

  /**
   * The original error that caused this exception.
   *
   * This can be used to provide more context about
   * the exception.
   */
  cause?: Error | TaggedInternalError<any, any> | Exception;
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
 * Represents the internal structure of a tagged exception.
 *
 * - Supports an optional schema that defines the expected data structure.
 * - Stores encoded data based on the defined schema, ensuring consistency
 *   and validation across different exception types.
 *
 * @template F - The schema fields that define the structure of the exception's data.
 */
interface TaggedExceptionInternals<F extends Schema.Struct.Fields | undefined> {
  /**
   * The schema that the data must adhere to.
   * If the data does not adhere to the schema,
   * the error will be thrown.
   *
   * It is used to validate the additional data
   * context that can be attached to the exception.
   */
  schema?: Schema.Struct<Exclude<F, undefined>> &
    Schema.Schema<
      Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>,
      Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>,
      never
    >;

  /**
   * Encoded data adhering to the defined schema.
   */
  data?: Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>;
}

/**
 * Creates a base exception class that serves as a foundation for defining
 * custom exceptions.
 *
 * - Ensures all exceptions follow a consistent structure.
 * - Allows extending with additional metadata and validation using the provided schema.
 * - Supports standardized error classification for improved debugging and handling.
 *
 * @param tag - A unique identifier for the exception.
 * @param schema - A validation schema that defines the structure of additional
 *                 context data associated with the exception.
 */
function baseException<
  T extends string,
  F extends Schema.Struct.Fields | undefined = undefined,
>(
  tag: T,
  schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>,
) {
  class Base extends Data.Error {
    static get [EXCEPTION_MARKER]() { return EXCEPTION_MARKER }

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
     * Internal configuration for the exception.
     */
    readonly [_internals]: TaggedExceptionInternals<F> = { schema }

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
    readonly [_kind]: ErrorKind.EXCEPTION = ErrorKind.EXCEPTION

    constructor(defaults: DefaultExceptionOptions, ...args: TaggedExceptionConstructor<F>) {
      super()

      /**
       * Parse the arguments to determine the
       * message, data, and options.
       */
      const [
        messageOrData,
        messageOrOptions,
        options,
      ] = args

      /**
       * If the first argument is an object, then
       * it is the data context that is attached to
       * the exception.
       */
      if (is.object(messageOrData)) {
        this[_internals].data = messageOrData as Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>
      } else {
        this[_internals].data = undefined
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
      const resolvedArguments = Match.value(!is.nullOrUndefined(this[_internals].data)).pipe(
        Match.withReturnType<{ message: string; options: TaggedExceptionOptions }>(),
        Match.when(true, () => ({
          message: (messageOrOptions ?? defaults.message) as string,
          options: defu(options, defaultOptions),
        })),
        Match.orElse(() => ({
          message: (messageOrData ?? defaults.message) as string,
          options: defu((messageOrOptions ?? {}) as TaggedExceptionOptions, defaultOptions),
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
        _kind: this[_kind],
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
          (is.nullOrUndefined(this[_internals].schema) || is.nullOrUndefined(this[_internals].data))
            ? undefined
            : Effect.gen(this, function* () {
                const data = yield* this.data()
                if (Option.isNone(data) || is.nullOrUndefined(this[_internals].schema)) {
                  return undefined
                }

                const schemaToEncode = this[_internals].schema
                return yield* Effect.suspend(() => Schema.encode(schemaToEncode)(data.value))
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
        if (is.nullOrUndefined(this[_internals].schema) || is.nullOrUndefined(this[_internals].data)) {
          return Option.none()
        }

        const decoded = yield* Schema.decode(this[_internals].schema, { errors: 'all' })(this[_internals].data)
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
      if (is.nullOrUndefined(this[_internals].schema) || is.nullOrUndefined(this[_internals].data) || !is.function(updater)) {
        return
      }

      this[_internals].data = create(this[_internals].data, updater)
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
 * Options for creating a tagged exception instance
 * using the `make` method on the exception class.
 */
type TaggedExceptionMakeOptions<F extends Schema.Struct.Fields | undefined = undefined> = Spread<TaggedExceptionOptions & { message?: string }, F extends undefined ? object : { data: Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>> }>

/**
 * Creates a tagged exception class that serves as a base for defining
 * custom exception types.
 *
 * - The provided `tag` is automatically prefixed with `@error/exception/`
 *   to ensure uniqueness, enabling reliable type checking and filtering.
 * - This helps standardize error classification, making debugging and
 *   error handling more structured.
 *
 * @param tag - A unique identifier for the exception class.
 */
export function TaggedException<T extends string>(tag: T) {
  type Tag = `@error/exception/${T}`
  const resolvedTag: Tag = `@error/exception/${tag}` as Tag

  return <F extends Schema.Struct.Fields | undefined = undefined>(
    defaults: DefaultExceptionOptions & {
      schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>;
    },
  ) => {
    class Exception extends baseException<Tag, F>(resolvedTag, defaults.schema) {
      constructor(...args: TaggedExceptionConstructor<F>) {
        const { schema, ...rest } = defaults
        super(rest, ...args)
      }

      static make<V extends Exception>(this: new (...args: TaggedExceptionConstructor<F>) => V, options: TaggedExceptionMakeOptions<F>) {
        if (lodash.has(options, 'data') && is.object(options.data)) {
          const args = [
            options.data,
            options.message,
            lodash.omit(options, 'data', 'message'),
          ] as unknown as TaggedExceptionConstructor<F>
          return new this(...args)
        }

        const args = [
          options.message,
          lodash.omit(options, 'message'),
        ] as unknown as TaggedExceptionConstructor<F>
        return new this(...args)
      }
    }
    ;(Exception.prototype as any).name = resolvedTag
    ;(Exception as any).__tag__ = resolvedTag

    return Exception as unknown as (new (...args: TaggedExceptionConstructor<F>) => Brand.Branded<InstanceType<Class<Exception>>, typeof EXCEPTION_MARKER>) & { make: typeof Exception.make; readonly [EXCEPTION_MARKER]: typeof EXCEPTION_MARKER }
  }
}

/**
 * Represents the type for a tagged exception instance.
 *
 * This type is used to accept a `TaggedException`
 * as an instance type rather than a class type.
 *
 * @template T - The unique tag for the exception.
 * @template F - The schema fields for the additional data context.
 */
export type TaggedException<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = Brand.Branded<BaseExceptionInstanceType<T, F>, typeof EXCEPTION_MARKER>

/**
 * Represents the type for a tagged exception class.
 *
 * This type is used to accept a `TaggedException`
 * as a class type rather than an instance type.
 *
 * @template T - The unique tag for the exception.
 * @template F - The schema fields for the additional data context.
 */
export type ITaggedException<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = Class<TaggedException<T, F>> & { make: (options: TaggedExceptionMakeOptions<F>) => TaggedException<T, F>; readonly [EXCEPTION_MARKER]: typeof EXCEPTION_MARKER }
