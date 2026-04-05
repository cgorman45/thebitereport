#!/bin/bash
# Optionally source Homebrew env if available (macOS)
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi
exec npx next dev
