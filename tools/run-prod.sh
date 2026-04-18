#!/bin/bash
# IPTVCloud.app Production Builder & Runner for Linux
# Usage: bash tools/run-prod.sh

echo "Building Production Bundle..."
npm run build

echo "Starting Production Server..."
npm run start
