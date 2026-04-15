#!/bin/bash
# Build the frontend with Gulp (requires Node <=11), then serve statically.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 11 --silent 2>/dev/null || nvm install 11 --silent
fi

# Build the frontend assets into ./build
node node_modules/.bin/gulp html
node node_modules/.bin/gulp browserify

# Switch back to a modern Node for the static server
if [ -s "$NVM_DIR/nvm.sh" ]; then
  nvm use default --silent 2>/dev/null
fi

# Serve the build directory on port 4000
node scripts/serve-build.js
