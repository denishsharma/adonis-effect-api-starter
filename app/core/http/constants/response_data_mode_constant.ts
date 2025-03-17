export enum ResponseDataMode {
  /**
   * Response data field contains a single object or entity.
   */
  SINGLE = 'single',

  /**
   * Response data field contains paginated data of objects
   * or entities with metadata for pagination in the meta field.
   */
  PAGINATED = 'paginated',

  /**
   * Response data field contains a list of objects or entities
   * without any metadata.
   */
  LIST = 'list',

  /**
   * Response data field contains non-structured raw data,
   * such as a string or a number.
   */
  RAW = 'raw',

  /**
   * Response data field is not present in the response.
   */
  NONE = 'none',
}

export interface ResponseDataModeMetadata {
  /**
   * A human-readable message describing the response data mode.
   */
  message: string
}

/**
 * Metadata for response data modes.
 */
export const ResponseDataModeMetadata: Record<ResponseDataMode, ResponseDataModeMetadata> = {
  [ResponseDataMode.SINGLE]: {
    message: 'Response data field contains a single object or entity.',
  },
  [ResponseDataMode.PAGINATED]: {
    message: 'Response data field contains paginated data of objects or entities with metadata for pagination in the meta field.',
  },
  [ResponseDataMode.LIST]: {
    message: 'Response data field contains a list of objects or entities without any metadata.',
  },
  [ResponseDataMode.RAW]: {
    message: 'Response data field contains non-structured raw data, such as a string or a number.',
  },
  [ResponseDataMode.NONE]: {
    message: 'Response data field is not present in the response.',
  },
}
