import type { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import { CurrentHttpContext } from '#core/http/contexts/current_http_context'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_details_schema'
import { EffectUtility } from '#utils/effect_utility'
import { defu } from 'defu'
import { Effect } from 'effect'
import * as lodash from 'lodash-es'

export class ResposneContextService extends Effect.Service<ResposneContextService>()('@service/http/response_context', {
  accessors: true,
  effect: Effect.gen(function* () {
    function annotateMetadata(data: Record<string, unknown>) {
      return Effect.gen(function* () {
        const { available, withContext } = yield* CurrentHttpContext

        const existingMetadata = available ? yield* withContext(ctx => Effect.succeed(ctx.response.context().access().metadata)) : {} as Record<string, unknown>
        const newMetadata = defu(lodash.omit(data, Object.keys(DefaultResponseMetadataDetails.fields)), existingMetadata)
        yield* withContext(ctx => Effect.sync(() => ctx.response.context().override.metadata(newMetadata)))
      }).pipe(
        EffectUtility.withSuccessType<void>(),
      )
    }

    function replaceMetadata(data: Record<string, unknown>) {
      return Effect.gen(function* () {
        const { available, withContext } = yield* CurrentHttpContext

        const existingMetadata = available ? yield* withContext(ctx => Effect.succeed(ctx.response.context().access().metadata)) : {}
        const newMetadata = defu(lodash.pick(existingMetadata, Object.keys(DefaultResponseMetadataDetails.fields)), data)

        yield* withContext(ctx => Effect.sync(() => ctx.response.context().override.metadata(newMetadata)))
      }).pipe(
        EffectUtility.withSuccessType<void>(),
      )
    }

    function metadata() {
      return Effect.gen(function* () {
        const { available, withContext } = yield* CurrentHttpContext
        return available ? yield* withContext(ctx => Effect.succeed(ctx.response.context().access().metadata)) : {}
      }).pipe(
        EffectUtility.withSuccessType<Record<string, unknown>>(),
      )
    }

    function specifyDataMode(mode: ResponseDataMode) {
      return Effect.gen(function* () {
        const { withContext } = yield* CurrentHttpContext
        yield* withContext(ctx => Effect.sync(() => ctx.response.context().override.dataMode(mode)))
      }).pipe(
        EffectUtility.withSuccessType<void>(),
      )
    }

    function dataMode() {
      return Effect.gen(function* () {
        const { available, withContext } = yield* CurrentHttpContext
        return available ? yield* withContext(ctx => Effect.succeed(ctx.response.context().access().dataMode)) : undefined
      }).pipe(
        EffectUtility.withSuccessType<undefined | ResponseDataMode>(),
      )
    }

    function specifyMessage(resposneMessage: string) {
      return Effect.gen(function* () {
        const { withContext } = yield* CurrentHttpContext
        yield* withContext(ctx => Effect.sync(() => ctx.response.context().override.message(resposneMessage)))
      }).pipe(
        EffectUtility.withSuccessType<void>(),
      )
    }

    function message() {
      return Effect.gen(function* () {
        const { available, withContext } = yield* CurrentHttpContext
        return available ? yield* withContext(ctx => Effect.succeed(ctx.response.context().access().message)) : undefined
      }).pipe(
        EffectUtility.withSuccessType<undefined | string>(),
      )
    }

    return {
      /**
       * Annotate the metadata of the current response.
       *
       * This method will merge the provided metadata with
       * the existing metadata of the current response.
       *
       * Please note that the metadata will be merged using
       * the `defu` function from the `defu` package.
       *
       * @param metadata The metadata to be merged with the existing metadata.
       */
      annotateMetadata,

      /**
       * Replace the metadata of the current response.
       *
       * This method will replace the existing metadata of the current response
       * with the provided metadata.
       *
       * Please note that the metadata will be merged using
       * the `defu` function from the `defu` package.
       *
       * @param metadata The metadata to replace the existing metadata.
       */
      replaceMetadata,

      /**
       * Get the metadata of the current response.
       */
      metadata,

      /**
       * Specify the data mode of the response.
       *
       * This method will set the data mode of the response
       * to the provided data mode.
       *
       * @param dataMode The data mode of the response.
       */
      specifyDataMode,

      /**
       * Get the data mode of the response.
       */
      dataMode,

      /**
       * Specify the message of the response.
       *
       * This method will set the message of the response
       * to the provided message.
       *
       * @param message The message of the response.
       */
      specifyMessage,

      /**
       * Get the message of the response.
       */
      message,
    }
  }),
}) {}
