#!/bin/bash
# IPTVCloud.app Development Runner for Linux
# Usage: bash tools/run-dev.sh

echo "Initializing Development Environment..."
npm run db:dev
npm run dev
