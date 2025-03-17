import { HttpRequestService } from '#core/http/services/request_service'
import { HttpResponseService } from '#core/http/services/response_service'
import { Layer, ManagedRuntime } from 'effect'

export const ApplicationRuntimeDependenciesLayer = Layer.mergeAll(
  HttpRequestService.Default,
  HttpResponseService.Default,
)

export const ApplicationRuntime = ManagedRuntime.make(ApplicationRuntimeDependenciesLayer)
