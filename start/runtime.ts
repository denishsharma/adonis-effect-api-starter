import { ResponseService } from '#core/http/services/response_service'
import { Layer, ManagedRuntime } from 'effect'

export const ApplicationRuntimeDependenciesLayer = Layer.mergeAll(
  ResponseService.Default,
)

export const ApplicationRuntime = ManagedRuntime.make(ApplicationRuntimeDependenciesLayer)
