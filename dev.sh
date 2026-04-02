#!/bin/bash
eval "$(/opt/homebrew/bin/brew shellenv)"
exec node node_modules/next/dist/bin/next dev
