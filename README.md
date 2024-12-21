# hyperdb-helper

> Generate & build hyperdb schema definitions

Try it out:

```
npx hyperdb-helper init
npx hyperdb-helper build
```

This wil use the current working directory to create a `schemas` directory with all the necessary files.

Install:

```
npm i -D hyperdb-helper
```

Add a build script to your package.json:

```
"scripts": {
  "schema": "hyperdb-helper build"
}
```

## init your future

After running the `hyperdb-helper init` command you'll get some examples to learn from in the generated files:

- index.js - shows usage of the schemas with hyperdb
- schemas/schemas.js - shows how to create schemas, collections, and indexes

If you don't already have hyperdb and hyperschema installed you'll be asked to do so.


## the work is never done, so to do

- by default run init without all the example code, provide --examples flag
- make sure the build command isn't a leaky abstraction
- make map & trigger examples
- write help cmd text
