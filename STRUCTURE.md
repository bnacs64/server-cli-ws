# Project Structure

## 📁 Directory Organization

```
controller-management-system/
├── 📄 app.js                          # Main application entry point
├── 📄 package.json                    # Dependencies and npm scripts
├── 📄 README.md                       # Main documentation
├── 📄 .gitignore                      # Git ignore rules
├── 📄 run-tests.sh                    # Unix/Linux/macOS test launcher
├── 📄 main_sdk.txt                    # Original SDK specification
├── 📄 STRUCTURE.md                    # This file
│
├── 📁 config/                         # Configuration Files
│   └── 📄 controllers.json            # Persisted controller data
│
├── 📁 src/                            # Source Code
│   ├── 📁 core/                       # Core Logic Layer
│   │   ├── 📄 controller-api.js       # Main API functions
│   │   ├── 📄 packet-handler.js       # UDP communication & BCD utilities
│   │   └── 📄 config-manager.js       # JSON persistence manager
│   │
│   ├── 📁 cli/                        # CLI Interface Layer
│   │   └── 📄 index.js                # Command-line interface
│   │
│   └── 📁 server/                     # Web Service Layer
│       ├── 📄 index.js                # Express server
│       ├── 📄 api-routes.js           # REST API endpoints
│       └── 📄 websocket-handler.js    # WebSocket functionality
│
├── 📁 scripts/                        # Utility Scripts
│   ├── 📄 test-controller.js          # Main test script (cross-platform)
│   ├── 📄 test.bat                    # Windows test launcher
│   ├── 📄 start-cli.bat               # Windows CLI launcher
│   └── 📄 start-server.bat            # Windows server launcher
│
├── 📁 examples/                       # Usage Examples
│   ├── 📄 api-client-example.js       # HTTP API usage example
│   └── 📄 websocket-client-example.js # WebSocket usage example
│
├── 📁 docs/                           # Documentation
│   ├── 📄 INSTALLATION.md             # Installation guide
│   ├── 📄 TESTING_GUIDE.md            # Testing documentation
│   └── 📄 PROJECT_SUMMARY.md          # Project overview
│
└── 📁 logs/                           # Generated Files
    ├── 📄 .gitkeep                    # Ensures directory is tracked
    └── 📄 test_results_*.json         # Test results (generated)
```

## 🎯 Quick Access

### Testing
```bash
# Main test (recommended)
node scripts/test-controller.js

# Windows
scripts\test.bat

# Unix/Linux/macOS
./run-tests.sh

# npm script
npm test
```

### CLI Mode
```bash
# Interactive mode
node app.js

# Direct commands
node app.js cli discover

# Windows batch
scripts\start-cli.bat

# npm script
npm run cli
```

### Server Mode
```bash
# Start server
node app.js server

# Windows batch
scripts\start-server.bat

# npm script
npm run server
```

## 📋 File Descriptions

### Root Files
- **`app.js`** - Main application entry point, handles CLI and server modes
- **`package.json`** - Node.js package configuration and dependencies
- **`README.md`** - Main project documentation and usage guide
- **`.gitignore`** - Git ignore rules for clean repository
- **`run-tests.sh`** - Cross-platform test launcher script
- **`main_sdk.txt`** - Original SDK specification document

### Source Code (`src/`)
- **`core/controller-api.js`** - Main API class with all controller operations
- **`core/packet-handler.js`** - UDP communication and BCD encoding utilities
- **`core/config-manager.js`** - JSON-based persistence manager
- **`cli/index.js`** - Command-line interface implementation
- **`server/index.js`** - Express web server with middleware
- **`server/api-routes.js`** - REST API endpoint definitions
- **`server/websocket-handler.js`** - WebSocket real-time communication

### Scripts (`scripts/`)
- **`test-controller.js`** - Safe controller testing with auto-restore
- **`test.bat`** - Windows test launcher with dependency check
- **`start-cli.bat`** - Windows CLI mode launcher
- **`start-server.bat`** - Windows server mode launcher

### Examples (`examples/`)
- **`api-client-example.js`** - HTTP REST API usage examples
- **`websocket-client-example.js`** - WebSocket communication examples

### Documentation (`docs/`)
- **`INSTALLATION.md`** - Detailed installation and setup guide
- **`TESTING_GUIDE.md`** - Comprehensive testing documentation
- **`PROJECT_SUMMARY.md`** - Technical project overview

### Configuration (`config/`)
- **`controllers.json`** - Persisted controller data (auto-generated)

### Logs (`logs/`)
- **`test_results_*.json`** - Generated test results (ignored by Git)
- **`.gitkeep`** - Ensures directory exists in Git

## 🔧 Architecture Layers

### 1. Core Layer (`src/core/`)
- **Purpose**: Business logic and protocol implementation
- **Dependencies**: Node.js built-in modules only
- **Responsibilities**: UDP communication, BCD encoding, data persistence

### 2. CLI Layer (`src/cli/`)
- **Purpose**: Command-line interface
- **Dependencies**: commander.js, inquirer.js
- **Responsibilities**: User interaction, command parsing

### 3. Server Layer (`src/server/`)
- **Purpose**: Web service interface
- **Dependencies**: express.js, ws, cors, helmet, morgan
- **Responsibilities**: REST API, WebSocket, HTTP server

### 4. Scripts Layer (`scripts/`)
- **Purpose**: Utility and testing scripts
- **Dependencies**: Core layer only
- **Responsibilities**: Testing, cross-platform launchers

## 🚀 Development Workflow

### 1. Core Development
```bash
# Edit core functionality
src/core/

# Test changes
node scripts/test-controller.js
```

### 2. CLI Development
```bash
# Edit CLI interface
src/cli/

# Test CLI
node app.js cli
```

### 3. Server Development
```bash
# Edit server functionality
src/server/

# Test server
node app.js server
# Visit http://localhost:3000
```

### 4. Documentation
```bash
# Edit documentation
docs/

# Update README.md for main changes
```

## 📦 Build and Deployment

### Development
```bash
npm install
npm run dev
```

### Testing
```bash
npm test
npm run test:cli
```

### Production
```bash
npm install --production
npm start
```

This structure provides clear separation of concerns, easy navigation, and professional organization suitable for both development and production use.
