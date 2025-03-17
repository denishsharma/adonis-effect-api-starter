import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { ExceptionResponse } from '#core/http/schemas/exception_response_schema'
import { ResponseService } from '#core/http/services/response_service'
import { RuntimeUtility } from '#utils/runtime_utility'
import is from '@adonisjs/core/helpers/is'
import { Effect, Either, Ref, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

export default class RuntimeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const accepts = ctx.request.accepts(['json'])

    await next()

    /**
     * Check if the response has content
     * to be processed.
     */
    if (ctx.response.hasContent) {
      /**
       * Get the content from the response
       * to be processed.
       */
      const content = ctx.response.content![0]

      const program = Effect.gen(function* () {
        const responseService = yield* ResponseService

        /**
         * Wrap the content in an effectful program
         * to handle the response content.
         */
        return yield* Effect.gen(function* () {
          const effectful = yield* Ref.make<Effect.Effect<unknown, unknown, never>>(content)

          /**
           * Check if the content is an effect, if so
           * set the effectful reference to the content.
           *
           * Otherwise, wrap the content in an effectful
           * program to be processed.
           */
          if (Effect.isEffect(content)) {
            yield* Ref.set(effectful, content as Effect.Effect<unknown, unknown, never>)
          } else {
            yield* Ref.set(effectful, Effect.suspend(() => Effect.gen(function* () {
            /**
             * Check if the content is a promise, if so
             * wrap the promise in an effectful program
             */
              if (is.promise(content)) {
                return yield* Effect.promise(async () => await content)
              }

              /**
               * Return the content as is if it is not
               * a promise.
               */
              return content
            })))
          }

          /**
           * Get the content from the effectful reference
           * to be processed.
           */
          return yield* (yield* effectful.get)
        }).pipe(
          /**
           * Make a success response from the content
           * to be sent as a response.
           */
          Effect.flatMap(data => Effect.gen(function* () {
            /**
             * Check if the content is an exception response
             * to be sent as a response.
             *
             * If so, set the response status to the exception
             * response status and return the exception response
             * as the response content without processing it.
             */
            const exceptionResponse = Schema.decodeUnknownEither(ExceptionResponse)(data)
            if (Either.isRight(exceptionResponse)) {
              ctx.response.status(exceptionResponse.right.status)
              return data
            }

            /**
             * If the client accepts JSON, make a success
             * response from the content to be sent as a
             * response.
             */
            if (accepts === 'json') {
              const response = yield* responseService.make.success(ctx)(data)
              ctx.response.status(response.status)
              return response
            }

            /**
             * If the client does not accept JSON, return
             * the content as is without processing it.
             *
             * This is useful for returning binary data
             * such as images, videos, etc.
             */
            ctx.response.status(StatusCodes.OK)
            return data
          })),
        )
      })

      /**
       * Run the program to process the response content
       * to be sent as a response.
       */
      const response = await program.pipe(
        RuntimeUtility.ensureDependencies(),
        RuntimeUtility.run(),
      )

      /**
       * Send the response to the client.
       */
      return ctx.response.send(response)
    }
  }
}
