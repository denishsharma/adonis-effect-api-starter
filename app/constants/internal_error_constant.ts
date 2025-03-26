export enum InternalErrorCode {
  I_SCHEMA_PARSE_ERROR = 'I_SCHEMA_PARSE_ERROR',
  I_JSON_PARSE_ERROR = 'I_JSON_PARSE_ERROR',
  I_UNEXPECTED_RUNTIME_EXIT_RESULT_ERROR = 'I_UNEXPECTED_RUNTIME_EXIT_RESULT_ERROR',
  I_DB_TRANSACTION_ERROR = 'I_DB_TRANSACTION_ERROR',
  I_UNKNOWN_ERROR = 'I_UNKNOWN_ERROR',
  I_NO_SUCH_ELEMENT_ERROR = 'I_NO_SUCH_ELEMENT_ERROR',
}

export interface InternalErrorCodeMetadata {
  /**
   * A human-readable message describing the internal error code.
   *
   * This also serves as the default error message when an internal
   * error is thrown without a message.
   */
  message: string;
}

/**
 * Metadata for internal error codes.
 */
export const InternalErrorCodeMetadata: Record<InternalErrorCode, InternalErrorCodeMetadata> = {
  [InternalErrorCode.I_SCHEMA_PARSE_ERROR]: {
    message: 'A schema parsing error occurred, indicating an issue with the provided structure.',
  },
  [InternalErrorCode.I_JSON_PARSE_ERROR]: {
    message: 'Unexpected error occurred while parsing JSON data.',
  },
  [InternalErrorCode.I_UNEXPECTED_RUNTIME_EXIT_RESULT_ERROR]: {
    message: 'Unexpected runtime exit result returned from the application runtime and not able to be handled.',
  },
  [InternalErrorCode.I_DB_TRANSACTION_ERROR]: {
    message: 'Unexpected error occurred while performing a database transaction.',
  },
  [InternalErrorCode.I_UNKNOWN_ERROR]: {
    message: 'An unknown error that was not expected occurred and not able to be handled.',
  },
  [InternalErrorCode.I_NO_SUCH_ELEMENT_ERROR]: {
    message: 'The element that is being accessed does not exist in the data structure.',
  },
}
