const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const channelName = 'mychannel';
const chaincodeName = 'biomtake';
const walletPath = path.join(__dirname, 'wallet');
const JWT_SECRET = 'bioMTAKE_jwt_secret_2024';

// In-memory user session store (in production, use Redis)
const userSessions = new Map();

// Mock user database (in production, use proper database)
const users = [
    {
        id: 'admin1',
        email: 'admin@hospital.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        name: 'System Administrator',
        role: 'admin',
        hospital: 'General Hospital'
    },
    {
        id: 'doctor1',
        email: 'dr.smith@hospital.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        name: 'Dr. John Smith',
        role: 'doctor',
        specialization: 'Cardiology',
        hospital: 'General Hospital'
    },
    {
        id: 'patient1',
        email: 'patient.john@email.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        name: 'John Doe',
        role: 'patient',
        age: 45,
        condition: 'Hypertension'
    }
];

function buildCCP() {
    const ccpPath = '/home/enovoakshu/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
    const fileExists = fs.existsSync(ccpPath);
    if (!fileExists) {
        throw new Error(`Fabric connection profile not found: ${ccpPath}`);
    }
    const contents = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(contents);
    return ccp;
}

async function submitTransaction(fcn, ...args) {
    const ccp = buildCCP();
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const identity = await wallet.get('admin');
    if (!identity) {
        throw new Error('Admin identity not found in wallet.');
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    const result = await contract.submitTransaction(fcn, ...args);
    gateway.disconnect();
    
    return result.toString();
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Role-based authorization middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password (in production, use proper bcrypt comparison)
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role, 
                name: user.name 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Store session
        userSessions.set(user.id, {
            userId: user.id,
            lastLogin: new Date().toISOString(),
            token: token
        });

        res.json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                ...user
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
    userSessions.delete(req.user.id);
    res.json({ message: 'Logout successful' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// User Management Routes
app.post('/api/users/register', async (req, res) => {
    try {
        const { userId, role, name, email } = req.body;

        await submitTransaction('RegisterUser', userId, role, name, email);
        
        res.json({ message: 'User registered successfully on blockchain' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected Device Routes
app.get('/api/devices', authenticateToken, requireRole(['admin', 'doctor']), async (req, res) => {
    try {
        const result = await submitTransaction('GetAllAssets');
        const assets = JSON.parse(result);
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: `Blockchain error: ${error.message}` });
    }
});

app.post('/api/devices', authenticateToken, requireRole(['admin', 'doctor']), async (req, res) => {
    try {
        const { hpbm, pidm } = req.body;
        const registeredBy = req.user.id; // Get user ID from token

        await submitTransaction('CreateAsset', hpbm, pidm, registeredBy);
        res.json({ message: 'Device registered successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected Health Record Routes
app.post('/api/health-records', authenticateToken, requireRole(['doctor']), async (req, res) => {
    try {
        const { 
            recordId,
            deviceHpbm,
            patientId,
            heartRate,
            bloodPressure,
            temperature,
            oxygenLevel,
            notes 
        } = req.body;

        const doctorId = req.user.id; // Get doctor ID from token

        await submitTransaction(
            'AddHealthRecord', 
            recordId,
            deviceHpbm,
            patientId,
            doctorId,
            heartRate.toString(),
            bloodPressure,
            temperature.toString(),
            oxygenLevel.toString(),
            notes || ""
        );
        
        res.json({ message: 'Health record added successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health-records', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'patient') {
            // Patients can only see their own records
            const result = await submitTransaction('GetHealthRecordsByPatient', req.user.id);
            const records = JSON.parse(result);
            res.json(records);
        } else {
            // Doctors and admins can see all records
            const result = await submitTransaction('GetAllHealthRecords');
            const records = JSON.parse(result);
            res.json(records);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health-records/patient/:patientId', authenticateToken, requireRole(['doctor', 'admin']), async (req, res) => {
    try {
        const { patientId } = req.params;
        const result = await submitTransaction('GetHealthRecordsByPatient', patientId);
        const records = JSON.parse(result);
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public info endpoint
app.get('/api/system-info', (req, res) => {
    res.json({
        system: 'BioMTAKE Healthcare System',
        version: '2.0.0',
        features: [
            'Blockchain-based medical records',
            'ASCON encrypted health data',
            'Role-based access control',
            'User authentication',
            'Real-time data access'
        ],
        authentication: 'JWT Token based'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'BioMTAKE Healthcare System - Authentication Enabled',
        endpoints: {
            auth: '/api/auth/*',
            devices: '/api/devices',
            healthRecords: '/api/health-records',
            users: '/api/users'
        }
    });
});

app.listen(3002, () => {
    console.log('🚀 Backend running on port 3002 - Authentication Enabled');
    console.log('🔐 Authentication System Active');
    console.log('👥 Available test users:');
    console.log('   Admin: admin@hospital.com / password');
    console.log('   Doctor: dr.smith@hospital.com / password');
    console.log('   Patient: patient.john@email.com / password');
    console.log('💡 Use JWT tokens for authenticated requests');
});
