const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function setupWallet() {
    try {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // Check if admin already exists
        const existing = await wallet.get('admin');
        if (existing) {
            console.log('✅ Admin identity already exists in wallet');
            return;
        }
        
        // Read the actual certificate and private key files
        const certPath = '/home/enovoakshu/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem';
        const keyDir = '/home/enovoakshu/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/';
        
        // Get the private key file (it's the only file in keystore)
        const keyFiles = fs.readdirSync(keyDir);
        const keyFile = keyFiles[0]; // There should be only one file
        const keyPath = path.join(keyDir, keyFile);
        
        const certificate = fs.readFileSync(certPath).toString();
        const privateKey = fs.readFileSync(keyPath).toString();
        
        console.log('📄 Certificate file:', certPath);
        console.log('🔑 Private key file:', keyPath);
        
        // Create identity
        const identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey
            },
            mspId: 'Org1MSP',
            type: 'X.509'
        };
        
        await wallet.put('admin', identity);
        console.log('✅ Admin identity added to wallet successfully');
        
        // Verify
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('✅ Wallet setup complete! Ready for blockchain connection.');
        }
        
    } catch (error) {
        console.error('❌ Error setting up wallet:', error);
    }
}

setupWallet();
