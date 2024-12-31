#!/bin/sh

# This is a dev tool to easily generate examples

MODULE_TYPE="$1"
EXAMPLES="$([ "$2" = "examples" ] && echo true)"

if [ -z "$MODULE_TYPE" ]; then
    echo "Error: module type required as first argument. Either commonjs or module"
    exit 1
fi

rm -rf example
mkdir example
cd example
echo '{
    "name": "example",
    "version": "1.0.0",
    "main": "index.js",
    "type": "'$MODULE_TYPE'",
    "scripts": {
        "build": "hyperdb-helper build"
    },
}' > package.json

npm install hyperdb hyperschema corestore

if [ $EXAMPLES ]; then
    node ../../bin/cli.js init --examples
    node ../../bin/cli.js build
    node index.js
else
    node ../../bin/cli.js init
    node ../../bin/cli.js build
fi
