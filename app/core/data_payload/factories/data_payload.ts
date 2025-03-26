import type { Brand } from 'effect'
import type { Class } from 'type-fest'
import { _internals, _kind } from '#constants/proto_marker_constant'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind_constant'
import { PayloadDataSource } from '#core/data_payload/constants/payload_data_source_constant'
import PayloadNotValidatedError from '#core/data_payload/errors/payload_not_validated_error'
import { DATA_PAYLOAD_MARKER } from '#core/data_payload/internals/constants/data_payload_marker_constant'
import { enforceSuccessType } from '#core/effect/utils/effect_utility'
import { toSchemaParseError } from '#core/error/utils/error_utility'
import { withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import { Effect, Inspectable, Option, pipe, Schema } from 'effect'

/**
 * Represents the internal structure of a data payload
 * that is used to store the schema, source, and data.
 */
interface DataPayloadInternals<A, I> {
  /**
   * Schema to validate the data payload with.
   *
   * This schema is used to validate the data payload
   * when it is created from a source.
   *
   * This schema defines the structure of the data payload
   * for input and output.
   */
  schema: Schema.Schema<A, I>;

  /**
   * Validated payload data after the source is validated.
   *
   * It is an option because the data payload
   * may not be validated yet.
   */
  data: Option.Option<A>;
}

/**
 * Internal function to create a base data payload class
 * that is used to create a custom/concrete data payload classes.
 *
 * @param tag Unique tag for the data payload class.
 * @param schema Schema to validate the data payload with.
 */
function baseDataPayload<T extends string, A, I>(tag: T, schema: Schema.Schema<A, I>) {
  class Base {
    static get [DATA_PAYLOAD_MARKER]() { return DATA_PAYLOAD_MARKER }

    /**
     * Unique tag for the data payload class.
     *
     * This tag is used to identify the data payload class
     * and to differentiate it from other data payload classes.
     */
    readonly _tag: T = tag

    /**
     * Describes the kind of the data payload.
     *
     * This kind is used to identify the type of the data payload
     * and to differentiate it from other data payloads.
     */
    readonly [_kind]: DataPayloadKind.DATA = DataPayloadKind.DATA

    /**
     * Internals of the data payload that payload
     * configuration and data.
     */
    readonly [_internals]: DataPayloadInternals<A, I> = {
      schema,
      data: Option.none(),
    }

    /**
     * Process the data payload with the source data
     * and validate the source data with the schema and return the
     * instance of the data payload with the validated data.
     *
     * This validated data can be accessed through the `payload` method.
     */
    process() {
      /**
       * @param source Source of which the data payload is created from.
       *
       * @template L Represent the return type of process method. When the return type is not specified, it defaults to this data payload instance.
       */
      return <L = never>(source: PayloadDataSource<I>) =>
        Effect.gen(this, function* () {
          /**
           * Get the source data from the source.
           */
          const sourceData = pipe(
            source,
            PayloadDataSource.$match({
              known: ({ data }) => data,
              unknown: ({ data }) => data,
            }),
          )

          return yield* Effect.suspend(() =>
            Schema.decode(this[_internals].schema, { errors: 'all' })(sourceData).pipe(
              toSchemaParseError('Unknown error while decoding data payload.'),
            ),
          ).pipe(withTelemetrySpan('decode_with_schema'))
        }).pipe(
          Effect.map((data) => {
            /**
             * Assign the validated data to the request payload instance
             * and return the instance.
             */
            this[_internals].data = Option.fromNullable(data)
            Object.assign(this, data)
            return this as any
          }),
          withTelemetrySpan('validate_data_payload', {
            attributes: { tag: this._tag, kind: this[_kind] },
          }),
          enforceSuccessType<[L] extends [never] ? A : L>(),
        )
    }

    /**
     * Get the validated payload data.
     *
     * This function should be used after the payload data
     * is validated, otherwise it will give `PayloadNotValidatedError`.
     *
     * In case of `PayloadNotValidatedError`, the error should be handled
     * and the payload data should be validated before accessing it.
     */
    payload() {
      return Effect.gen(this, function* () {
        if (Option.isNone(this[_internals].data)) {
          return yield* new PayloadNotValidatedError({ payload: this._tag })
        }

        return this[_internals].data.value
      })
    }

    /**
     * String representation of the data payload.
     */
    toString() {
      return JSON.stringify(this.toJSON(), null, 2)
    }

    /**
     * Returns the data payload as a JSON object.
     * If the data payload is not validated yet, it returns null.
     */
    toJSON(): A {
      if (Option.isNone(this[_internals].data)) {
        return null as A
      }

      return this[_internals].data.value
    }

    /**
     * Returns the data payload as an inspectable object.
     * This is used for debugging and logging purposes.
     */
    toInspectable() {
      return Inspectable.toJSON(
        {
          _tag: this._tag,
          _kind: this[_kind],
          _internals: this[_internals],
          data: this.toJSON(),
        },
      )
    }

    get [Symbol.toStringTag]() {
      return this._tag
    }
  }
  ;(Base.prototype as any).name = tag

  return Base
}

/**
 * Instance type of the base data payload class.
 *
 * This is used to inter the instance type of the
 * base data payload class that is created using the
 * base data payload function.
 */
type BaseDataPayloadInstanceType<T extends string, A, I> = InstanceType<ReturnType<typeof baseDataPayload<T, A, I>>> & A

/**
 * Options to create a data payload class.
 */
export interface DataPayloadOptions<A, I> {
  /**
   * Schema to validate the data payload with.
   *
   * This schema is used to validate the data payload
   * when it is created from a source.
   *
   * This schema defines the structure of the data payload
   * for input and output.
   */
  schema: Schema.Schema<A, I>;
}

/**
 * Creates a new data payload class with a given tag.
 *
 * Tag is extended with `@data_payload/` to differentiate it from
 * other data payload classes. If you want to use hierarchical tags, you can use `/` to
 * separate the tags. e.g. `DataPayload('user/profile')` will create a data payload class
 * with the tag `@data_payload/user/profile`.
 *
 * This function is used to create a custom/concrete data payload class
 * that is used to validate the source data as the data payload.
 *
 * @param tag Unique tag for the data payload class.
 */
export function DataPayload<T extends string>(tag: T) {
  type Tag = `@data_payload/${T}`
  const resolvedTag: Tag = `@data_payload/${tag}` as Tag

  /**
   * Creates a new data payload class with the given options.
   *
   * @param options Options to create the data payload class.
   */
  return <A, I>(options: DataPayloadOptions<A, I>) => {
    const { schema } = options

    class Payload extends baseDataPayload<Tag, A, I>(resolvedTag, schema) {
      /**
       * Creates a new data payload instance from a source
       * and validates the source data with the schema.
       */
      static fromSource<V extends Payload>(this: new() => V) {
        /**
         * @param source Source of which the data payload is created from.
         */
        return (source: PayloadDataSource<I>) => new this().process()<ProcessedDataPayload<Brand.Branded<V, typeof DATA_PAYLOAD_MARKER>>>(source)
      }
    }
    ;(Payload.prototype as any).name = resolvedTag
    ;(Payload as any).__tag__ = resolvedTag

    return Payload as unknown as (new() => Brand.Branded<InstanceType<typeof Payload>, typeof DATA_PAYLOAD_MARKER>) & { fromSource: typeof Payload.fromSource; readonly [DATA_PAYLOAD_MARKER]: typeof DATA_PAYLOAD_MARKER }
  }
}

/**
 * Type guard to check if the given value is a
 * instance of the data payload class.
 */
export type DataPayload<T extends string, A, I> = Brand.Branded<BaseDataPayloadInstanceType<T, A, I>, typeof DATA_PAYLOAD_MARKER>

/**
 * Type for the data payload class.
 * This is used when you want to accept any data payload class
 * as a concrete class instead of the instance type.
 */
export type IDataPayload<T extends string, A, I> = Class<DataPayload<T, A, I>>

/**
 * Type for the processed data payload.
 * This is used when you want to accept any processed data payload.
 *
 * This will add properties of the schema to the data payload
 * and remove the `process` method from the data payload because
 * the data payload is already processed.
 */
export type ProcessedDataPayload<P extends DataPayload<any, any, any>> =
  P extends DataPayload<any, infer A, any>
    ? Brand.Branded<Brand.Brand.Unbranded<Omit<P, 'process' | 'payload'>> & A & { payload: () => Effect.Effect<A, never, never> }, typeof DATA_PAYLOAD_MARKER>
    : never
