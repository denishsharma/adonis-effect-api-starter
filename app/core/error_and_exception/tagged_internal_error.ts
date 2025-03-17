import type { InternalErrorCode } from '#constants/internal_error_constant'
import type { Exception } from '@adonisjs/core/exceptions'
import type { Draft } from 'mutative'
import type { Class } from 'type-fest'
import { ErrorKind } from '#core/error_and_exception/constants/error_kind_constant'
import { SchemaUtility } from '#core/schema/utils/schema_utility'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Data, Effect, Match, Option, Schema } from 'effect'
import { create } from 'mutative'

/**
 * Unique symbol to mark the error as an internal error.
 *
 * This is used to identify the error as an internal error
 * and is used for type checking and filtering.
 */
export const INTERNAL_ERROR_MARKER: unique symbol = Symbol('@error/internal')

/**
 * Default options to be used when creating
 * an internal error instance.
 */
interface DefaultInternalErrorOptions {
  /**
   * Unique application-wide error code for
   * this internal error.
   */
  code: InternalErrorCode

  /**
   * A human-readable message that describes
   * the error in detail and is suitable for
   * logging.
   */
  message: string
}

/**
 * Options that can be passed to the internal
 * error constructor.
 *
 * This can be used to customize the specific
 * behavior of the internal error instance.
 */
export interface TaggedInternalErrorOptions {
  /**
   * Unique application-wide error code for
   * this internal error.
   */
  code?: InternalErrorCode

  /**
   * The original error that caused this error
   * to be thrown, if available.
   */
  cause?: Error | TaggedInternalError<any, any> | Exception
}

/**
 * Constructor arguments for the internal error instance.
 *
 * If the first argument is an object, then it is the data
 * context that is attached to the error and rest of the
 * arguments are message and options.
 *
 * If the first argument is not an object, then it is the
 * message and rest of the arguments are options.
 */
export type TaggedInternalErrorConstructor<F extends Schema.Struct.Fields | undefined = undefined> = F extends undefined
  ? [message?: string, options?: TaggedInternalErrorOptions]
  : [data: Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, message?: string, options?: TaggedInternalErrorOptions]

/**
 * Internal function to create a base internal error
 * class that can be extended to create custom internal
 * error classes.
 *
 * @param tag Unique tag for this internal error.
 * @param schema The schema that additional data context must adhere to.
 */
function baseInternalError<
  T extends string,
  F extends Schema.Struct.Fields | undefined = undefined,
>(
  tag: T,
  schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>,
) {
  class Base extends Data.Error {
    static readonly [INTERNAL_ERROR_MARKER] = INTERNAL_ERROR_MARKER

    /**
     * Unique application-wide error code for
     * this internal error.
     */
    readonly code: InternalErrorCode

    /**
     * A human-readable message that describes
     * the error in detail and is suitable for
     * logging.
     */
    readonly message: string

    /**
     * The original error that caused this error
     * to be thrown.
     */
    readonly cause?: Error | TaggedInternalError<any, any> | Exception

    /**
     * The schema that the data must adhere to.
     * If the data does not adhere to the schema,
     * the error will be thrown.
     *
     * It is used to validate the additional data
     * context that can be attached to the error.
     */
    readonly schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>

    /**
     * Additional data context that can be attached
     * to the error.
     */
    private _data: Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>> | undefined

    /**
     * Unique tag for this internal error.
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
    readonly _kind: ErrorKind.INTERNAL = ErrorKind.INTERNAL

    constructor(defaults: DefaultInternalErrorOptions, ...args: TaggedInternalErrorConstructor<F>) {
      super()

      /**
       * Set the schema for the error instance.
       *
       * This is used to validate the additional
       * data context that can be attached to the
       * error.
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
       * the error.
       */
      if (is.object(messageOrData)) {
        this._data = messageOrData as Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>
      } else {
        this._data = undefined
      }

      /**
       * Default options for the error
       * constructor argument if not provided.
       */
      const defaultOptions = {
        code: defaults.code,
        cause: undefined,
      }

      /**
       * Resolve the arguments to determine the
       * message and options for the error based
       * on the first argument type.
       */
      const resolvedArguments = Match.value(!is.nullOrUndefined(this._data)).pipe(
        Match.withReturnType<{ message: string, options: TaggedInternalErrorOptions }>(),
        Match.when(true, () => ({
          message: (messageorOptions ?? defaults.message) as string,
          options: defu(options, defaultOptions),
        })),
        Match.orElse(() => ({
          message: (messageOrData ?? defaults.message) as string,
          options: defu((messageorOptions ?? {}) as TaggedInternalErrorOptions, defaultOptions),
        })),
      )

      /**
       * Set the error code, message, and cause
       * based on the resolved arguments.
       */
      this.code = resolvedArguments.options.code
      this.message = resolvedArguments.message
      this.cause = resolvedArguments.options.cause

      /**
       * Capture the stack trace for the error instance.
       */
      Error.captureStackTrace(this, Object.getPrototypeOf(this).constructor)
    }

    get [Symbol.toStringTag]() {
      return this._tag
    }

    /**
     * When the error is converted to a string,
     * it should return the error tag, code, and
     * message.
     */
    toString(): string {
      return `<${this._tag}> [${this.code}]: ${this.message}`
    }

    /**
     * When the error is converted to JSON,
     * it should return the error tag, code,
     * message, cause, and data.
     */
    toJSON() {
      return {
        _tag: this._tag,
        _kind: this._kind,
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
                  SchemaUtility.toSchemaParseError('Unexpected error while encoding error data context.', data.value),
                ))
              }).pipe(Effect.runSync)
        ) as F extends undefined ? undefined : Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>,
        stack: this.stack,
      }
    }

    /**
     * Get the decoded data context that is
     * attached to the error.
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
          SchemaUtility.toSchemaParseError('Unexpected error while decoding error data context.', this._data),
        )
        return Option.some(decoded)
      })
    }

    /**
     * Update the data context that is attached
     * to the error.
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
 * Instance type of the base internal error class.
 *
 * This is used to infer the instance type of the internal
 * error class that is created using the tagged internal error class.
 */
type BaseInternalErrorInstanceType<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = InstanceType<ReturnType<typeof baseInternalError<T, F>>>

/**
 * Create a tagged internal error class that can be extended
 * to create custom internal error classes.
 *
 * Tag is extended with `@error/internal/` prefix to ensure
 * that the tag is unique and can be used for type checking
 * and filtering.
 *
 * @param tag Unique tag for this internal error class.
 */
export function TaggedInternalError<T extends string>(tag: T) {
  type Tag = `@error/internal/${T}`
  const resolvedTag: Tag = `@error/internal/${tag}` as Tag

  return <F extends Schema.Struct.Fields | undefined = undefined>(
    defaults: DefaultInternalErrorOptions & {
      schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>
    },
  ) => {
    class InternalError extends baseInternalError<Tag, F>(resolvedTag, defaults.schema) {
      constructor(...args: TaggedInternalErrorConstructor<F>) {
        const { schema, ...rest } = defaults
        super(rest, ...args)
      }
    }
    ;(InternalError.prototype as any).name = resolvedTag
    ;(InternalError as any).__tag__ = resolvedTag

    return InternalError as unknown as new (...args: TaggedInternalErrorConstructor<F>) => InstanceType<Class<InternalError>>
  }
}

/**
 * Type guard to check if the error is an instance
 * of the tagged internal error class.
 */
export type TaggedInternalError<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = BaseInternalErrorInstanceType<T, F>
