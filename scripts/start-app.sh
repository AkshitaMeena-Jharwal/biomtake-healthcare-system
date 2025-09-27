#!/bin/bash

echo "🚀 Starting BioMTAKE Application"
echo "================================"

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo "🌐 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 5

echo "📱 Starting frontend application..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Application started!"
echo "📊 Backend:  http://localhost:3002 (PID: $BACKEND_PID)"
echo "📱 Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "💡 Press Ctrl+C to stop both servers"
