#!/bin/sh
set -eu
CC_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
IFS= read -r CC_PINNED < "$CC_ROOT/.node-version"
# PATH may still point at Node 22; validate every candidate before executing TypeScript.
for CC_NODE in "$(command -v node || true)" \
  "${FNM_DIR:-$HOME/.local/share/fnm}/node-versions/v$CC_PINNED/installation/bin/node" \
  "${NVM_DIR:-$HOME/.nvm}/versions/node/v$CC_PINNED/bin/node" \
  "${FNM_DIR:-$HOME/.local/share/fnm}"/node-versions/v24.*/installation/bin/node \
  "$HOME/Library/Application Support/fnm"/node-versions/v24.*/installation/bin/node \
  "${NVM_DIR:-$HOME/.nvm}"/versions/node/v24.*/bin/node; do
  [ -n "$CC_NODE" ] && [ -x "$CC_NODE" ] || continue
  CC_VERSION=$("$CC_NODE" --version 2>/dev/null) || continue
  case "$CC_VERSION" in
    v24.*)
      CC_MINOR=${CC_VERSION#v24.}; CC_MINOR=${CC_MINOR%%.*}
      case "$CC_MINOR" in ''|*[!0-9]*) continue ;; esac
      [ "$CC_MINOR" -ge 15 ] || continue
      exec "$CC_NODE" "$CC_ROOT/scripts/cc.ts" "$@"
      ;;
  esac
done
printf '%s\n' 'Unfoolable needs Node 24.15 or newer in the Node 24 series.' 'Install Node 24, then run unfool again. Checked PATH and your fnm/nvm installations.' >&2
exit 1
