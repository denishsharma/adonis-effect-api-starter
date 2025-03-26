import type { InternalErrorCode } from '#constants/internal_error_constant'
import type { Exception } from '@adonisjs/core/exceptions'
import type { Brand } from 'effect'
import type { Draft } from 'mutative'
import type { Class, Spread } from 'type-fest'
import { _internals, _kind } from '#constants/proto_marker_constant'
import { ErrorKind } from '#core/error/constants/error_kind_constant'
import { INTERNAL_ERROR_MARKER } from '#core/error/internals/constants/error_marker_constant'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Data, Effect, Match, Option, Schema } from 'effect'
import * as lodash from 'lodash-es'
import { create } from 'mutative'

/**
 * Default options to be used when creating
 * an internal error instance.
 */
interface DefaultInternalErrorOptions {
  /**
   * Unique application-wide error code for
   * this internal error.
   */
  code: InternalErrorCode;

  /**
   * A human-readable message that describes
   * the error in detail and is suitable for
   * logging.
   */
  message: string;
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
  code?: InternalErrorCode;

  /**
   * The original error that caused this error
   * to be thrown, if available.
   */
  cause?: Error | TaggedInternalError<any, any> | Exception;
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
 * Represents the internal structure of a tagged exception.
 *
 * - Supports an optional schema that defines the expected data structure.
 * - Stores encoded data based on the defined schema, ensuring consistency
 *   and validation across different exception types.
 *
 * @template F - The schema fields that define the structure of the exception's data.
 */
interface TaggedInternalErrorInternals<F extends Schema.Struct.Fields | undefined> {
  /**
   * The schema that the data must adhere to.
   * If the data does not adhere to the schema,
   * the error will be thrown.
   *
   * It is used to validate the additional data
   * context that can be attached to the error.
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
 * Creates a base internal error class that serves as a foundation for
 * defining custom internal error types.
 *
 * This function provides a structured way to extend internal error classes,
 * ensuring consistency in error handling and metadata validation.
 *
 * @param tag - A unique identifier for the internal error type.
 * @param schema - A validation schema that defines the structure of additional
 *                 context data associated with the error.
 */
function baseInternalError<
  T extends string,
  F extends Schema.Struct.Fields | undefined = undefined,
>(
  tag: T,
  schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>,
) {
  class Base extends Data.Error {
    static get [INTERNAL_ERROR_MARKER]() { return INTERNAL_ERROR_MARKER }

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
     * Internal configuration for the error instance.
     */
    readonly [_internals]: TaggedInternalErrorInternals<F> = { schema }

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
    readonly [_kind]: ErrorKind.INTERNAL = ErrorKind.INTERNAL

    constructor(defaults: DefaultInternalErrorOptions, ...args: TaggedInternalErrorConstructor<F>) {
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
       * the error.
       */
      if (is.object(messageOrData)) {
        this[_internals].data = messageOrData as Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>
      } else {
        this[_internals].data = undefined
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
      const resolvedArguments = Match.value(!is.nullOrUndefined(this[_internals].data)).pipe(
        Match.withReturnType<{ message: string; options: TaggedInternalErrorOptions }>(),
        Match.when(true, () => ({
          message: (messageOrOptions ?? defaults.message) as string,
          options: defu(options, defaultOptions),
        })),
        Match.orElse(() => ({
          message: (messageOrData ?? defaults.message) as string,
          options: defu((messageOrOptions ?? {}) as TaggedInternalErrorOptions, defaultOptions),
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
        _kind: this[_kind],
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
     * attached to the error.
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
     * to the error.
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
 * Instance type of the base internal error class.
 *
 * This is used to infer the instance type of the internal
 * error class that is created using the tagged internal error class.
 */
type BaseInternalErrorInstanceType<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = InstanceType<ReturnType<typeof baseInternalError<T, F>>>

/**
 * Options for creating a tagged exception instance
 * using the `make` method on the exception class.
 */
type TaggedInternalErrorMakeOptions<F extends Schema.Struct.Fields | undefined = undefined> = Spread<TaggedInternalErrorOptions & { message?: string }, F extends undefined ? object : { data: Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>> }>

/**
 * Creates a tagged internal error class that serves as a base for defining
 * custom internal error types.
 *
 * - The provided `tag` is automatically prefixed with `@error/internal/` to
 *   ensure uniqueness, making it useful for type checking and filtering.
 * - This helps standardize error classification, making debugging and
 *   handling more predictable.
 *
 * @param tag - A unique identifier for the internal error class.
 */
export function TaggedInternalError<T extends string>(tag: T) {
  type Tag = `@error/internal/${T}`
  const resolvedTag: Tag = `@error/internal/${tag}` as Tag

  return <F extends Schema.Struct.Fields | undefined = undefined>(
    defaults: DefaultInternalErrorOptions & {
      schema?: Schema.Struct<Exclude<F, undefined>> & Schema.Schema<Schema.Schema.Type<Schema.Struct<Exclude<F, undefined>>>, Schema.Schema.Encoded<Schema.Struct<Exclude<F, undefined>>>, never>;
    },
  ) => {
    class InternalError extends baseInternalError<Tag, F>(resolvedTag, defaults.schema) {
      constructor(...args: TaggedInternalErrorConstructor<F>) {
        const { schema, ...rest } = defaults
        super(rest, ...args)
      }

      static make<V extends InternalError>(this: new (...args: TaggedInternalErrorConstructor<F>) => V, options: TaggedInternalErrorMakeOptions<F>) {
        if (lodash.has(options, 'data') && is.object(options.data)) {
          const args = [
            options.data,
            options.message,
            lodash.omit(options, 'data', 'message'),
          ] as unknown as TaggedInternalErrorConstructor<F>
          return new this(...args)
        }

        const args = [
          options.message,
          lodash.omit(options, 'message'),
        ] as unknown as TaggedInternalErrorConstructor<F>
        return new this(...args)
      }
    }
    ;(InternalError.prototype as any).name = resolvedTag
    ;(InternalError as any).__tag__ = resolvedTag

    return InternalError as unknown as (new (...args: TaggedInternalErrorConstructor<F>) => Brand.Branded<InstanceType<Class<InternalError>>, typeof INTERNAL_ERROR_MARKER>) & { make: typeof InternalError.make; readonly [INTERNAL_ERROR_MARKER]: typeof INTERNAL_ERROR_MARKER }
  }
}

/**
 * Represents the type for a tagged internal error instance.
 *
 * This type is used to accept a `TaggedInternalError`
 * as an instance type rather than a class type.
 *
 * @template T - The unique tag for the internal error.
 * @template F - The schema fields for the additional data context.
 */
export type TaggedInternalError<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = Brand.Branded<BaseInternalErrorInstanceType<T, F>, typeof INTERNAL_ERROR_MARKER>

/**
 * Represents the type for a tagged internal error class.
 *
 * This type is used to accept a `TaggedInternalError`
 * as a class type rather than an instance type.
 *
 * @template T - The unique tag for the internal error.
 * @template F - The schema fields for the additional data context.
 */
export type ITaggedInternalError<T extends string, F extends Schema.Struct.Fields | undefined = undefined> = Class<TaggedInternalError<T, F>> & { make: (options: TaggedInternalErrorMakeOptions<F>) => TaggedInternalError<T, F>; readonly [INTERNAL_ERROR_MARKER]: typeof INTERNAL_ERROR_MARKER }
