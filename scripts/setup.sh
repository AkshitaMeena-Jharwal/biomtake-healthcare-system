#!/bin/bash

echo "🚀 BioMTAKE System Setup"
echo "========================"

# Check if running on Ubuntu
if [[ ! -f /etc/os-release ]]; then
    echo "❌ This script is designed for Ubuntu systems"
    exit 1
fi

echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "📦 Installing prerequisites..."
sudo apt install -y curl git docker.io docker-compose golang-go nodejs npm

echo "🐳 Configuring Docker..."
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker $USER

echo "⛓️ Installing Hyperledger Fabric..."
curl -sSL https://bit.ly/2ysbOFE | bash -s

echo "✅ Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Log out and log back in or run: newgrp docker"
echo "2. Run: ./scripts/deploy-chaincode.sh"
echo "3. Install backend: cd backend && npm install"
echo "4. Install frontend: cd frontend && npm install"
