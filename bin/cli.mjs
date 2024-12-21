#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'

import mri from 'mri'
import dedent from 'dedent'
import Hyperschema from 'hyperschema'
import HyperDB from 'hyperdb/builder/index.js'

import * as templates from './templates.mjs'

const defaultConfig = {
  schemaConfigDirectory: './schemas',
  generatedDirectory: './generated',
  generatedSchemaDirectory: './generated/schema',
  generatedDatabaseDirectory: './generated/database',
  functionsFilepath: './functions.js',
  schemasFilepath: './schemas.js',
  configFilepath: './config.js',
  packageJsonFilepath: './package.json',
  package: {}
}

const flags = mri(process.argv.slice(2), {
  alias: {
    help: 'h'
  },
  default: {

  }
})

const args = flags._
const cmd = args.shift()

if (!cmd || cmd === 'help' || flags.help) {
  const message = dedent``
  console.log(message)
}

const config = await mergeConfig(args.shift())

switch (cmd) {
  case 'init': {
    await createDefaultFiles(config)
    const toInstall = checkPackageDependencies(config.package, ['hyperschema', 'hyperdb', 'corestore'])

    if (toInstall.length) {
      console.log(dedent`
        Please install the following dependencies:

        npm install ${toInstall.join(' ')}
      `)
    }

    break
  }

  case 'build': {
    const schemasModule = await getSchemasModule(config.schemasFilepath)
    await build(config, schemasModule)
    break
  }
}

async function mergeConfig (filepath) {
  // first and only arg is the filepath to the schemas directory
  // it defaults to ./schemas
  const schemaConfigDirectory = getSchemaConfigDirectory(filepath)

  // import the config.js file from the schemas directory
  const configFilepath = path.join(schemaConfigDirectory, 'config.js')

  let userConfig = {}
  try {
    userConfig = await getConfig(configFilepath)
  } catch (error) {
    // console.error('Error loading config file:', error)
    // process.exit(1)
  }

  const config = {
    ...defaultConfig,
    ...userConfig,
    schemaConfigDirectory
  }

  // Derive filepaths from schema config directory
  config.functionsFilepath = getFilepathFromConfig(config, 'functionsFilepath', './functions.js')
  config.schemasFilepath = getFilepathFromConfig(config, 'schemasFilepath', './schemas.js')
  config.configFilepath = getFilepathFromConfig(config, 'configFilepath', './config.js')
  config.packageJsonFilepath = getFilepathFromConfig(config, 'packageJsonFilepath', './package.json')
  config.generatedDirectory = getFilepathFromConfig(config, 'generatedDirectory', './generated')
  config.generatedSchemaDirectory = getFilepathFromConfig(config, 'generatedSchemaDirectory', 'schema')
  config.generatedDatabaseDirectory = getFilepathFromConfig(config, 'generatedDatabaseDirectory', 'database')

  try {
    config.package = await getPackageJson(process.cwd())
  } catch (error) {}

  return config
}

async function getConfig (configFilepath) {
  const module = await import(configFilepath)
  return { ...module.default }
}

function getSchemaConfigDirectory (schemasFilepathArgument = './schemas') {
  let schemaConfigDirectory

  if (path.isAbsolute(schemasFilepathArgument)) {
    schemaConfigDirectory = schemasFilepathArgument
  } else {
    const cwd = process.cwd()
    schemaConfigDirectory = path.join(cwd, schemasFilepathArgument)
  }

  return schemaConfigDirectory
}

function getFilepathFromConfig (config, configProperty, defaultFilepath) {
  const filepath = config[configProperty] || defaultFilepath

  if (path.isAbsolute(filepath)) {
    return filepath
  }

  return path.join(config.schemaConfigDirectory, filepath)
}

async function getPackageJson (dir = process.cwd()) {
  const packageJsonFilepath = path.join(dir, 'package.json')
  const file = await fs.readFile(packageJsonFilepath, 'utf8')
  return JSON.parse(file)
}

async function createDefaultFiles (config) {
  try {
    await fs.access(config.schemaConfigDirectory)
    console.error(`Error: Schema directory already exists at ${config.schemaConfigDirectory}`)
    process.exit(1)
  } catch (error) {
    // Directory doesn't exist, continue
  }

  await fs.mkdir(config.schemaConfigDirectory, { recursive: true })
  await createConfigFile(config)
  await createFunctionsFile(config)
  await createSchemasFile(config)
  await createIndexFile(config)
}

async function createConfigFile (config) {
  await fs.writeFile(config.configFilepath, templates.configFileTemplate)
}

async function createFunctionsFile (config) {
  await fs.writeFile(config.functionsFilepath, templates.functionsFileTemplate)
}

async function createSchemasFile (config) {
  await fs.writeFile(config.schemasFilepath, templates.schemaFileTemplate)
}

async function createIndexFile (config) {
  const indexFilepath = path.join(path.dirname(config.schemaConfigDirectory), 'index.js')

  try {
    await fs.access(indexFilepath)
    console.error(`Error: Index file already exists at ${indexFilepath}`)
    process.exit(1)
  } catch (error) {
    // Index file doesn't exist, continue
  }

  await fs.writeFile(indexFilepath, templates.indexFileTemplate)
}

function checkPackageDependencies (packageJson, requiredDependencies = []) {
  if (!packageJson) {
    return requiredDependencies
  }

  const dependencies = packageJson.dependencies || {}

  const toInstall = []
  for (const dependency of requiredDependencies) {
    if (!dependencies[dependency]) {
      toInstall.push(dependency)
    }
  }

  return toInstall
}


async function getSchemasModule (configFilepath) {
  const module = await import(config.schemasFilepath)
  return { ...module }
}

async function build (config, schemasModule) {
  // TODO: consider passing context to schemasModule functions

  const hyperschema = Hyperschema.from(config.generatedSchemaDirectory)
  schemasModule.createSchemas(hyperschema)
  Hyperschema.toDisk(hyperschema)

  const hyperdb = HyperDB.from(config.generatedSchemaDirectory, config.generatedDatabaseDirectory)
  schemasModule.createDatabase(hyperdb)
  HyperDB.toDisk(hyperdb)
}
