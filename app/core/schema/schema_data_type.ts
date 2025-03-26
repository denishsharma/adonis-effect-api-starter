import type { ModuleUtility } from '#types/module_type'
import * as dateTimeDataType from '#core/schema/data_types/date_time_data_type'
import * as fileDataType from '#core/schema/data_types/file_data_type'
import * as stringDataType from '#core/schema/data_types/string_data_type'

type SchemaDataType = ModuleUtility<[
  typeof dateTimeDataType,
  typeof fileDataType,
  typeof stringDataType,
]>

export const SchemaDataType = {
  ...dateTimeDataType,
  ...fileDataType,
  ...stringDataType,
} satisfies SchemaDataType as Readonly<SchemaDataType>
