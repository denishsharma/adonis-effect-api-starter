import { ESLintUtils } from '@typescript-eslint/utils'

export default ESLintUtils.RuleCreator(name => name)({
  name: 'no-internals-outside-module',
  defaultOptions: [],
  meta: {
    type: 'problem',
    fixable: undefined,
    docs: {
      description: 'Disallow importing internals outside of the module',
    },
    schema: [],
    messages: {
      noInternalsOutsideModule: 'Do not import internals outside of the module',
    },
  },
  create: (context) => {
    return {
      ImportDeclaration(node) {
        const importStatement = node.source

        // match `#core/some_module/submodule/internals/..` or `#core/some_module/internals/..`
        const match = importStatement.value.match(/#(core|modules|shared)\/([^/]+)\/internals\//)
        if (!match) { return }

        const moduleType = match[1] // core or modules
        const moduleName = match[2] // some_module
        const currentFilePath = context.filename.replace(/\\/g, '/')

        // check if the current file is in the same module
        // match `modules/some_module/..` or `core/some_module/..`
        const moduleMatch = currentFilePath.includes(`/${moduleType}/${moduleName}/`)
        if (!moduleMatch) {
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
