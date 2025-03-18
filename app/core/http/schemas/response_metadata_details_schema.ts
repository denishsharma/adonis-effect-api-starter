import { Schema } from 'effect'

/**
 * Schema to represent the default response metadata details.
 *
 * These details are common and will be present in
 * all structured response types.
 */
export const DefaultResponseMetadataDetails = Schema.Struct({
  request_id: Schema.String,
  timestamp: Schema.DateFromString.pipe(Schema.validDate()),
})
