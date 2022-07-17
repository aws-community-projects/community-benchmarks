#!/bin/bash
set -euo pipefail

for DIR in src/csv2ddb src/csv2ddb/sdk3-mjs src/csv2ddb/sdk3-mjs-xray; do
    npm i --prefix=$DIR $DIR
done
