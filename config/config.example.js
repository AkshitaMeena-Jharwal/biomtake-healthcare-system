// Configuration Example
module.exports = {
    port: 3002,
    jwtSecret: 'your-secret-key-here',
    fabric: {
        channel: 'mychannel',
        chaincode: 'biomtake',
        walletPath: './wallet'
    },
    users: [
        {
            id: 'admin1',
            email: 'admin@hospital.com',
            password: 'password', // Hashed in production
            role: 'admin'
        }
    ]
};
