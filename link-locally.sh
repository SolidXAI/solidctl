#!/usr/bin/env bash
set -e

echo "▶ Linking solidctl locally..."

echo "▶ Running npm i..."
npm i

echo "▶ Removing existing dist build..."
sudo rm -rf dist

echo "▶ Building solidctl..."
npm run build

echo "▶ Linking solidctl with --force..."
npm link --force

echo "✅ solidctl linked successfully. You can now use 'solidctl local-upgrade' in your projects to upgrade local dependencies."
echo "✅ If you want to move back to the npm version, run 'npm unlink solidctl --force' in this directory."
