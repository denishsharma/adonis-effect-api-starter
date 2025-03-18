import type { IsolationLevels } from '@adonisjs/lucid/types/database'
import { TelemetryUtility } from '#core/telemetry/utils/telemetry_utility'
import DatabaseTransactionError from '#errors/database_transaction_error'
import db from '@adonisjs/lucid/services/db'
import { Effect, Exit } from 'effect'

export namespace DatabaseUtility {
  /**
   * The options to create a database transaction.
   */
  export interface TransactionOptions {
    isolationLevel?: IsolationLevels
  }

  /**
   * Creates a new database transaction that can be used to perform
   * multiple database operations in a single transaction.
   *
   * @param options The options to create the database transaction.
   */
  export function transaction(options?: TransactionOptions) {
    return Effect.gen(function* () {
      const trx = yield* Effect.tryPromise({
        try: async () => await db.transaction(options),
        catch: DatabaseTransactionError.fromUnknownError({ operation: 'create' }, 'Unexpected error occurred while creating a database transaction.'),
      })

      /**
       * Add finalizer to commit or rollback the transaction
       * based on the exit status of the effect.
       */
      yield* Effect.addFinalizer(exit => exit.pipe(
        Exit.matchEffect({
          onSuccess: () => Effect.tryPromise(async () => await trx.commit()).pipe(Effect.ignore, Effect.as('commit' as const)),
          onFailure: () => Effect.tryPromise(async () => await trx.rollback()).pipe(Effect.ignore, Effect.as('rollback' as const)),
        }),
      ))

      function commit() {
        return Effect.tryPromise({
          try: async () => await trx.commit(),
          catch: DatabaseTransactionError.fromUnknownError({ operation: 'commit' }, 'Unexpected error occurred while committing a database transaction.'),
        }).pipe(TelemetryUtility.withTelemetrySpan('commit_db_transaction'))
      }

      function rollback() {
        return Effect.tryPromise({
          try: async () => await trx.rollback(),
          catch: DatabaseTransactionError.fromUnknownError({ operation: 'rollback' }, 'Unexpected error occurred while rolling back a database transaction.'),
        }).pipe(TelemetryUtility.withTelemetrySpan('rollback_db_transaction'))
      }

      return {
        /**
         * The database transaction instance.
         */
        trx,

        /**
         * Commits the database transaction.
         */
        commit,

        /**
         * Rolls back the database transaction.
         */
        rollback,
      }
    })
  }
}
