import type { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import { Context, Effect, Ref } from 'effect'

/**
 * Context for the current response cycle.
 *
 * By current response, we mean the response that is being processed
 * by the application at the moment.
 */
export class CurrentResponseContext extends Context.Tag('@context/http/current_response')<CurrentResponseContext, {
  message: Ref.Ref<string | undefined>
  metadata: Ref.Ref<Record<string, unknown>>
  dataMode: Ref.Ref<ResponseDataMode | undefined>
}>() {
  /**
   * Provide the current response context with implementation.
   */
  static provide() {
    return Effect.provideServiceEffect(CurrentResponseContext, Effect.gen(function* () {
      return {
        message: yield* Ref.make<string | undefined>(undefined),
        metadata: yield* Ref.make<Record<string, unknown>>({}),
        dataMode: yield* Ref.make<ResponseDataMode | undefined>(undefined),
      }
    }))
  }
}
