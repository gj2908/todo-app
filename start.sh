#!/bin/bash

# MyTodo App - Quick Start Script

echo "🚀 Starting MyTodo App..."
echo "================================"

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
  echo "❌ Please run this script from the project root directory"
  exit 1
fi

# Start backend
echo "📦 Starting Backend Server..."
cd backend
npm install > /dev/null 2>&1
echo "Backend dependencies installed"

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "⚠️  Creating .env file for backend..."
  echo "MONGO_URI=mongodb://localhost:27017/todo-app" > .env
  echo "JWT_SECRET=your_secret_key_change_this_in_production" >> .env
  echo "PORT=6002" >> .env
  echo "✅ Created backend/.env - Update MongoDB URI if needed"
fi

# Start backend in background
node server.js &
BACKEND_PID=$!
echo "✅ Backend running on http://localhost:6002 (PID: $BACKEND_PID)"

cd ..

# Start frontend
echo ""
echo "⚛️  Starting Frontend..."
cd frontend
npm install > /dev/null 2>&1
echo "Frontend dependencies installed"
echo "✅ Starting React development server..."

# Start frontend
npm start

# Wait for user interrupt
wait $BACKEND_PID
