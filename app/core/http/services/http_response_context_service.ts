import type { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import type { ReadonlyDeep, UnknownRecord } from 'type-fest'
import { CurrentHttpContext } from '#core/http/contexts/current_http_context'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_details_schema'
import { defu } from 'defu'
import { Effect } from 'effect'
import * as lodash from 'lodash-es'

export default class HttpResponseContextService extends Effect.Service<HttpResponseContextService>()('@service/http/response_context', {
  effect: Effect.gen(function* () {
    function annotateResponseMetadata(metadata: UnknownRecord) {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        yield* withContextOr(
          ctx => Effect.sync(() => {
            const data = defu(lodash.omit(metadata, Object.keys(DefaultResponseMetadataDetails.fields)), ctx.response.context().access().metadata)
            ctx.response.context().override.metadata(data)
          }),
          () => Effect.void,
        )
      })
    }

    function setResponseMetadata(metadata: UnknownRecord) {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        yield* withContextOr(
          ctx => Effect.sync(() => {
            const data = defu(lodash.pick(ctx.response.context().access().metadata, Object.keys(DefaultResponseMetadataDetails.fields)), metadata)
            ctx.response.context().override.metadata(data)
          }),
          () => Effect.void,
        )
      })
    }

    function getResponseMetadata() {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        return yield* withContextOr(
          ctx => Effect.succeed(ctx.response.context().access().metadata),
          () => Effect.succeed({} as ReadonlyDeep<UnknownRecord>),
        )
      })
    }

    function setResponseDataMode(dataMode: ResponseDataMode) {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        yield* withContextOr(
          ctx => Effect.sync(() => ctx.response.context().override.dataMode(dataMode)),
          () => Effect.void,
        )
      })
    }

    function getResponseDataMode() {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        return yield* withContextOr(
          ctx => Effect.succeed(ctx.response.context().access().dataMode),
          () => Effect.succeed(undefined),
        )
      })
    }

    function setResponseMessage(message: string) {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        yield* withContextOr(
          ctx => Effect.sync(() => ctx.response.context().override.message(message)),
          () => Effect.void,
        )
      })
    }

    function getResponseMessage() {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        return yield* withContextOr(
          ctx => Effect.succeed(ctx.response.context().access().message),
          () => Effect.succeed(undefined),
        )
      })
    }

    return {
      /**
       * Adds metadata to the current HTTP response without overriding existing fields.
       * If a key exists, primitive values will be replaced, while objects and arrays will be merged.
       *
       * @param metadata - The metadata to annotate the response with.
       *
       * @example
       * ```ts
       * yield* annotateResponseMetadata({ cache: true, tags: ['user'], request_id: '123' });
       * yield* annotateResponseMetadata({ tags: ['admin'], request_id: '456' });
       * // Result: { cache: true, tags: ['user', 'admin'], request_id: '123' }
       * ```
       */
      annotateResponseMetadata,

      /**
       * Sets metadata for the current HTTP response, overriding existing fields except for default metadata keys.
       * The `request_id` key will remain unchanged if already set.
       *
       * @param metadata - The metadata to set for the response.
       *
       * @example
       * ```ts
       * yield* setResponseMetadata({ cache: false, tags: ['guest'], request_id: '789' });
       * yield* setResponseMetadata({ cache: true, request_id: '999' });
       * // Result: { cache: true, request_id: '789' }
       * ```
       */
      setResponseMetadata,

      /**
       * Retrieves the metadata from the current HTTP response.
       *
       * @example
       * ```ts
       * const metadata = yield* getResponseMetadata();
       * console.log(metadata); // { cache: true, tags: ['user', 'admin'] }
       * ```
       */
      getResponseMetadata,

      /**
       * Sets the data mode for the current HTTP response.
       *
       * @param dataMode - The response data mode to be set.
       *
       * @example
       * ```ts
       * yield* setResponseDataMode(ResponseDataMode.LIST);
       * ```
       */
      setResponseDataMode,

      /**
       * Retrieves the data mode from the current HTTP response.
       *
       * @example
       * ```ts
       * const mode = yield* getResponseDataMode();
       * console.log(mode); // ResponseDataMode.LIST
       * ```
       */
      getResponseDataMode,

      /**
       * Sets the response message for the current HTTP response.
       *
       * @param message - The message to set for the response.
       *
       * @example
       * ```ts
       * yield* setResponseMessage('User created successfully');
       * ```
       */
      setResponseMessage,

      /**
       * Retrieves the response message from the current HTTP response.
       *
       * @example
       * ```ts
       * const message = yield* getResponseMessage();
       * console.log(message); // 'User created successfully'
       * ```
       */
      getResponseMessage,
    }
  }),
}) {}
