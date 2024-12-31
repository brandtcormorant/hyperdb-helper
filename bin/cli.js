#!/usr/bin/env node
import { HyperdbHelper } from '../index.js'
import mri from 'mri'
import dedent from 'string-dedent'

const flags = mri(process.argv.slice(2), {
  alias: {
    examples: 'e',
    help: 'h'
  },
  default: {
    examples: false
  }
})

const args = flags._
const cmd = args.shift()

if (!cmd || cmd === 'help' || flags.help) {
  console.log(dedent`
    # hyperdb-helper

    Generate and build Hyperdb databases from schema files

    Usage:
      hyperdb-helper <command> [options]

    Commands:
      init [dir]     Initialize database schema files (default: ./database)
      build [dir]    Build database from schema files (default: ./database)
      help           Show this help

    Options:
      -e, --examples Use with init subcommand to include example code
      -h, --help     Show this help
  `)
  process.exit(0)
}

const helper = new HyperdbHelper()
const filepath = args.shift()

switch (cmd) {
  case 'init': {
    const { dependenciesNeeded } = await helper.init(filepath, flags)
    if (dependenciesNeeded.length) {
      console.log(dedent`
        Please install the required dependencies using npm:

        npm install ${dependenciesNeeded.join(' ')}
      `)
    }
    break
  }
  case 'build': {
    await helper.build(filepath, flags)
    break
  }
}
