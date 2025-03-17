import { MakeResponseService } from '#core/http/services/response/make_response_service'
import { ResposneContextService } from '#core/http/services/response/response_context_service'
import { Effect } from 'effect'

export class HttpResponseService extends Effect.Service<HttpResponseService>()('@service/http/response', {
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
