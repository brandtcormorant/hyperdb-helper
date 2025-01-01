import * as fs from 'fs/promises'
import * as path from 'path'

import dedent from 'string-dedent'
import Hyperschema from 'hyperschema'
import HyperDB from 'hyperdb/builder/index.js'

import * as templates from './templates/basic.js'
import * as examples from './templates/examples.js'

export class HyperdbHelper {
  static defaultConfig = {
    databaseConfigDirectory: './database',
    generatedCodeDirectory: './generated',
    functionsFilepath: './functions.js',
    schemaFilepath: './schema.js',
    configFilepath: './config.js',
    projectPackageJsonFilepath: './package.json',
    package: {}
  }

  /**
   * Hyperdb Helper - A utility class for managing Hyperdb database schemas
   * @class
   * @classdesc Provides methods for initializing and building Hyperdb databases from schema files
   *
   * @property {Object} options - Configuration options merged with defaults
   * @property {Object} config - Current active configuration
   * @property {string[]} requiredDependencies - Required npm dependencies
   *
   * @example
   * const helper = new HyperdbHelper();
   * await helper.init();
   * await helper.build();
   */
  constructor(options = {}) {
    this.config = { ...HyperdbHelper.defaultConfig, ...options }
    this.requiredDependencies = ['hyperschema', 'hyperdb', 'corestore']
  }

  /**
   * Initializes a new database schema directory with required configuration files
   * @async
   * @param {string} filepath - Path where the database schema directory should be created
   * @param {Object} options - Configuration options
   * @param {boolean} [options.examples] - Whether to include example code in generated files
   * @returns {Promise<Object>} Result object
   * @returns {string[]} result.dependenciesNeeded - Array of npm package names that need to be installed
   * @throws {Error} If package.json is missing from project directory
   * @throws {Error} If schema directory already exists
   * @throws {Error} If example index.js file already exists when using examples flag
   * @example
   * const helper = new HyperdbHelper();
   * const { dependenciesNeeded } = await helper.init('./mydb', { examples: true });
   * if (dependenciesNeeded.length) {
   *   console.log('Please install:', dependenciesNeeded.join(' '));
   * }
   */
  async init(filepath, options) {
    this.config = await this.mergeConfig(filepath, options)
    this.validateConfig(this.config) // Add validation here

    if (!(await exists('./package.json'))) {
      console.log(dedent`
        Please first create a package.json file in your project directory
        and choose either "module" or "commonjs" as the "type" field

        You can create a package.json file by running:

        npm init
      `)

      throw new Error('Error: package.json not found in project directory')
    }

    await this.createDefaultFiles()
    const dependenciesNeeded = this.checkPackageDependencies()
    return { dependenciesNeeded }
  }

  /**
   * Builds a database from schema files in the configured directory
   * @async
   * @param {string} filepath - Path to the database directory
   * @param {Object} options - Configuration options
   * @param {boolean} [options.examples] - Whether to include example code
   * @throws {Error} If schema directory does not exist
   * @throws {Error} If schema files cannot be loaded or processed
   * @returns {Promise<void>}
   * @example
   * const helper = new HyperdbHelper();
   * await helper.build('./mydb', { examples: true });
   * // Generated database code will be in ./mydb/generated/
   */
  async build(filepath, options) {
    this.config = await this.mergeConfig(filepath, options)

    if (!(await exists(this.config.databaseConfigDirectory))) {
      throw new Error(dedent`
        Error: Database directory not found at ${this.config.databaseConfigDirectory}
        Run 'hyperdb-helper init' to create a new schema directory
      `)
    }

    const schemaDefinitions = await this.getSchemaDefinitions(
      this.config.schemaFilepath
    )
    await this.buildSchema(schemaDefinitions)
  }

  /**
   * Cleans up generated files and resources
   * @async
   * @method
   * @description Removes the generated code directory and any temporary files created during the build process
   * @throws {Error} If cleanup operation fails
   * @returns {Promise<void>}
   * @example
   * const helper = new HyperdbHelper();
   * await helper.init();
   * await helper.build();
   * // When done with the helper
   * await helper.cleanup();
   */
  async cleanup() {
    try {
      // Cleanup temporary files/resources
      await fs.rm(this.config.generatedCodeDirectory, {
        recursive: true,
        force: true
      })
    } catch (error) {
      this.logger.warn('Cleanup failed:', error)
    }
  }

  validateConfig(config) {
    const required = [
      // Core directories
      'databaseConfigDirectory', // Where the schema configuration lives
      'generatedCodeDirectory', // Where generated code will be output

      // Essential file paths for schema definition
      'functionsFilepath', // Custom functions for the schema
      'schemaFilepath', // The main schema definition file
      'configFilepath', // Configuration file path

      // Package.json related paths
      'projectPackageJsonFilepath', // Project's package.json
      'databaseConfigJsonFilepath', // Database config package.json
      'generatedPackageJsonFilepath', // Generated code package.json

      // Generated code directories
      'hyperschemaDirectory', // Where schema definitions are generated
      'hyperdbDirectory', // Where database code is generated

      // Module configuration
      'moduleType' // 'commonjs' or 'module'
    ]

    const missing = required.filter((field) => !config[field])

    if (missing.length > 0) {
      throw new Error(dedent`
        Missing required config fields:
        ${missing.map((field) => `  - ${field}`).join('\n')}
      `)
    }
  }

  async mergeConfig(filepath, options) {
    const databaseConfigDirectory = getDatabaseConfigDirectory(filepath)
    const configFilepath = path.join(databaseConfigDirectory, 'config.js')

    let userConfig = {}
    try {
      userConfig = await getConfig(configFilepath)
    } catch (error) {}

    const config = {
      ...HyperdbHelper.defaultConfig,
      ...userConfig,
      databaseConfigDirectory
    }

    config.examples = options.examples

    config.functionsFilepath = getFilepathFromConfig(
      config,
      'functionsFilepath',
      './functions.js'
    )
    config.schemaFilepath = getFilepathFromConfig(
      config,
      'schemaFilepath',
      './schema.js'
    )
    config.configFilepath = getFilepathFromConfig(
      config,
      'configFilepath',
      './config.js'
    )
    config.projectPackageJsonFilepath = getFilepathFromConfig(
      config,
      'projectPackageJsonFilepath',
      './package.json'
    )
    config.databaseConfigJsonFilepath = path.join(
      config.databaseConfigDirectory,
      'package.json'
    )
    config.generatedCodeDirectory = getFilepathFromConfig(
      config,
      'generatedCodeDirectory',
      './generated'
    )
    config.generatedPackageJsonFilepath = path.join(
      config.generatedCodeDirectory,
      'package.json'
    )
    config.hyperschemaDirectory = path.join(
      config.generatedCodeDirectory,
      'schemas'
    )
    config.hyperdbDirectory = path.join(
      config.generatedCodeDirectory,
      'database'
    )

    try {
      config.package = await getPackageJson(process.cwd())
    } catch (error) {}

    if (config.package) {
      config.moduleType = config.package.type || 'commonjs'
    }

    return config
  }

  async getConfig(configFilepath) {
    const module = await import(configFilepath)
    return { ...module.default }
  }

  async createDefaultFiles() {
    if (await exists(this.config.databaseConfigDirectory)) {
      throw new Error(
        `Error: Schema directory already exists at ${this.config.databaseConfigDirectory}`
      )
    }

    const exampleIndexFilepath = path.join(
      path.dirname(this.config.databaseConfigDirectory),
      'index.js'
    )

    if (this.config.examples) {
      if (await exists(exampleIndexFilepath)) {
        throw new Error(
          `Error: index.js file already exists at ${exampleIndexFilepath}`
        )
      }
    }

    await fs.mkdir(this.config.databaseConfigDirectory, {
      recursive: true
    })

    await this.createConfigFile()
    await this.createFunctionsFile()
    await this.createSchemaFile()
    await fs.mkdir(this.config.generatedCodeDirectory)
    await this.createDatabaseConfigPackageJsonFile()
    await this.createGeneratedPackageJsonFile()

    if (this.config.examples) {
      await this.createExampleIndexFile(exampleIndexFilepath)
    }
  }

  async createConfigFile() {
    await fs.writeFile(
      this.config.configFilepath,
      templates.configFileTemplate(this.config.moduleType)
    )
  }

  async createFunctionsFile() {
    const template = this.config.examples
      ? examples.functionFileTemplate()
      : templates.functionFileTemplate()

    await fs.writeFile(this.config.functionsFilepath, template)
  }

  async createSchemaFile() {
    const content = this.config.examples
      ? examples.schemaFileTemplate()
      : templates.schemaFileTemplate()

    await fs.writeFile(this.config.schemaFilepath, content)
  }

  async createDatabaseConfigPackageJsonFile() {
    const mainIndex = path.join(
      this.config.databaseConfigDirectory,
      'package.json'
    )

    const content = templates.packageJsonTemplate({
      main: mainIndex,
      type: 'module'
    })

    await fs.writeFile(this.config.databaseConfigJsonFilepath, content)
  }

  async createGeneratedPackageJsonFile() {
    const mainIndex = path.join(this.config.hyperdbDirectory, 'package.json')

    const content = templates.packageJsonTemplate({
      main: mainIndex,
      type: 'commonjs'
    })

    await fs.writeFile(this.config.generatedPackageJsonFilepath, content)
  }

  async createExampleIndexFile(indexFilepath) {
    const definitionsFilepath = path.join(
      this.config.hyperdbDirectory,
      'index.js'
    )
    const projectDirectory = path.dirname(this.config.databaseConfigDirectory)
    const relativePath = path.relative(projectDirectory, definitionsFilepath)
    console.log('this.config.moduleType', this.config.moduleType)
    const content = examples.exampleIndexFileTemplate({
      relativePath,
      moduleType: this.config.moduleType
    })
    await fs.writeFile(indexFilepath, content)
  }

  checkPackageDependencies() {
    if (!this.config.package) {
      return this.requiredDependencies
    }

    const dependencies = this.config.package.dependencies || {}

    const toInstall = []
    for (const dependency of this.requiredDependencies) {
      if (!dependencies[dependency]) {
        toInstall.push(dependency)
      }
    }

    return toInstall
  }

  async getSchemaDefinitions(schemaFilepath) {
    const module = await import(schemaFilepath)
    return { ...module }
  }

  async buildSchema(schemaModule) {
    const hyperschema = Hyperschema.from(this.config.hyperschemaDirectory)
    schemaModule.createSchema(hyperschema)
    Hyperschema.toDisk(hyperschema)

    const hyperdb = HyperDB.from(
      this.config.hyperschemaDirectory,
      this.config.hyperdbDirectory
    )
    schemaModule.createDatabase(hyperdb)
    HyperDB.toDisk(hyperdb)
  }
}

async function exists(filepath) {
  try {
    await fs.access(filepath)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}

function getDatabaseConfigDirectory(databaseFilepathArgument = './database') {
  if (path.isAbsolute(databaseFilepathArgument)) {
    return databaseFilepathArgument
  }
  return path.join(process.cwd(), databaseFilepathArgument)
}

function getFilepathFromConfig(config, configProperty, defaultFilepath) {
  const filepath = config[configProperty] || defaultFilepath
  if (path.isAbsolute(filepath)) {
    return filepath
  }
  return path.join(config.databaseConfigDirectory, filepath)
}

async function getPackageJson(dir = process.cwd()) {
  const packageJsonFilepath = path.join(dir, 'package.json')

  if (!(await exists(packageJsonFilepath))) {
    return
  }

  const file = await fs.readFile(packageJsonFilepath, 'utf8')
  return JSON.parse(file)
}

async function getConfig(configFilepath) {
  const module = await import(configFilepath)
  return { ...module.default }
}
