import type { ApplicationService } from '@adonisjs/core/types'
import extensions from '#start/extensions'
import { BaseModel, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    /**
     * Load the extensions to extend the application
     */
    for (const extension of extensions) {
      await extension()
    }

    /**
     * Set the naming strategy for the Lucid models
     * to snake case
     */
    BaseModel.namingStrategy = new SnakeCaseNamingStrategy()
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
