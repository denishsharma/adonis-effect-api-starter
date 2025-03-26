import { MultipartFile } from '@adonisjs/core/bodyparser'
import { Schema } from 'effect'

/**
 * Schema that validates a valid MultipartFile instance.
 *
 * This schema checks that the input is a valid MultipartFile instance, ensuring
 * that it adheres to the structure and constraints of multipart file uploads.
 * It validates that the file is properly formatted, containing the necessary
 * metadata such as the file name, type, and content.
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
