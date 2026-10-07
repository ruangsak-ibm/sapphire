# Sapphire - Health Indicator Ingestion & Smart Dashboard

Automated Blood Pressure Device Sync & Logging system with intelligent health monitoring and trend analysis.

## Features

- **Device Management**: Register, manage, and monitor blood pressure devices
- **Automated Sync**: Seamless synchronization of readings from connected devices
- **Health Data Logging**: Persistent storage of blood pressure readings and health indicators
- **Smart Dashboard**: Real-time health status overview and analytics
- **Health Alerts**: Automatic detection and alerting of abnormal readings
- **Trend Analysis**: Long-term health trends and pattern recognition
- **Data Export**: Export readings in JSON or CSV format
- **REST API**: Complete RESTful API for integration with other systems

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Testing**: Node.js built-in test runner

## Installation

```bash
npm install
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified by `PORT` environment variable).

### Health Check

```bash
curl http://localhost:3000/health
```

## Testing

Run all tests:

```bash
node --test src/utils.test.js src/database.test.js src/deviceManager.test.js src/bloodPressureLogger.test.js src/healthIndicatorManager.test.js src/smartDashboard.test.js
```

## API Endpoints

### Device Management

#### Register a Device
```
POST /api/devices
Content-Type: application/json

{
  "name": "Home BP Monitor",
  "type": "blood_pressure",
  "manufacturer": "Omron",
  "model": "HEM-7120",
  "serial_number": "SN123456"
}
```

#### List All Devices
```
GET /api/devices?status=active
```

#### Get Device Details
```
GET /api/devices/{deviceId}
```

#### Update Device Status
```
PATCH /api/devices/{deviceId}/status
Content-Type: application/json

{
  "status": "inactive"
}
```

#### Delete Device
```
DELETE /api/devices/{deviceId}
```

### Blood Pressure Readings

#### Record a Reading
```
POST /api/readings
Content-Type: application/json

{
  "device_id": "device_xyz",
  "systolic": 120,
  "diastolic": 80,
  "pulse": 70,
  "notes": "After morning exercise"
}
```

#### Get a Reading
```
GET /api/readings/{readingId}
```

#### Get Device Readings
```
GET /api/devices/{deviceId}/readings?limit=50&from_date=2024-01-01
```

#### Get Latest Reading
```
GET /api/devices/{deviceId}/readings/latest
```

#### Get Reading Statistics
```
GET /api/devices/{deviceId}/readings/stats?timeframe=7d
```

Supported timeframes: `24h`, `7d`, `30d`, `90d`

#### Delete a Reading
```
DELETE /api/readings/{readingId}
```

### Health Indicators

#### Record an Indicator
```
POST /api/indicators
Content-Type: application/json

{
  "device_id": "device_xyz",
  "indicator_type": "oxygen_level",
  "value": 98.5,
  "unit": "%"
}
```

#### Get Device Indicators
```
GET /api/devices/{deviceId}/indicators?indicator_type=oxygen_level&limit=50
```

#### Delete Indicator
```
DELETE /api/indicators/{indicatorId}
```

### Smart Dashboard

#### Dashboard Overview
```
GET /api/dashboard/overview
```

Returns:
- Total active/inactive devices
- Total readings recorded
- Last sync time

#### Device Dashboard
```
GET /api/dashboard/device/{deviceId}
```

Returns:
- Device information
- Latest reading
- Statistics (7-day average)
- Recent health indicators

#### Health Alerts
```
GET /api/dashboard/device/{deviceId}/alerts
```

Alert types:
- `high_blood_pressure`: ≥140/90 mmHg
- `elevated_blood_pressure`: 120-139 / 80-89 mmHg
- `low_blood_pressure`: <90/<60 mmHg
- `high_pulse`: >100 bpm
- `low_pulse`: <60 bpm

#### Trend Analysis
```
GET /api/dashboard/device/{deviceId}/trends?timeframe=7d
```

#### Export Readings
```
GET /api/dashboard/device/{deviceId}/export?format=json
```

Formats: `json` or `csv`

## Blood Pressure Categories

According to medical guidelines, blood pressure is categorized as:

- **Normal**: < 120/80 mmHg
- **Elevated**: 120-129 / < 80 mmHg
- **High BP Stage 1**: 130-139 / 80-89 mmHg
- **High BP Stage 2**: ≥ 140 / ≥ 90 mmHg
- **Hypertensive Crisis**: > 180 / > 120 mmHg

## Data Validation

### Blood Pressure Readings
- Systolic: 0-300 mmHg (required)
- Diastolic: 0-200 mmHg (required)
- Pulse: 0-300 bpm (optional)
- Systolic must be >= Diastolic

### Devices
- Name and type are required
- Serial number must be unique
- Status can be: active, inactive, error

### Health Indicators
- Indicator type is required
- Value must be numeric
- Unit is optional

## Database Schema

### devices
- id (PRIMARY KEY)
- name
- type
- manufacturer
- model
- serial_number (UNIQUE)
- status
- last_sync
- created_at
- updated_at

### blood_pressure_readings
- id (PRIMARY KEY)
- device_id (FOREIGN KEY)
- systolic
- diastolic
- pulse
- measurement_time
- recorded_at
- notes

### health_indicators
- id (PRIMARY KEY)
- device_id (FOREIGN KEY)
- indicator_type
- value
- unit
- recorded_at

## Project Structure

```
src/
├── index.js                    # Main Express app
├── database.js                 # Database initialization and management
├── deviceManager.js            # Device registration and management
├── bloodPressureLogger.js      # Blood pressure data ingestion
├── healthIndicatorManager.js   # Health indicator tracking
├── smartDashboard.js           # Dashboard analytics and alerts
├── utils.js                    # Utility functions
├── routes/
│   ├── devices.js              # Device API routes
│   ├── readings.js             # Reading API routes
│   ├── indicators.js           # Indicator API routes
│   └── dashboard.js            # Dashboard API routes
└── *.test.js                   # Unit and integration tests
```

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Configuration

Set environment variables to customize:

- `PORT`: Server port (default: 3000)
- Database location can be modified in `src/database.js` (default: `data/health.db`)

## Security Considerations

- All inputs are validated before processing
- SQL injection is prevented through parameterized queries
- Blood pressure values are validated against medical standards
- Duplicate device serial numbers are prevented

## Future Enhancements

- User authentication and authorization
- Multi-user support with role-based access control
- Device firmware update management
- Advanced analytics and machine learning predictions
- Automated report generation
- Integration with external health services
- Mobile app support
- Real-time WebSocket updates
- Data encryption at rest and in transit

## License

ISC

## Contributing

Please ensure all tests pass before submitting pull requests:

```bash
node --test src/**/*.test.js
```

## Support

For issues or questions, please create an issue in the repository.
