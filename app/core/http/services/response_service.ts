import { MakeResponseService } from '#core/http/services/make_response_service'
import { ResposneContextService } from '#core/http/services/response_context_service'
import { Effect } from 'effect'

export class ResponseService extends Effect.Service<ResponseService>()('@service/effect/response', {
  dependencies: [ResposneContextService.Default, MakeResponseService.Default],
  effect: Effect.gen(function* () {
    const context = yield* ResposneContextService
    const make = yield* MakeResponseService

    return {
      /**
       * Response context service.
       */
      context,

      /**
       * Make response service.
       */
      make,
    }
  }),
}) {}
