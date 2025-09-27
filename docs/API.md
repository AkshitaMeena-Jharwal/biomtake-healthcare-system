# API Documentation

## Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

## Devices (Admin/Doctor only)
- `GET /api/devices` - Get all devices
- `POST /api/devices` - Register new device

## Health Records
- `GET /api/health-records` - Get records (role-based)
- `POST /api/health-records` - Add record (Doctor only)

## Test Users
- Admin: admin@hospital.com / password
- Doctor: dr.smith@hospital.com / password  
- Patient: patient.john@email.com / password
