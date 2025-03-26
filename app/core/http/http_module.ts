import HttpMakeResponseService from '#core/http/services/http_make_response_service'
import HttpRequestService from '#core/http/services/http_request_service'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import { Layer } from 'effect'

/**
 * Provides a module layer for the HTTP module.
 *
 * Allows injecting services and dependencies of
 * the HTTP module into the current execution scope.
 */
function provide() {
  return Layer.mergeAll(
    HttpRequestService.Default,
    HttpResponseContextService.Default,
    HttpMakeResponseService.Default,
  )
}

/**
 * The HTTP module provides services and dependencies
 * for the HTTP module.
 */
const HttpModule = {
  provide,
}

export default HttpModule
