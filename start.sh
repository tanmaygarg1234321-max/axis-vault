#!/bin/bash
# ==========================================
# Axis Economy Store - Startup Script
# For Pterodactyl/VPS deployment
# ==========================================

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Axis Economy Store - Startup Script              ║"
echo "╚═══════════════════════════════════════════════════════════╝"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Check if dist folder exists (built frontend)
if [ ! -d "dist" ]; then
  echo "🔨 Building frontend..."
  npm run build
fi

# Start the server
echo "🚀 Starting server on port ${PORT:-24611}..."
node server/index.js
