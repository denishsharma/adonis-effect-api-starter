import { ESLintUtils } from '@typescript-eslint/utils'

export default ESLintUtils.RuleCreator(name => name)({
  name: 'no-utils-import-inside-same-module',
  defaultOptions: [],
  meta: {
    type: 'problem',
    fixable: undefined,
    docs: {
      description: 'Disallow importing from utils inside the same module',
    },
    schema: [],
    messages: {
      noInternalsOutsideModule: 'Do not import from utils inside the same module. Instead import from internals of the same module',
    },
  },
  create: (context) => {
    return {
      ImportDeclaration(node) {
        const importStatement = node.source

        // match `#core/some_module/submodule/utils/..` or `#core/some_module/utils/..`
        const match = importStatement.value.match(/#(core|modules|shared)\/([^/]+)\/utils\//)
        if (!match) { return }

        const moduleType = match[1] // core or modules
        const moduleName = match[2] // some_module
        const currentFilePath = context.filename.replace(/\\/g, '/')

        // check if the current file is in the same module
        // match `modules/some_module/..` or `core/some_module/..`
        const moduleMatch = currentFilePath.includes(`/${moduleType}/${moduleName}/`)
        if (moduleMatch) {
          context.report({
            node,
            messageId: 'noInternalsOutsideModule',
            data: { importPath: importStatement.value },
          })
        }
      },
    }
  },
},
)
