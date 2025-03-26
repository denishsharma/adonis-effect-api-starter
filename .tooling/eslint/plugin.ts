import noInternalsOutsideModule from './rules/no_internals_outside_module.js'
import noUtilsImportInsideSameModule from './rules/no_utils_import_inside_same_module.js'

const plugin = {
  rules: {
    'no-internals-outside-module': noInternalsOutsideModule,
    'no-utils-import-inside-same-module': noUtilsImportInsideSameModule,
  },
}

export default plugin
