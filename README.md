# Controller Management System

A comprehensive Node.js application for managing network-enabled hardware controllers using UDP communication with a 64-byte packet format. The system provides both a Command-Line Interface (CLI) and a Web Service with REST API and WebSocket support.

## Features

- **UDP Communication**: Communicates with controllers on port 60000 using 64-byte packets
- **BCD Encoding/Decoding**: Handles Binary-Coded Decimal format for date/time operations
- **Controller Discovery**: Automatically discovers controllers on the network
- **Time Management**: Get and set controller time with BCD conversion
- **Network Configuration**: Configure controller IP, subnet mask, and gateway
- **Server Settings**: Manage receiving server configuration for data uploads
- **Dual Interface**: Both CLI and Web Service modes
- **Real-time Updates**: WebSocket support for live controller management
- **Data Persistence**: JSON-based configuration storage
- **Export/Import**: Support for CSV and JSON data formats

## Architecture

The application follows a layered architecture:

```
├── src/
│   ├── core/           # Core Logic Layer
│   │   ├── controller-api.js    # Main API functions
│   │   ├── packet-handler.js    # UDP packet handling & BCD utilities
│   │   └── config-manager.js    # JSON persistence
│   ├── cli/            # CLI Interface Layer
│   │   └── index.js             # Command-line interface
│   └── server/         # Web Service Layer
│       ├── index.js             # Express server
│       ├── api-routes.js        # REST API endpoints
│       └── websocket-handler.js # WebSocket functionality
├── config/
│   └── controllers.json         # Persisted controller data
└── app.js              # Main entry point
```

## Installation

1. Clone or download the project files
2. Install dependencies:
```bash
npm install
```

## Usage

### CLI Mode

Start the CLI interface:
```bash
npm run cli
# or
node app.js cli
```

#### CLI Commands

**Discovery:**
```bash
node app.js cli discover              # Discover controllers
node app.js cli discover -t 10        # Discovery with 10s timeout
```

**List Controllers:**
```bash
node app.js cli list                  # Table format
node app.js cli list -f json          # JSON format
node app.js cli list -f csv           # CSV format
```

**Get Settings:**
```bash
node app.js cli get time -c 12345     # Get time from controller 12345
node app.js cli get network -c 12345  # Get network config
node app.js cli get server -c 12345   # Get server config
```

**Set Settings:**
```bash
node app.js cli set time -c 12345     # Set time (interactive)
node app.js cli set network -c 12345  # Set network config
node app.js cli set server -c 12345   # Set server config
```

**Management:**
```bash
node app.js cli remove 12345          # Remove controller
node app.js cli clear                 # Clear all controllers
node app.js cli interactive           # Interactive mode
```

### Server Mode

Start the web server:
```bash
npm run server
# or
node app.js server
# or
node app.js server -p 8080            # Custom port
```

The server provides:
- **REST API**: `http://localhost:3000/api`
- **WebSocket**: `ws://localhost:3000`
- **Documentation**: `http://localhost:3000/docs`
- **Health Check**: `http://localhost:3000/health`

## API Reference

### REST API Endpoints

#### Discovery
- `POST /api/discover` - Discover controllers
  ```json
  {
    "timeout": 5000
  }
  ```

#### Controllers
- `GET /api/controllers` - List all controllers
- `GET /api/controllers/:id` - Get specific controller
- `DELETE /api/controllers/:id` - Remove controller
- `DELETE /api/controllers` - Clear all controllers

#### Time Operations
- `GET /api/controllers/:id/time` - Get controller time
- `POST /api/controllers/:id/time` - Set controller time
  ```json
  {
    "time": "2024-01-01T12:00:00Z"
  }
  ```

#### Network Configuration
- `POST /api/controllers/:id/network` - Set network config
  ```json
  {
    "ip": "192.168.1.100",
    "subnetMask": "255.255.255.0",
    "gateway": "192.168.1.1"
  }
  ```

#### Server Configuration
- `GET /api/controllers/:id/server` - Get server config
- `POST /api/controllers/:id/server` - Set server config
  ```json
  {
    "serverIp": "192.168.1.10",
    "port": 9001,
    "uploadInterval": 30
  }
  ```

#### Export/Import
- `GET /api/controllers/export/json` - Export as JSON
- `GET /api/controllers/export/csv` - Export as CSV
- `POST /api/controllers/import` - Import controllers

### WebSocket API

Connect to `ws://localhost:3000` and send JSON messages:

#### Discovery
```json
{
  "type": "discover",
  "data": { "timeout": 5000 },
  "requestId": "unique-id"
}
```

#### Commands
```json
{
  "type": "command",
  "command": "getTime",
  "data": { "controllerId": "12345" },
  "requestId": "unique-id"
}
```

**Available Commands:**
- `getTime` - Get controller time
- `setTime` - Set controller time
- `getServer` - Get server configuration
- `setServer` - Set server configuration
- `setNetwork` - Set network configuration
- `getControllers` - Get all controllers

#### Subscriptions
```json
{
  "type": "subscribe",
  "data": { "events": ["discovery_complete", "command_executed"] },
  "requestId": "unique-id"
}
```

## Protocol Specification

The application implements the Short Packet Format V3 specification:

### Packet Structure (64 bytes)
```
Byte 0:     Type (0x17)
Byte 1:     Function ID
Bytes 2-3:  Reserved (0x0000)
Bytes 4-7:  Device Serial Number (little-endian)
Bytes 8-39: Data (32 bytes)
Bytes 40-43: Sequence ID (optional)
Bytes 44-63: Extended Data (20 bytes)
```

### Function IDs
- `0x94` - Discover Controllers
- `0x96` - Set IP Address
- `0x32` - Get Time
- `0x30` - Set Time
- `0x90` - Set Receiving Server
- `0x92` - Get Receiving Server

### BCD Encoding
Date/time values use Binary-Coded Decimal format:
- **Decimal to BCD**: `BCD = decimal + (decimal / 10) * 6`
- **BCD to Decimal**: `decimal = BCD - (BCD / 16) * 6`

## Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev    # Server with auto-reload
```

### Project Structure
```
controller-management-system/
├── src/
│   ├── core/                   # Core business logic
│   ├── cli/                    # Command-line interface
│   └── server/                 # Web service
├── config/                     # Configuration files
├── tests/                      # Test files
├── docs/                       # Documentation
├── package.json
├── app.js                      # Main entry point
└── README.md
```

## Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS origin (default: *)

### Controller Configuration
Controllers are automatically saved to `config/controllers.json` when discovered.

## Troubleshooting

### Common Issues

1. **Controllers not discovered**
   - Check network connectivity
   - Ensure controllers are on port 60000
   - Try different broadcast addresses

2. **Permission errors**
   - Run with appropriate network permissions
   - Check firewall settings for UDP port 60000

3. **BCD conversion errors**
   - Verify date/time format
   - Check for valid date ranges

### Debug Mode
Set `NODE_ENV=development` for detailed error messages.

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Check server health at `/health`
