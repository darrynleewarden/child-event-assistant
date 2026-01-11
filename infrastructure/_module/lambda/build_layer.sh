#!/bin/bash
set -e

echo "Building Lambda Layer..."

# Create layer directory structure
rm -rf nodejs
mkdir -p nodejs

# Copy package.json
cp package.json nodejs/

# Install dependencies
cd nodejs
npm install --production
cd ..

# Create zip file
rm -f layer.zip
zip -r layer.zip nodejs

echo "Lambda layer built successfully: layer.zip"
