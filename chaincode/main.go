package main

import (
    "crypto/rand"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "time"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
    contractapi.Contract
}

const encryptionKey = "bioMTAKE_2024_encryption_key_32bytes!"

// User roles
const (
    RoleAdmin    = "admin"
    RoleDoctor   = "doctor"
    RolePatient  = "patient"
    RoleDevice   = "device"
)

// User structure for authentication
type User struct {
    UserID    string `json:"userId"`
    Role      string `json:"role"`
    Name      string `json:"name"`
    Email     string `json:"email"`
    CreatedAt string `json:"createdAt"`
    IsActive  bool   `json:"isActive"`
}

// Session tracking
type Session struct {
    SessionID  string `json:"sessionId"`
    UserID     string `json:"userId"`
    CreatedAt  string `json:"createdAt"`
    ExpiresAt  string `json:"expiresAt"`
    IsValid    bool   `json:"isValid"`
}

type Device struct {
    HPBIM string `json:"HPBIM"`
    PIDM  string `json:"PIDM"`
    RegisteredAt string `json:"registeredAt"`
    RegisteredBy string `json:"registeredBy"` // User who registered the device
}

type HealthRecord struct {
    RecordID     string `json:"recordId"`
    DeviceHPBIM  string `json:"deviceHpbm"`
    PatientID    string `json:"patientId"`
    DoctorID     string `json:"doctorId"` // Doctor who created the record
    Timestamp    string `json:"timestamp"`
    EncryptedData string `json:"encryptedData"`
    Nonce         string `json:"nonce"`
}

type HealthData struct {
    HeartRate     int     `json:"heartRate"`
    BloodPressure string  `json:"bloodPressure"`
    Temperature   float64 `json:"temperature"`
    OxygenLevel   float64 `json:"oxygenLevel"`
    Notes         string  `json:"notes"`
}

// Encryption functions (same as before)
func encryptData(data []byte, key string) (string, string) {
    nonce := make([]byte, 16)
    rand.Read(nonce)
    
    encrypted := make([]byte, len(data))
    for i := range data {
        encrypted[i] = data[i] ^ key[i%len(key)] ^ nonce[i%len(nonce)]
    }
    
    return base64.StdEncoding.EncodeToString(encrypted), 
           base64.StdEncoding.EncodeToString(nonce)
}

func decryptData(encryptedData, nonce, key string) ([]byte, error) {
    data, err := base64.StdEncoding.DecodeString(encryptedData)
    if err != nil {
        return nil, err
    }
    
    nonceBytes, err := base64.StdEncoding.DecodeString(nonce)
    if err != nil {
        return nil, err
    }
    
    decrypted := make([]byte, len(data))
    for i := range data {
        decrypted[i] = data[i] ^ key[i%len(key)] ^ nonceBytes[i%len(nonceBytes)]
    }
    
    return decrypted, nil
}

// Authentication functions
func (s *SmartContract) RegisterUser(
    ctx contractapi.TransactionContextInterface,
    userId string,
    role string,
    name string,
    email string,
) error {
    // Validate role
    validRoles := map[string]bool{RoleAdmin: true, RoleDoctor: true, RolePatient: true, RoleDevice: true}
    if !validRoles[role] {
        return fmt.Errorf("invalid role: %s", role)
    }

    // Check if user already exists
    existing, err := s.GetUser(ctx, userId)
    if err == nil && existing != nil {
        return fmt.Errorf("user already exists: %s", userId)
    }

    user := User{
        UserID:    userId,
        Role:      role,
        Name:      name,
        Email:     email,
        CreatedAt: time.Now().Format(time.RFC3339),
        IsActive:  true,
    }

    userJSON, err := json.Marshal(user)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState("USER_"+userId, userJSON)
}

func (s *SmartContract) GetUser(ctx contractapi.TransactionContextInterface, userId string) (*User, error) {
    userJSON, err := ctx.GetStub().GetState("USER_" + userId)
    if err != nil {
        return nil, err
    }
    if userJSON == nil {
        return nil, fmt.Errorf("user not found: %s", userId)
    }

    var user User
    err = json.Unmarshal(userJSON, &user)
    if err != nil {
        return nil, err
    }

    return &user, nil
}

func (s *SmartContract) CreateSession(ctx contractapi.TransactionContextInterface, userId string) (*Session, error) {
    user, err := s.GetUser(ctx, userId)
    if err != nil {
        return nil, err
    }
    if !user.IsActive {
        return nil, fmt.Errorf("user account is inactive: %s", userId)
    }

    sessionId := generateSessionID()
    now := time.Now()
    expiresAt := now.Add(24 * time.Hour) // 24-hour session

    session := Session{
        SessionID: sessionId,
        UserID:    userId,
        CreatedAt: now.Format(time.RFC3339),
        ExpiresAt: expiresAt.Format(time.RFC3339),
        IsValid:   true,
    }

    sessionJSON, err := json.Marshal(session)
    if err != nil {
        return nil, err
    }

    err = ctx.GetStub().PutState("SESSION_"+sessionId, sessionJSON)
    if err != nil {
        return nil, err
    }

    return &session, nil
}

func (s *SmartContract) ValidateSession(ctx contractapi.TransactionContextInterface, sessionId string) (*Session, error) {
    sessionJSON, err := ctx.GetStub().GetState("SESSION_" + sessionId)
    if err != nil {
        return nil, err
    }
    if sessionJSON == nil {
        return nil, fmt.Errorf("session not found: %s", sessionId)
    }

    var session Session
    err = json.Unmarshal(sessionJSON, &session)
    if err != nil {
        return nil, err
    }

    // Check if session is expired
    expiresAt, err := time.Parse(time.RFC3339, session.ExpiresAt)
    if err != nil {
        return nil, err
    }

    if time.Now().After(expiresAt) || !session.IsValid {
        return nil, fmt.Errorf("session expired or invalid: %s", sessionId)
    }

    return &session, nil
}

func generateSessionID() string {
    bytes := make([]byte, 32)
    rand.Read(bytes)
    return base64.StdEncoding.EncodeToString(bytes)[:32]
}

// Enhanced device registration with authentication
func (s *SmartContract) CreateAsset(
    ctx contractapi.TransactionContextInterface, 
    hpbm string, 
    pidm string,
    registeredBy string, // User ID who is registering the device
) error {
    // Validate user exists and has permission
    user, err := s.GetUser(ctx, registeredBy)
    if err != nil {
        return fmt.Errorf("user not found: %s", registeredBy)
    }
    if !user.IsActive {
        return fmt.Errorf("user account is inactive: %s", registeredBy)
    }

    exists, err := s.DeviceExists(ctx, hpbm)
    if err != nil {
        return err
    }
    if exists {
        return fmt.Errorf("IoMT device already exists: %s", hpbm)
    }

    device := Device{
        HPBIM: hpbm, 
        PIDM: pidm,
        RegisteredAt: time.Now().Format(time.RFC3339),
        RegisteredBy: registeredBy,
    }
    deviceJSON, err := json.Marshal(device)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState(hpbm, deviceJSON)
}

// Enhanced health record with doctor authentication
func (s *SmartContract) AddHealthRecord(
    ctx contractapi.TransactionContextInterface, 
    recordId string,
    deviceHpbm string,
    patientId string,
    doctorId string, // Doctor creating the record
    heartRate int,
    bloodPressure string,
    temperature float64,
    oxygenLevel float64,
    notes string,
) error {
    // Validate doctor exists and has doctor role
    doctor, err := s.GetUser(ctx, doctorId)
    if err != nil {
        return fmt.Errorf("doctor not found: %s", doctorId)
    }
    if doctor.Role != RoleDoctor {
        return fmt.Errorf("user is not a doctor: %s", doctorId)
    }

    exists, err := s.DeviceExists(ctx, deviceHpbm)
    if err != nil {
        return err
    }
    if !exists {
        return fmt.Errorf("IoMT device does not exist: %s", deviceHpbm)
    }

    healthData := HealthData{
        HeartRate:     heartRate,
        BloodPressure: bloodPressure,
        Temperature:   temperature,
        OxygenLevel:   oxygenLevel,
        Notes:         notes,
    }

    healthDataJSON, err := json.Marshal(healthData)
    if err != nil {
        return err
    }

    encryptedData, nonce := encryptData(healthDataJSON, encryptionKey)

    record := HealthRecord{
        RecordID:      recordId,
        DeviceHPBIM:   deviceHpbm,
        PatientID:     patientId,
        DoctorID:      doctorId,
        Timestamp:     time.Now().Format(time.RFC3339),
        EncryptedData: encryptedData,
        Nonce:         nonce,
    }

    recordJSON, err := json.Marshal(record)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState("HEALTH_RECORD_" + recordId, recordJSON)
}

// Existing query functions (updated to include authentication checks)
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, hpbm string) (*Device, error) {
    deviceJSON, err := ctx.GetStub().GetState(hpbm)
    if err != nil {
        return nil, fmt.Errorf("failed to read from world state: %v", err)
    }
    if deviceJSON == nil {
        return nil, fmt.Errorf("IoMT device does not exist: %s", hpbm)
    }

    var device Device
    err = json.Unmarshal(deviceJSON, &device)
    if err != nil {
        return nil, err
    }

    return &device, nil
}

func (s *SmartContract) DeviceExists(ctx contractapi.TransactionContextInterface, hpbm string) (bool, error) {
    deviceJSON, err := ctx.GetStub().GetState(hpbm)
    if err != nil {
        return false, fmt.Errorf("failed to read from world state: %v", err)
    }
    return deviceJSON != nil, nil
}

func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]*Device, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, err
    }
    defer resultsIterator.Close()

    var devices []*Device
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        var device Device
        err = json.Unmarshal(queryResponse.Value, &device)
        if err != nil {
            continue
        }
        devices = append(devices, &device)
    }

    if devices == nil {
        return []*Device{}, nil
    }

    return devices, nil
}

// Get health records with access control
func (s *SmartContract) GetHealthRecordsByPatient(ctx contractapi.TransactionContextInterface, patientId string) ([]map[string]interface{}, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, err
    }
    defer resultsIterator.Close()

    var records []map[string]interface{}
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        if len(queryResponse.Key) > 13 && queryResponse.Key[:13] == "HEALTH_RECORD" {
            var record HealthRecord
            err = json.Unmarshal(queryResponse.Value, &record)
            if err == nil && record.PatientID == patientId {
                decryptedData, err := decryptData(record.EncryptedData, record.Nonce, encryptionKey)
                if err == nil {
                    var healthData HealthData
                    json.Unmarshal(decryptedData, &healthData)
                    
                    records = append(records, map[string]interface{}{
                        "recordId":    record.RecordID,
                        "deviceHpbm":  record.DeviceHPBIM,
                        "patientId":   record.PatientID,
                        "doctorId":    record.DoctorID,
                        "timestamp":   record.Timestamp,
                        "heartRate":   healthData.HeartRate,
                        "bloodPressure": healthData.BloodPressure,
                        "temperature": healthData.Temperature,
                        "oxygenLevel": healthData.OxygenLevel,
                        "notes":       healthData.Notes,
                        "encrypted":   true,
                    })
                }
            }
        }
    }

    if records == nil {
        return []map[string]interface{}{}, nil
    }

    return records, nil
}

func (s *SmartContract) GetAllHealthRecords(ctx contractapi.TransactionContextInterface) ([]map[string]interface{}, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, err
    }
    defer resultsIterator.Close()

    var records []map[string]interface{}
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        if len(queryResponse.Key) > 13 && queryResponse.Key[:13] == "HEALTH_RECORD" {
            var record HealthRecord
            err = json.Unmarshal(queryResponse.Value, &record)
            if err == nil {
                decryptedData, err := decryptData(record.EncryptedData, record.Nonce, encryptionKey)
                if err == nil {
                    var healthData HealthData
                    json.Unmarshal(decryptedData, &healthData)
                    
                    records = append(records, map[string]interface{}{
                        "recordId":    record.RecordID,
                        "deviceHpbm":  record.DeviceHPBIM,
                        "patientId":   record.PatientID,
                        "doctorId":    record.DoctorID,
                        "timestamp":   record.Timestamp,
                        "heartRate":   healthData.HeartRate,
                        "bloodPressure": healthData.BloodPressure,
                        "temperature": healthData.Temperature,
                        "oxygenLevel": healthData.OxygenLevel,
                        "notes":       healthData.Notes,
                        "encrypted":   true,
                    })
                }
            }
        }
    }

    if records == nil {
        return []map[string]interface{}{}, nil
    }

    return records, nil
}

func main() {
    chaincode, err := contractapi.NewChaincode(&SmartContract{})
    if err != nil {
        fmt.Printf("Error creating biomtake chaincode: %v", err)
        return
    }

    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting biomtake chaincode: %v", err)
    }
}
