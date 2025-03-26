import type { IsolationLevels } from '@adonisjs/lucid/types/database'
import DatabaseTransactionError from '#core/db/errors/database_transaction_error'
import { withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import db from '@adonisjs/lucid/services/db'
import { Effect, Exit } from 'effect'

/**
 * The options to create a database transaction.
 */
export interface DatabaseTransactionOptions {
  isolationLevel?: IsolationLevels;
}

/**
 * Initiates a new database transaction, allowing multiple operations
 * to be executed atomically.
 *
 * - Ensures all operations within the transaction either complete
 *   successfully or are fully rolled back on failure.
 * - Provides fine-grained control over transaction behavior through options.
 *
 * @param options - Configuration options for the transaction.
 */

export function createDatabaseTransaction(options?: DatabaseTransactionOptions) {
  return Effect.gen(function* () {
    const trx = yield* Effect.tryPromise({
      try: async () => await db.transaction(options),
      catch: DatabaseTransactionError.fromUnknownError({ operation: 'create' }, 'Unexpected error occurred while creating a new database transaction.'),
    })

    /**
     * Add finalizer to commit or rollback the transaction
     * based on the exit status of the effect.
     */
    yield* Effect.addFinalizer(exit => exit.pipe(
      Exit.matchEffect({
        onFailure: () => Effect.gen(function* () {
          yield* Effect.logWarning('Rolling back transaction due to failure.')
          yield* Effect.annotateCurrentSpan('operation', 'rollback')
          return yield* Effect.tryPromise(async () => await trx.rollback())
        }).pipe(Effect.ignore),
        onSuccess: () => Effect.gen(function* () {
          yield* Effect.annotateCurrentSpan('operation', 'commit')
          return yield* Effect.tryPromise(async () => await trx.commit())
        }).pipe(Effect.ignore),
      }),
    ))

    function commit() {
      return Effect.tryPromise({
        try: async () => await trx.commit(),
        catch: DatabaseTransactionError.fromUnknownError({ operation: 'commit' }, 'Unexpected error occurred while committing a database transaction.'),
      }).pipe(withTelemetrySpan('commit_db_transaction'))
    }

    function rollback() {
      return Effect.tryPromise({
        try: async () => await trx.rollback(),
        catch: DatabaseTransactionError.fromUnknownError({ operation: 'rollback' }, 'Unexpected error occurred while rolling back a database transaction.'),
      }).pipe(withTelemetrySpan('rollback_db_transaction'))
    }

    return {
      /**
       * The active database transaction instance.
       * This should be used to perform queries within the transaction context.
       */
      trx,

      /**
       * Commits the transaction, persisting all operations performed within it.
       * Call this when all queries have executed successfully.
       */
      commit,

      /**
       * Rolls back the transaction, undoing all operations performed within it.
       * This should be used when an error occurs or if the operations need to be reverted.
       */
      rollback,
    }
  })
}
