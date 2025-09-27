#!/bin/bash

echo "🔗 Deploying BioMTAKE Chaincode"
echo "================================"

# Check if fabric-samples exists
if [ ! -d "fabric-samples" ]; then
    echo "❌ fabric-samples not found. Run: ./scripts/setup.sh"
    exit 1
fi

cd fabric-samples/test-network

echo "🌐 Starting Fabric network..."
./network.sh down
./network.sh up createChannel -c mychannel -ca

echo "📦 Deploying chaincode..."
./network.sh deployCC -ccn biomtake -ccp ../../chaincode -ccl go

echo "✅ Chaincode deployed successfully!"
echo ""
echo "🎯 Next: Start the application:"
echo "Backend:  cd backend && npm install && npm start"
echo "Frontend: cd frontend && npm install && npm start"
