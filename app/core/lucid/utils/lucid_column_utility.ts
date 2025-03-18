import { booleanColumn } from '#core/lucid/decorators/columns/boolean_column_decorator'
import { enumColumn } from '#core/lucid/decorators/columns/enum_column_decorator'

export namespace LucidColumnUtility {
  export namespace Decorator {
    /**
     * Define a boolean column with boolean conversion.
     *
     * This is suitable for columns that store boolean values
     * as integers (0 or 1) in the database.
     *
     * @param options The column options
     */
    export const boolean = booleanColumn

    /**
     * Define an enum/enum-like column with enum conversion.
     *
     * This is suitable for columns that store enum values
     * as strings or integers or native enum types in the database.
     *
     * @param options The column options
     */
    export const enums = enumColumn
  }
}
