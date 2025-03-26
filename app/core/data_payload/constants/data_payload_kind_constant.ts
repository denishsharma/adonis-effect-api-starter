export enum DataPayloadKind {
  /**
   * Data payloads are payloads that are used to store
   * generic data based on the schema.
   */
  DATA = 'data',

  /**
   * Request payloads are payloads that are used to store
   * request data based on the validator and schema.
   */
  REQUEST = 'request',
}

export interface DataPayloadKindMetadata {
  /**
   * The description of the data payload kind.
   */
  description: string;
}

export const DataPayloadKindMetadata: Record<DataPayloadKind, DataPayloadKindMetadata> = {
  [DataPayloadKind.DATA]: {
    description: 'Data payloads are payloads that are used to store generic data based on the schema.',
  },
  [DataPayloadKind.REQUEST]: {
    description: 'Request payloads are payloads that are used to store request data based on the validator and schema.',
  },
}
