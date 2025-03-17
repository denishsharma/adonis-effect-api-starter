import type { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import { CurrentResponseContext } from '#core/http/contexts/current_response_context'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_details_schema'
import { defu } from 'defu'
import { Effect, Ref } from 'effect'
import * as lodash from 'lodash-es'

export class ResposneContextService extends Effect.Service<ResposneContextService>()('@service/http/response_context', {
  accessors: true,
  effect: Effect.gen(function* () {
    const annotateMetadata = Effect.fn(function* (metadata: Record<string, unknown>) {
      const currentResponseContext = yield* CurrentResponseContext
      const existingMetadata = yield* currentResponseContext.metadata.get
      yield* Ref.set(currentResponseContext.metadata, defu(lodash.omit(metadata, Object.keys(DefaultResponseMetadataDetails.fields)), existingMetadata))
    })

    const replaceMetadata = Effect.fn(function* (metadata: Record<string, unknown>) {
      const currentResponseContext = yield* CurrentResponseContext
      const existingMetadata = yield* currentResponseContext.metadata.get
      yield* Ref.set(currentResponseContext.metadata, defu(lodash.pick(existingMetadata, Object.keys(DefaultResponseMetadataDetails.fields)), metadata))
    })

    const metadata = Effect.fn(function* () {
      const currentResponseContext = yield* CurrentResponseContext
      return yield* currentResponseContext.metadata.get
    })

    const specifyDataMode = Effect.fn(function* (dataMode: ResponseDataMode) {
      const currentResponseContext = yield* CurrentResponseContext
      yield* Ref.set(currentResponseContext.dataMode, dataMode)
    })

    const dataMode = Effect.fn(function* () {
      const currentResponseContext = yield* CurrentResponseContext
      return yield* currentResponseContext.dataMode.get
    })

    const specifyMessage = Effect.fn(function* (message: string) {
      const currentResponseContext = yield* CurrentResponseContext
      yield* Ref.set(currentResponseContext.message, message)
    })

    const message = Effect.fn(function* () {
      const currentResponseContext = yield* CurrentResponseContext
      return yield* currentResponseContext.message.get
    })

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
