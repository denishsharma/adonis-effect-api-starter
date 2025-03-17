import { Schema } from 'effect'

export const DefaultResponseMetadataDetails = Schema.Struct({
  request_id: Schema.String,
  timestamp: Schema.DateFromString.pipe(Schema.validDate()),
})
