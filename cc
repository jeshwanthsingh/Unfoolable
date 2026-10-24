#!/bin/sh
set -eu
CC_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CC_NODE=/Users/USER/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
if [ ! -x "$CC_NODE" ]; then CC_NODE=node; fi
exec "$CC_NODE" "$CC_ROOT/scripts/cc.ts" "$@"
