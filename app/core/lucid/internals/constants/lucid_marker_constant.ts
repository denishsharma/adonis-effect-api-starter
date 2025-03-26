/**
 * Unique symbol used to mark the retrieval strategy for a Lucid model.
 *
 * This symbol serves as an identifier for the retrieval strategy within a
 * Lucid model, enabling type checking and filtering operations. It ensures
 * that the retrieval strategy can be distinctly recognized and leveraged
 * within the application's data handling processes.
 */
export const LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER: unique symbol = Symbol('@marker/lucid/model_retrieval_strategy')
