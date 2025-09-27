import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Login Component
function Login({ onLogin }) {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await axios.post('http://localhost:3002/api/auth/login', credentials);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            onLogin(response.data.user);
        } catch (error) {
            alert('Login failed: ' + (error.response?.data?.error || error.message));
        }
        setLoading(false);
    };

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                width: '400px'
            }}>
                <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
                    🔐 BioMTAKE Login
                </h2>
                
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Email:
                        </label>
                        <input
                            type="email"
                            value={credentials.email}
                            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                fontSize: '16px'
                            }}
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                    
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Password:
                        </label>
                        <input
                            type="password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                fontSize: '16px'
                            }}
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: loading ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '16px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '5px' }}>
                    <h4>Test Accounts:</h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        <strong>Admin:</strong> admin@hospital.com / password<br/>
                        <strong>Doctor:</strong> dr.smith@hospital.com / password<br/>
                        <strong>Patient:</strong> patient.john@email.com / password
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main Dashboard Component
function Dashboard({ user, onLogout }) {
    const [devices, setDevices] = useState([]);
    const [healthRecords, setHealthRecords] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [deviceForm, setDeviceForm] = useState({ hpbm: '', pidm: '' });
    const [healthForm, setHealthForm] = useState({
        recordId: '',
        deviceHpbm: '',
        patientId: '',
        heartRate: 72,
        bloodPressure: '120/80',
        temperature: 36.6,
        oxygenLevel: 98.0,
        notes: ''
    });

    // Axios instance with auth header
    const api = axios.create({
        baseURL: 'http://localhost:3002'
    });

    api.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    const fetchDevices = async () => {
        try {
            const res = await api.get('/api/devices');
            setDevices(res.data);
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    const fetchHealthRecords = async () => {
        try {
            const res = await api.get('/api/health-records');
            setHealthRecords(res.data);
        } catch (error) {
            console.error('Error fetching health records:', error);
        }
    };

    const createDevice = async () => {
        try {
            await api.post('/api/devices', deviceForm);
            setDeviceForm({ hpbm: '', pidm: '' });
            fetchDevices();
            alert('Device registered successfully!');
        } catch (error) {
            alert('Error: ' + error.response?.data?.error || error.message);
        }
    };

    const addHealthRecord = async () => {
        try {
            await api.post('/api/health-records', healthForm);
            setHealthForm({
                recordId: '',
                deviceHpbm: '',
                patientId: '',
                heartRate: 72,
                bloodPressure: '120/80',
                temperature: 36.6,
                oxygenLevel: 98.0,
                notes: ''
            });
            fetchHealthRecords();
            alert('Health record added successfully!');
        } catch (error) {
            alert('Error: ' + error.response?.data?.error || error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
    };

    useEffect(() => {
        if (user.role === 'admin' || user.role === 'doctor') {
            fetchDevices();
        }
        fetchHealthRecords();
    }, [user.role]);

    const canManageDevices = ['admin', 'doctor'].includes(user.role);
    const canManageRecords = user.role === 'doctor';

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                padding: '15px 20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ margin: 0, color: '#333' }}>🏥 BioMTAKE Healthcare System</h1>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                        Welcome, {user.name} ({user.role})
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '8px 16px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </header>

            {/* Navigation */}
            <nav style={{
                background: 'white',
                padding: '10px 20px',
                borderBottom: '1px solid #ddd'
            }}>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    style={{
                        padding: '10px 20px',
                        marginRight: '10px',
                        background: activeTab === 'dashboard' ? '#007bff' : '#f8f9fa',
                        color: activeTab === 'dashboard' ? 'white' : 'black',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Dashboard
                </button>
                
                {canManageDevices && (
                    <button
                        onClick={() => setActiveTab('devices')}
                        style={{
                            padding: '10px 20px',
                            marginRight: '10px',
                            background: activeTab === 'devices' ? '#007bff' : '#f8f9fa',
                            color: activeTab === 'devices' ? 'white' : 'black',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        IoMT Devices ({devices.length})
                    </button>
                )}
                
                <button
                    onClick={() => setActiveTab('health')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'health' ? '#007bff' : '#f8f9fa',
                        color: activeTab === 'health' ? 'white' : 'black',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Health Records ({healthRecords.length})
                </button>
            </nav>

            {/* Main Content */}
            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div>
                        <div style={{
                            background: 'white',
                            padding: '30px',
                            borderRadius: '10px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                            marginBottom: '20px'
                        }}>
                            <h2>Welcome to BioMTAKE, {user.name}!</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '5px' }}>
                                    <h3>👤 Your Role</h3>
                                    <p><strong>{user.role.toUpperCase()}</strong></p>
                                    <p>{
                                        user.role === 'admin' ? 'Full system access' :
                                        user.role === 'doctor' ? 'Can manage devices and health records' :
                                        'View your health records'
                                    }</p>
                                </div>
                                
                                <div style={{ padding: '20px', background: '#f3e5f5', borderRadius: '5px' }}>
                                    <h3>📊 Statistics</h3>
                                    <p>Devices: {devices.length}</p>
                                    <p>Health Records: {healthRecords.length}</p>
                                </div>
                                
                                <div style={{ padding: '20px', background: '#e8f5e8', borderRadius: '5px' }}>
                                    <h3>🔐 Security</h3>
                                    <p>ASCON Encryption: ✅ Enabled</p>
                                    <p>Blockchain: ✅ Active</p>
                                    <p>Authentication: ✅ JWT</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Devices Tab */}
                {activeTab === 'devices' && canManageDevices && (
                    <div>
                        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                            <h3>Register New IoMT Device</h3>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input 
                                    placeholder="Device HPBIM" 
                                    value={deviceForm.hpbm}
                                    onChange={(e) => setDeviceForm({...deviceForm, hpbm: e.target.value})}
                                    style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minWidth: '200px' }}
                                />
                                <input 
                                    placeholder="Device PIDM" 
                                    value={deviceForm.pidm}
                                    onChange={(e) => setDeviceForm({...deviceForm, pidm: e.target.value})}
                                    style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minWidth: '200px' }}
                                />
                                <button 
                                    onClick={createDevice}
                                    style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                >
                                    Register Device
                                </button>
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: '20px', borderRadius: '10px' }}>
                            <h3>Registered IoMT Devices</h3>
                            {devices.length === 0 ? (
                                <p>No devices registered yet.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa' }}>
                                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>HPBIM</th>
                                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>PIDM</th>
                                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Registered At</th>
                                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Registered By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {devices.map((device, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{device.HPBIM}</td>
                                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{device.PIDM}</td>
                                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{device.RegisteredAt || 'N/A'}</td>
                                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{device.RegisteredBy || 'System'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Health Records Tab */}
                {activeTab === 'health' && (
                    <div>
                        {canManageRecords && (
                            <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                                <h3>🔒 Add Encrypted Patient Health Record</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    <input placeholder="Record ID" value={healthForm.recordId} onChange={(e) => setHealthForm({...healthForm, recordId: e.target.value})} style={{ padding: '8px' }} />
                                    <input placeholder="Device HPBIM" value={healthForm.deviceHpbm} onChange={(e) => setHealthForm({...healthForm, deviceHpbm: e.target.value})} style={{ padding: '8px' }} />
                                    <input placeholder="Patient ID" value={healthForm.patientId} onChange={(e) => setHealthForm({...healthForm, patientId: e.target.value})} style={{ padding: '8px' }} />
                                    <input type="number" placeholder="Heart Rate" value={healthForm.heartRate} onChange={(e) => setHealthForm({...healthForm, heartRate: e.target.value})} style={{ padding: '8px' }} />
                                    <input placeholder="Blood Pressure" value={healthForm.bloodPressure} onChange={(e) => setHealthForm({...healthForm, bloodPressure: e.target.value})} style={{ padding: '8px' }} />
                                    <input type="number" step="0.1" placeholder="Temperature" value={healthForm.temperature} onChange={(e) => setHealthForm({...healthForm, temperature: e.target.value})} style={{ padding: '8px' }} />
                                    <input type="number" step="0.1" placeholder="Oxygen Level" value={healthForm.oxygenLevel} onChange={(e) => setHealthForm({...healthForm, oxygenLevel: e.target.value})} style={{ padding: '8px' }} />
                                    <input placeholder="Notes" value={healthForm.notes} onChange={(e) => setHealthForm({...healthForm, notes: e.target.value})} style={{ padding: '8px' }} />
                                </div>
                                <button onClick={addHealthRecord} style={{ marginTop: '10px', padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                    🔒 Add Encrypted Record
                                </button>
                            </div>
                        )}

                        <div style={{ background: 'white', padding: '20px', borderRadius: '10px' }}>
                            <h3>🔓 {user.role === 'patient' ? 'Your' : 'Patient'} Health Records</h3>
                            {healthRecords.length === 0 ? (
                                <p>No health records found.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa' }}>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Record ID</th>
                                            {user.role !== 'patient' && <th style={{ padding: '8px', border: '1px solid #ddd' }}>Patient</th>}
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Heart Rate</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>BP</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Temp</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>O2</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Time</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {healthRecords.map((record, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{record.recordId}</td>
                                                {user.role !== 'patient' && <td style={{ padding: '8px', border: '1px solid #ddd' }}>{record.patientId}</td>}
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{record.heartRate} bpm</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{record.bloodPressure}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{record.temperature}°C</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{record.oxygenLevel}%</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px' }}>{new Date(record.timestamp).toLocaleString()}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                                    {record.encrypted ? '🔐' : '❌'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Main App Component
function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
    }

    if (!user) {
        return <Login onLogin={setUser} />;
    }

    return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

export default App;
