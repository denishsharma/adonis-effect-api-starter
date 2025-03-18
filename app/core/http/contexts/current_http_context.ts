import type { HttpContext, Request, Response } from '@adonisjs/core/http'
import is from '@adonisjs/core/helpers/is'
import logger from '@adonisjs/core/services/logger'
import { Context, Effect, Option } from 'effect'

/**
 * Provides the current HTTP context to the current execution scope.
 *
 * This context is used to access the current HTTP request
 * and response objects in the current scope of execution.
 */
export class CurrentHttpContext extends Context.Tag('@context/http/current_context')<CurrentHttpContext, {
  available: boolean
  request: Request
  response: Response
  withContext: <A, E, R>(self: (ctx: HttpContext) => Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}>() {
  /**
   * Provide the current HTTP context to the current execution scope.
   *
   * @param httpContext The current HTTP context.
   */
  static provide(httpContext: Option.Option<HttpContext>) {
    return Effect.provideService(CurrentHttpContext, (() => {
      const ctx = Option.match(httpContext, {
        onNone: () => (undefined as unknown as HttpContext),
        onSome: _ => _,
      })

      const available = !is.nullOrUndefined(ctx)
      if (!available) {
        logger.warn('Current HTTP context is not available in the current scope of execution')
      }

      function withContext<A, E, R>(self: (ctx: HttpContext) => Effect.Effect<A, E, R>) {
        return self(ctx).pipe(
          Effect.when(() => !is.nullOrUndefined(ctx)),
          Effect.map(Option.match({
            onNone: () => (undefined as unknown as A),
            onSome: _ => _,
          })),
        )
      }

      return {
        available,
        request: available ? ctx.request : (undefined as unknown as Request),
        response: available ? ctx.response : (undefined as unknown as Response),
        withContext,
      }
    })())
  }
}
