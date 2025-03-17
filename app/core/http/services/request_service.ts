import { ValidateRequestService } from '#core/http/services/request/validate_request_service'
import { Effect } from 'effect'

export class HttpRequestService extends Effect.Service<HttpRequestService>()('@service/http/request', {
  dependencies: [ValidateRequestService.Default],
  effect: Effect.gen(function* () {
    const validateRequestService = yield* ValidateRequestService

    return {
      /**
       * Request validation service.
       */
      validator: validateRequestService,
    }
  }),
}) {}
