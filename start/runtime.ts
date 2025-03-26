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

import HttpModule from '#core/http/http_module'
import { Layer, ManagedRuntime } from 'effect'

export const ApplicationRuntimeDependenciesLayer = Layer.mergeAll(
  HttpModule.provide(),
)

export const ApplicationRuntime = ManagedRuntime.make(ApplicationRuntimeDependenciesLayer)
