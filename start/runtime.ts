import { HttpUtility } from '#core/http/utils/http_utility'
import { Layer, ManagedRuntime } from 'effect'

export const ApplicationRuntimeDependenciesLayer = Layer.mergeAll(
  HttpUtility.Module.layer(),
)

export const ApplicationRuntime = ManagedRuntime.make(ApplicationRuntimeDependenciesLayer)
