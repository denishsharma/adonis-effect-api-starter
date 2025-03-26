/**
 * Unique symbol to mark the data payload.
 *
 * This is used to identify the data payload
 * and to differentiate it from other data payloads.
 */
export const DATA_PAYLOAD_MARKER: unique symbol = Symbol('@data_payload/data_payload')

/**
 * Unique symbol to mark the request payload.
 *
 * This is used to identify the request payload
 * and to differentiate it from other request payloads.
 */
export const REQUEST_PAYLOAD_MARKER: unique symbol = Symbol('@data_payload/request_payload')
