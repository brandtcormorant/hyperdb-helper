import dedent from 'string-dedent'

export const configFileTemplate = () => {
  return dedent`
    export const config = {
      schemaFilepath: './schema.js',
      functionsFilepath: './functions.js',
      generatedDirectory: './generated',
    }
  `
}

export const schemaFileTemplate = (content = {}) => {
  return dedent`
    export function createSchema (hyperschema) {
      const schema = hyperschema.namespace('example')

        ${content.schema || ''}

      return hyperschema
    }

    export function createDatabase (hyperdb) {
      const database = hyperdb.namespace('example')

        ${content.database || ''}

      return database
    }
  `
}

export const functionFileTemplate = (moduleType) => {
  return dedent`
    // Export map and trigger functions
  `
}
