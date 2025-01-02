# hyperdb-helper

> Generate & build [hyperdb](https://github.com/holepunchto/hyperdb) schema definitions

## Try it out real good

Inside your current working directory this create a `schemas` directory with all the necessary files and an example `index.js` file showing Hyperdb usage with the provided schemas.

```
// Create the files!
npx hyperdb-helper init

// Install the dependencies!
npm install hyperdb hyperschema corestore

// Build the schema definitions!
npx hyperdb-helper build

// Run the example code!
node index.js
```

## Make it official

Install as a dev dependency:

```
npm i -D hyperdb-helper
```

Remember to install these dependencies if you haven't already:

```
npm i hyperdb hyperschema corestore
```

Add a build script to your package.json:

```
"scripts": {
  "schema": "hyperdb-helper build"
}
```

## To init your future

After running the `hyperdb-helper init` command you'll get some examples to learn from in the generated files:

- index.js - shows usage of the schemas with hyperdb
- schemas/schemas.js - shows how to create schemas, collections, and indexes

If you don't already have hyperdb and hyperschema installed you'll be asked to do so.

## JavaScript API

There's also a very simple JavaScript API:

```js
import { HyperdbHelper } from 'hyperdb-helper'

const helper = new HyperdbHelper()
await helper.init()
await helper.build()
await helper.cleanup()
```

## License

Apache-2.0
