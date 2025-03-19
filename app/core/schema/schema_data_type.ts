import { DateTimeSchemaDataType } from '#core/schema/data_types/date_time_data_type'
import { FileSchemaDataType } from '#core/schema/data_types/file_data_type'
import { IdentifierSchemaDataType } from '#core/schema/data_types/identifier_data_type'
import { StringSchemaDataType } from '#core/schema/data_types/string_schema_data_type'

export namespace SchemaDataType {
  export const String = StringSchemaDataType
  export const DateTime = DateTimeSchemaDataType
  export const File = FileSchemaDataType
  export const Identifier = IdentifierSchemaDataType
}
