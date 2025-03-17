import type { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import type { Draft } from 'mutative'
import type { PartialDeep, ReadonlyDeep } from 'type-fest'
import { Response } from '@adonisjs/core/http'
import { defu } from 'defu'
import { create } from 'mutative'

/**
 * Application context stored in the response object.
 */
export interface ApplicationResponseContext {
  message: string | undefined
  dataMode: ResponseDataMode | undefined
  metadata: Record<string, any>
}

/**
 * Accessor for the application context stored in the response object.
 */
export interface ApplicationResponseContextAccessor {
  access: () => ReadonlyDeep<ApplicationResponseContext>
  override: {
    /**
     * Override the message in the response context.
     *
     * @param message The message to set.
     */
    message: (message: string) => void

    /**
     * Override the metadata in the response context.
     *
     * @param metadata The metadata to set.
     */
    metadata: (metadata: Record<string, any>) => void

    /**
     * Override the data mode in the response context.
     *
     * @param dataMode The data mode to set.
     */
    dataMode: (dataMode: ResponseDataMode) => void
  }
}

/**
 * Get the application context with default values.
 */
function getResponseContext(ctx: PartialDeep<ApplicationResponseContext> = {}): ApplicationResponseContext {
  return defu(ctx, {
    message: undefined,
    metadata: {},
    dataMode: undefined,
  })
}

/**
 * Return a new response context with the given modifier applied.
 */
function modifyResponseContext(ctx: ApplicationResponseContext, modifier: (draft: Draft<ApplicationResponseContext>) => void) {
  return create(ctx, modifier)
}

Response.macro('context', function (this: Response) {
  const ctx = getResponseContext(this.__context)

  return {
    access: () => create(ctx, () => {}),
    override: {
      dataMode: (dataMode: ResponseDataMode) => {
        this.__context = modifyResponseContext(ctx, (draft) => {
          draft.dataMode = dataMode
        })
      },
      message: (message: string) => {
        this.__context = modifyResponseContext(ctx, (draft) => {
          draft.message = message
        })
      },
      metadata: (metadata: Record<string, any>) => {
        this.__context = modifyResponseContext(ctx, (draft) => {
          draft.metadata = metadata
        })
      },
    },
  } satisfies ApplicationResponseContextAccessor
})

declare module '@adonisjs/core/http' {
  interface Response {
    __context: ReadonlyDeep<ApplicationResponseContext>
    context: () => ApplicationResponseContextAccessor
  }
}
