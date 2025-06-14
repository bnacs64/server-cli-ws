const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const APIRoutes = require('./api-routes');
const WebSocketHandler = require('./websocket-handler');

/**
 * Express Server for Controller Management Web Service
 * Provides REST API and WebSocket endpoints
 */
class Server {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:"],
                },
            },
        }));

        // CORS middleware
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }));

        // Logging middleware
        this.app.use(morgan('combined'));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Static files middleware (for serving documentation or web interface)
        this.app.use('/static', express.static(path.join(__dirname, '../../public')));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Controller Management System',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
                endpoints: {
                    api: '/api',
                    websocket: '/ws',
                    health: '/health',
                    docs: '/docs'
                }
            });
        });

        // API routes
        const apiRoutes = new APIRoutes();
        this.app.use('/api', apiRoutes.getRouter());

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString(),
                websocket: {
                    connected_clients: this.wsHandler ? this.wsHandler.getClientCount() : 0
                }
            });
        });

        // API documentation endpoint
        this.app.get('/docs', (req, res) => {
            res.json({
                title: 'Controller Management System API',
                version: '1.0.0',
                description: 'REST API and WebSocket interface for managing network-enabled hardware controllers',
                endpoints: {
                    discovery: {
                        'POST /api/discover': 'Discover controllers on the network',
                    },
                    controllers: {
                        'GET /api/controllers': 'List all saved controllers',
                        'DELETE /api/controllers': 'Clear all controllers',
                        'GET /api/controllers/:id': 'Get specific controller',
                        'DELETE /api/controllers/:id': 'Remove specific controller',
                    },
                    time: {
                        'GET /api/controllers/:id/time': 'Get controller time',
                        'POST /api/controllers/:id/time': 'Set controller time',
                    },
                    network: {
                        'POST /api/controllers/:id/network': 'Set controller network configuration',
                    },
                    server: {
                        'GET /api/controllers/:id/server': 'Get receiving server configuration',
                        'POST /api/controllers/:id/server': 'Set receiving server configuration',
                    },
                    export_import: {
                        'GET /api/controllers/export/:format': 'Export controllers (json/csv)',
                        'POST /api/controllers/import': 'Import controllers',
                    }
                },
                websocket: {
                    endpoint: '/ws',
                    message_types: {
                        discover: 'Trigger controller discovery',
                        command: 'Execute controller command',
                        subscribe: 'Subscribe to event types',
                        ping: 'Ping server'
                    },
                    commands: [
                        'getTime', 'setTime', 'getServer', 'setServer', 
                        'setNetwork', 'getControllers'
                    ]
                }
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupWebSocket() {
        this.wsHandler = new WebSocketHandler(this.server);
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            
            if (res.headersSent) {
                return next(error);
            }
            
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
                timestamp: new Date().toISOString()
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.gracefulShutdown('SIGTERM');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.gracefulShutdown('SIGTERM');
        });

        // Handle process termination signals
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🚀 Controller Management Server started on port ${this.port}`);
                    console.log(`📡 REST API available at: http://localhost:${this.port}/api`);
                    console.log(`🔌 WebSocket available at: ws://localhost:${this.port}`);
                    console.log(`📚 API Documentation: http://localhost:${this.port}/docs`);
                    console.log(`❤️  Health Check: http://localhost:${this.port}/health`);
                    resolve();
                }
            });
        });
    }

    async stop() {
        return new Promise((resolve) => {
            console.log('Stopping server...');
            
            // Close WebSocket connections
            if (this.wsHandler) {
                this.wsHandler.close();
            }
            
            // Close HTTP server
            this.server.close(() => {
                console.log('Server stopped');
                resolve();
            });
        });
    }

    gracefulShutdown(signal) {
        console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
        
        this.stop().then(() => {
            console.log('Graceful shutdown completed');
            process.exit(0);
        }).catch((error) => {
            console.error('Error during shutdown:', error);
            process.exit(1);
        });
    }

    // Get server instance for testing
    getApp() {
        return this.app;
    }

    // Get server stats
    getStats() {
        return {
            port: this.port,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            websocket: this.wsHandler ? this.wsHandler.getStats() : null,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = Server;
