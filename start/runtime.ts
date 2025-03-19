/*
|--------------------------------------------------------------------------
| Effect Runtime Configuration
|--------------------------------------------------------------------------
|
| Here you can define the configuration for the Effect runtime.
| You can define the dependencies that the runtime will use to run
| the effect program.
|
*/

import { HttpUtility } from '#core/http/utils/http_utility'
import { LucidUtility } from '#core/lucid/utils/lucid_utility'
import { Layer, ManagedRuntime } from 'effect'

export const ApplicationRuntimeDependenciesLayer = Layer.mergeAll(
  HttpUtility.Module.layer(),
  LucidUtility.Module.layer(),
)

export const ApplicationRuntime = ManagedRuntime.make(ApplicationRuntimeDependenciesLayer)
