#!/bin/sh
# Compile/test the backend inside a golang:1.23 container without touching the host Go.
# Usage: ./gobuild.sh [go subcommand...]   (default: build ./...)
set -e
cd "$(dirname "$0")"
mkdir -p /home/homenet/.cache/kamus-gomod /home/homenet/.cache/kamus-gobuild
ARGS="$*"
[ -z "$ARGS" ] && ARGS="build ./..."
exec docker run --rm \
  -v "$PWD":/app -w /app \
  -v /home/homenet/.cache/kamus-gomod:/go/pkg/mod \
  -v /home/homenet/.cache/kamus-gobuild:/root/.cache/go-build \
  golang:1.23 \
  go $ARGS
