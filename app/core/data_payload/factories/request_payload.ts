import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes, ValidationOptions } from '@vinejs/vine/types'
import type { Brand } from 'effect'
import type { Class } from 'type-fest'
import { _internals, _kind } from '#constants/proto_marker_constant'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind_constant'
import { PayloadDataSource } from '#core/data_payload/constants/payload_data_source_constant'
import PayloadNotValidatedError from '#core/data_payload/errors/payload_not_validated_error'
import { REQUEST_PAYLOAD_MARKER } from '#core/data_payload/internals/constants/data_payload_marker_constant'
import { enforceSuccessType } from '#core/effect/utils/effect_utility'
import { toSchemaParseError } from '#core/error/utils/error_utility'
import HttpRequestService from '#core/http/services/http_request_service'
import { withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import { validateWithVine } from '#core/validation/utils/vine_utility'
import { defu } from 'defu'
import { Effect, Inspectable, Option, pipe, Schema } from 'effect'

/**
 * Options for the request payload class to
 * be used to customize the behavior of the request payload.
 */
interface PayloadOptions<I, S extends SchemaTypes, EM = never, RM = never> {
  mapToSchema?: (data: Infer<S>) => Effect.Effect<I, EM, RM>;
}

/**
 * Represents the internal structure of a request payload
 * that is used to store the schema, validator, options, and data.
 */
interface RequestPayloadInternals<A, I, S extends SchemaTypes, M extends undefined | Record<string, any>, EM = never, RM = never> {
  /**
   * Schema to decode the request payload with.
   *
   * This schema is used to decode the validated request payload
   * to the expected data structure.
   *
   * This schema defines the output structure of the request payload.
   */
  schema: Schema.Schema<A, I>;

  /**
   * Validator to validate the request payload with.
   *
   * This validator is used to validate the incoming request payload
   * to ensure that the request payload is valid.
   *
   * Validation errors are thrown if the request payload is invalid.
   *
   * This validator defines the input structure of the request payload.
   */
  validator: VineValidator<S, M>;

  /**
   * Options to customize the behavior of the request payload.
   */
  options: Required<PayloadOptions<I, S, EM, RM>>;

  /**
   * Validated request payload data after the source is validated.
   *
   * It is an option because the request payload
   * may not be validated yet.
   */
  data: Option.Option<A>;
}

/**
 * Internal function to create a base request payload class
 * that is used to create a custom/concrete request payload classes.
 *
 * @param tag Unique tag for the request payload class.
 * @param schema Schema to decode the request payload with.
 * @param validator Validator to validate the request payload with.
 * @param options Options to customize the behavior of the request payload.
 */
function baseRequestPayload<
  T extends string,
  A,
  I,
  S extends SchemaTypes,
  M extends undefined | Record<string, any>,
  EM = never,
  RM = never,
>(
  tag: T,
  schema: Schema.Schema<A, I>,
  validator: VineValidator<S, M>,
  options: PayloadOptions<I, S, EM, RM>,
) {
  class Base {
    static get [REQUEST_PAYLOAD_MARKER]() { return REQUEST_PAYLOAD_MARKER }

    /**
     * Unique tag for the request payload class.
     *
     * This tag is used to identify the request payload class
     * and to differentiate it from other request payload classes.
     */
    readonly _tag: T = tag

    /**
     * Describes the kind of the request payload.
     *
     * This kind is used to identify the type of the request payload
     * and to differentiate it from other request payloads.
     */
    readonly [_kind]: DataPayloadKind.REQUEST = DataPayloadKind.REQUEST

    /**
     * Internals of the request payload that payload
     * configuration and data.
     */
    readonly [_internals]: RequestPayloadInternals<A, I, S, M, EM, RM> = {
      schema,
      validator,
      data: Option.none(),
      options: defu(options, { mapToSchema: Effect.succeed }),
    }

    /**
     * Process the request payload with the source data
     * and validate the source data with the validator and return
     * the instance of the request payload with the validated data.
     *
     * This validated data can be accessed through the `payload` method.
     *
     * @param validatorOptions Options to customize the behavior of the validator.
     */
    process(...[validatorOptions]: [undefined] extends M ? [validatorOptions?: ValidationOptions<M> | undefined] : [validatorOptions: ValidationOptions<M>]) {
      /**
       * @param source Source of which the request payload is created from.
       *
       * @template L Represent the return type of process method. When the return type is not specified, it defaults to this request payload instance.
       */
      return <L = never>(source: PayloadDataSource<Infer<S>>) =>
        Effect.gen(this, function* () {
          /**
           * Extract the data from the source data source.
           */
          const sourceData = pipe(
            source,
            PayloadDataSource.$match({
              known: ({ data }) => data,
              unknown: ({ data }) => data,
            }),
          )

          /**
           * Validate the source data with the validator.
           */
          const validated = yield* Effect.suspend(() => pipe(
            sourceData,
            validateWithVine(
              this[_internals].validator,
              {
                validator: validatorOptions as any,
                exception: {
                  validation: 'Validation error occurred while validating the request payload.',
                  unknown: 'Unknown error occurred while validating the request payload.',
                },
              },
            ),
          )).pipe(withTelemetrySpan('validate_with_vine'))

          /**
           * Transform the validated data to the schema compatible data.
           */
          const mapped = yield* this[_internals].options
            .mapToSchema(validated)
            .pipe(withTelemetrySpan('map_to_schema'))

          /**
           * Decode the mapped data with the schema.
           */
          return yield* Effect.suspend(() =>
            Schema.decode(this[_internals].schema, { errors: 'all' })(mapped).pipe(
              toSchemaParseError('Unexpected error while decoding the request payload.'),
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
          withTelemetrySpan('validate_request_payload', {
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
     * String representation of the request payload.
     */
    toString() {
      return JSON.stringify(this.toJSON(), null, 2)
    }

    /**
     * Converts the instance to a JSON representation.
     * If the request payload is not validated yet, it returns null.
     */
    toJSON(): A | null {
      if (Option.isNone(this[_internals].data)) {
        return null
      }

      return this[_internals].data.value
    }

    /**
     * Returns the request payload as an inspectable object.
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
 * Instance type of the base request payload class.
 *
 * This is used to inter the instance type of the
 * base request payload class that is created using the
 * base request payload function.
 */
type BaseRequestPayloadInstanceType<T extends string, A, I, S extends SchemaTypes, M extends undefined | Record<string, any>, EM = never, RM = never> = InstanceType<ReturnType<typeof baseRequestPayload<T, A, I, S, M, EM, RM>>>

/**
 * Options for the request payload class to
 * be used to customize the behavior of the request payload.
 */
export type RequestPayloadOptions<A, I, S extends SchemaTypes, M extends undefined | Record<string, any>, EM = never, RM = never> = PayloadOptions<I, S, EM, RM> & {
  validator: VineValidator<S, M>;
  schema: Schema.Schema<A, I>;
}

/**
 * Creates a request payload class with the given tag.
 *
 * Tag is extended with `@request_payload/` to differentiate
 * the request payload classes from other classes. If you want to use hierarchical
 * tags, you can use `/` to separate the tags. For example, `RequestPayload('user/profile')`.
 * will create a request payload class with the tag `@request_payload/user/profile`.
 *
 * This function is used to create a custom/concrete request payload class
 * that is used to validate the incoming request payload and decode it to the expected data structure.
 *
 * @param tag Unique tag for the request payload class.
 */
export function RequestPayload<T extends string>(tag: T) {
  type Tag = `@request_payload/${T}`
  const resolvedTag: Tag = `@request_payload/${tag}` as Tag

  /**
   * Creates a new request payload class with the given tag.
   *
   * @param options Options to customize the behavior of the request payload.
   */
  return <A, I, S extends SchemaTypes, M extends undefined | Record<string, any>, EM = never, RM = never>(options: RequestPayloadOptions<A, I, S, M, EM, RM>) => {
    const { schema, validator, ...rest } = options

    class Payload extends baseRequestPayload<Tag, A, I, S, M, EM, RM>(resolvedTag, schema, validator, rest) {
      /**
       * Creates a new processed request payload from the source data.
       *
       * This function is used to create a new processed request payload
       * from the source data. The source data is validated with the validator
       * and the validated data is returned as the processed request payload.
       *
       * Returned instance of the request payload is processed and validated and
       * has the validated data populated in the instance.
       *
       * @param validatorOptions Options to customize the behavior of the validator.
       */
      static fromSource<V extends Payload>(this: new() => V, ...[validatorOptions]: [undefined] extends M ? [validatorOptions?: ValidationOptions<M> | undefined] : [validatorOptions: ValidationOptions<M>]) {
        /**
         * @param source Source of which the request payload is created from.
         */
        return (source: PayloadDataSource<Infer<S>>) => new this()
          .process(validatorOptions as any)<ProcessedRequestPayload<Brand.Branded<V, typeof REQUEST_PAYLOAD_MARKER>>>(source)
      }

      /**
       * Creates a new processed request payload from the incoming http request data.
       *
       * This function is used to create a new processed request payload
       * from the incoming http request data. The request data is validated with the validator
       * and the validated data is returned as the processed request payload.
       *
       * Returned instance of the request payload is processed and validated and
       * has the validated data populated in the instance.
       *
       * @param validatorOptions Options to customize the behavior of the validator.
       */
      static fromRequest<V extends Payload>(this: new() => V, ...[validatorOptions]: [undefined] extends M ? [validatorOptions?: ValidationOptions<M> | undefined] : [validatorOptions: ValidationOptions<M>]) {
        return Effect.gen(this, function* () {
          const requestData = yield* HttpRequestService.use(_ => _.getRequestData())
          return yield* new this().process(validatorOptions as any)<ProcessedRequestPayload<Brand.Branded<V, typeof REQUEST_PAYLOAD_MARKER>>>(PayloadDataSource.unknown({ data: requestData }))
        })
      }
    }
    ;(Payload.prototype as any).name = resolvedTag
    ;(Payload as any).__tag__ = resolvedTag

    return Payload as unknown as (new() => Brand.Branded<InstanceType<typeof Payload>, typeof REQUEST_PAYLOAD_MARKER>) & { fromSource: typeof Payload.fromSource; fromRequest: typeof Payload.fromRequest; readonly [REQUEST_PAYLOAD_MARKER]: typeof REQUEST_PAYLOAD_MARKER }
  }
}

/**
 * Type guard to check if the given value is a
 * instance of the request payload class.
 */
export type RequestPayload<T extends string, A, I, S extends SchemaTypes, M extends undefined | Record<string, any>, EM = never, RM = never> = Brand.Branded<BaseRequestPayloadInstanceType<T, A, I, S, M, EM, RM>, typeof REQUEST_PAYLOAD_MARKER>

/**
 * Type for the request payload class.
 * This is used when you want to accept any request payload class
 * as a concrete class instead of the instance type.
 */
export type IRequestPayload<T extends string, A, I, S extends SchemaTypes, M extends undefined | Record<string, any>, EM = never, RM = never> = Class<RequestPayload<T, A, I, S, M, EM, RM>>

/**
 * Type for the processed request payload.
 * This is used when you want to accept any processed request payload.
 *
 * This will add properties of the schema to the request payload
 * and remove the `process` method from the request payload because
 * the request payload is already processed.
 */
export type ProcessedRequestPayload<P extends RequestPayload<any, any, any, any, any, any, any>> =
  P extends RequestPayload<any, infer A, any, any, any, any, any>
    ? Brand.Branded<Brand.Brand.Unbranded<Omit<P, 'process' | 'payload'>> & A & { payload: () => Effect.Effect<A, never, never> }, typeof REQUEST_PAYLOAD_MARKER>
    : never
