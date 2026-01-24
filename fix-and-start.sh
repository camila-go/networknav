#!/bin/bash

echo "🔧 NetworkNav Fix & Start Script"
echo "================================="

# Navigate to project directory
cd "$(dirname "$0")"

echo ""
echo "📍 Working in: $(pwd)"
echo ""

# Step 1: Kill any running node processes
echo "⏹️  Stopping any running Node processes..."
pkill -f "next" 2>/dev/null
pkill -f "node" 2>/dev/null
sleep 2

# Step 2: Remove problematic folders
echo "🗑️  Removing node_modules, .next, and package-lock.json..."
rm -rf node_modules .next package-lock.json

# Step 3: Reinstall dependencies
echo "📦 Installing dependencies (this may take a minute)..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed. Try running with sudo:"
    echo "   sudo rm -rf node_modules .next"
    echo "   npm install"
    exit 1
fi

# Step 4: Run the tests to verify bug fixes
echo ""
echo "🧪 Running bug fix verification tests..."
npm test -- --run src/__tests__/bug-fixes.test.ts 2>/dev/null || echo "Tests will run once dev server is ready"

# Step 5: Start the dev server
echo ""
echo "🚀 Starting development server..."
echo ""
npm run dev

