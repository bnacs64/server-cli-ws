# Installation Guide

## Prerequisites

### 1. Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/):
- **Recommended**: Node.js 18.x or later
- **Minimum**: Node.js 16.x

To verify installation:
```bash
node --version
npm --version
```

### 2. Install Dependencies

Navigate to the project directory and install required packages:
```bash
cd c:\Users\rdpadmin\Documents\server
npm install
```

This will install:
- `commander` - CLI command parsing
- `inquirer` - Interactive prompts
- `express` - Web server framework
- `ws` - WebSocket library
- `cors` - Cross-origin resource sharing
- `helmet` - Security middleware
- `morgan` - HTTP request logger

## Quick Start

### 1. Test the Installation

Run the test example to verify everything is working:
```bash
node test-example.js
```

### 2. Start CLI Mode

```bash
# Interactive mode
node app.js

# Direct commands
node app.js cli discover
node app.js cli list
```

### 3. Start Server Mode

```bash
# Default port 3000
node app.js server

# Custom port
node app.js server -p 8080
```

### 4. Access the Web Interface

Once the server is running:
- **API Documentation**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **REST API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3000

## Development Setup

### 1. Install Development Dependencies

```bash
npm install --save-dev nodemon jest
```

### 2. Development Scripts

Add to package.json scripts section:
```json
{
  "scripts": {
    "dev": "nodemon app.js server",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### 3. Run in Development Mode

```bash
npm run dev
```

## Network Configuration

### Firewall Settings

Ensure the following ports are open:
- **UDP 60000**: Controller communication
- **TCP 3000**: Web server (or your chosen port)

### Controller Network Requirements

Controllers must be:
- Connected to the same network or reachable via broadcast
- Listening on UDP port 60000
- Using the 64-byte packet format specified in the SDK

## Troubleshooting

### Common Issues

1. **"npm not found"**
   - Install Node.js from nodejs.org
   - Restart your terminal/command prompt

2. **"Permission denied" errors**
   - Run as administrator (Windows)
   - Use sudo (Linux/Mac)

3. **"Port already in use"**
   - Use a different port: `node app.js server -p 8080`
   - Kill the process using the port

4. **Controllers not discovered**
   - Check network connectivity
   - Verify firewall settings
   - Ensure controllers are powered on

### Debug Mode

Set environment variable for detailed logging:
```bash
# Windows
set NODE_ENV=development
node app.js server

# Linux/Mac
NODE_ENV=development node app.js server
```

## Production Deployment

### 1. Environment Variables

Create a `.env` file:
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

### 2. Process Manager

Use PM2 for production:
```bash
npm install -g pm2
pm2 start app.js --name "controller-server" -- server
pm2 startup
pm2 save
```

### 3. Reverse Proxy

Configure nginx or Apache to proxy requests:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Verification

After installation, verify everything works:

1. **Core functionality**:
   ```bash
   node test-example.js
   ```

2. **CLI mode**:
   ```bash
   node app.js cli --help
   ```

3. **Server mode**:
   ```bash
   node app.js server
   # Visit http://localhost:3000/health
   ```

4. **API endpoints**:
   ```bash
   curl http://localhost:3000/api/controllers
   ```

## Next Steps

1. Read the [README.md](README.md) for usage instructions
2. Check [examples/](examples/) for sample code
3. Review the API documentation at `/docs`
4. Test controller discovery and communication
