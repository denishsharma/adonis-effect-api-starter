import { MultipartFile } from '@adonisjs/core/bodyparser'
import { Schema } from 'effect'

export namespace FileSchemaDataType {
  /**
   * Schema that validates a valid MultipartFile instance.
   *
   * @category Schema Data Type
   */
  export const MultipartFileFromSelf = Schema.declare(
    (input): input is MultipartFile => input instanceof MultipartFile && input.isMultipartFile,
    {
      identifier: 'MultipartFileFromSelf',
      description: 'MultipartFile instance from @adonisjs/core/bodyparser.',
      jsonSchema: {
        type: 'object',
        properties: {
          fieldName: { type: 'string' },
          clientName: { type: 'string' },
          type: { type: 'string' },
          subtype: { type: 'string' },
          extname: { type: 'string' },
          size: { type: 'number' },
          filePath: { type: 'string' },
          fileName: { type: 'string' },
          tmpPath: { type: 'string' },
          meta: { type: 'object' },
        },
        required: [
          'fieldName',
          'clientName',
          'size',
        ],
      },
    },
  )
}
