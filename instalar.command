#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js. Instala desde https://nodejs.org y reintenta."
  exit 1
fi
npm install --omit=dev || exit 1
node install.mjs
