const express = require('express');
const ControllerAPI = require('../core/controller-api');

/**
 * REST API Routes for Controller Management
 * Provides HTTP endpoints for all controller operations
 */
class APIRoutes {
    constructor() {
        this.router = express.Router();
        this.api = new ControllerAPI();
        this.setupRoutes();
    }

    setupRoutes() {
        // Middleware for JSON parsing and error handling
        this.router.use(express.json());
        this.router.use(this.errorHandler.bind(this));

        // Health check
        this.router.get('/health', this.getHealth.bind(this));

        // Controller discovery
        this.router.post('/discover', this.postDiscover.bind(this));

        // Controllers list
        this.router.get('/controllers', this.getControllers.bind(this));
        this.router.delete('/controllers', this.deleteAllControllers.bind(this));

        // Individual controller operations
        this.router.get('/controllers/:id', this.getController.bind(this));
        this.router.delete('/controllers/:id', this.deleteController.bind(this));

        // Time operations
        this.router.get('/controllers/:id/time', this.getControllerTime.bind(this));
        this.router.post('/controllers/:id/time', this.setControllerTime.bind(this));

        // Network configuration
        this.router.post('/controllers/:id/network', this.setControllerNetwork.bind(this));

        // Server configuration
        this.router.get('/controllers/:id/server', this.getControllerServer.bind(this));
        this.router.post('/controllers/:id/server', this.setControllerServer.bind(this));

        // Export/Import
        this.router.get('/controllers/export/:format', this.exportControllers.bind(this));
        this.router.post('/controllers/import', this.importControllers.bind(this));
    }

    // Health check endpoint
    async getHealth(req, res) {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }

    // POST /api/discover - Trigger controller discovery
    async postDiscover(req, res) {
        try {
            const { timeout = 5000 } = req.body;
            
            const controllers = await this.api.discoverControllers(timeout);
            
            res.json({
                success: true,
                message: `Discovered ${controllers.length} controller(s)`,
                controllers,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // GET /api/controllers - Get all saved controllers
    async getControllers(req, res) {
        try {
            const { page = 1, limit = 10, format = 'json' } = req.query;
            
            if (format === 'csv') {
                const csvData = await this.api.configManager.exportControllers('csv');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="controllers.csv"');
                return res.send(csvData);
            }
            
            const result = await this.api.configManager.getControllersPaginated(
                parseInt(page),
                parseInt(limit)
            );
            
            res.json({
                success: true,
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // DELETE /api/controllers - Clear all controllers
    async deleteAllControllers(req, res) {
        try {
            await this.api.clearSavedControllers();
            
            res.json({
                success: true,
                message: 'All controllers cleared',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // GET /api/controllers/:id - Get specific controller
    async getController(req, res) {
        try {
            const serialNumber = parseInt(req.params.id);
            const controller = await this.api.getControllerBySerial(serialNumber);
            
            if (!controller) {
                return res.status(404).json({
                    success: false,
                    error: 'Controller not found',
                    timestamp: new Date().toISOString()
                });
            }
            
            res.json({
                success: true,
                controller,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // DELETE /api/controllers/:id - Remove specific controller
    async deleteController(req, res) {
        try {
            const serialNumber = parseInt(req.params.id);
            const removed = await this.api.removeController(serialNumber);
            
            if (!removed) {
                return res.status(404).json({
                    success: false,
                    error: 'Controller not found',
                    timestamp: new Date().toISOString()
                });
            }
            
            res.json({
                success: true,
                message: 'Controller removed',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // GET /api/controllers/:id/time - Get controller time
    async getControllerTime(req, res) {
        try {
            const serialNumber = parseInt(req.params.id);
            const controller = await this.api.getControllerBySerial(serialNumber);
            
            if (!controller) {
                return res.status(404).json({
                    success: false,
                    error: 'Controller not found',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.api.getControllerTime(controller);
            
            res.json({
                success: true,
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // POST /api/controllers/:id/time - Set controller time
    async setControllerTime(req, res) {
        try {
            const serialNumber = parseInt(req.params.id);
            const { time } = req.body;
            
            const controller = await this.api.getControllerBySerial(serialNumber);
            
            if (!controller) {
                return res.status(404).json({
                    success: false,
                    error: 'Controller not found',
                    timestamp: new Date().toISOString()
                });
            }
            
            const newTime = time ? new Date(time) : new Date();
            
            if (isNaN(newTime.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid time format',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.api.setControllerTime(controller, newTime);
            
            res.json({
                success: true,
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // POST /api/controllers/:id/network - Set controller network configuration
    async setControllerNetwork(req, res) {
        try {
            const serialNumber = parseInt(req.params.id);
            const { ip, subnetMask, gateway } = req.body;
            
            const controller = await this.api.getControllerBySerial(serialNumber);
            
            if (!controller) {
                return res.status(404).json({
                    success: false,
                    error: 'Controller not found',
                    timestamp: new Date().toISOString()
                });
            }
            
            if (!ip || !subnetMask || !gateway) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required network parameters: ip, subnetMask, gateway',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.api.setControllerNetworkConfig(controller, {
                ip,
                subnetMask,
                gateway
            });
            
            res.json({
                success: true,
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // GET /api/controllers/:id/server - Get receiving server configuration
    async getControllerServer(req, res) {
        try {
            const serialNumber = parseInt(req.params.id);
            const controller = await this.api.getControllerBySerial(serialNumber);
            
            if (!controller) {
                return res.status(404).json({
                    success: false,
                    error: 'Controller not found',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.api.getReceivingServer(controller);
            
            res.json({
                success: true,
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // POST /api/controllers/:id/server - Set receiving server configuration
    async setControllerServer(req, res) {
        try {
            const serialNumber = parseInt(req.params.id);
            const { serverIp, port, uploadInterval = 0 } = req.body;
            
            const controller = await this.api.getControllerBySerial(serialNumber);
            
            if (!controller) {
                return res.status(404).json({
                    success: false,
                    error: 'Controller not found',
                    timestamp: new Date().toISOString()
                });
            }
            
            if (!serverIp || !port) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required server parameters: serverIp, port',
                    timestamp: new Date().toISOString()
                });
            }
            
            const result = await this.api.setReceivingServer(controller, {
                serverIp,
                port,
                uploadInterval
            });
            
            res.json({
                success: true,
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // GET /api/controllers/export/:format - Export controllers
    async exportControllers(req, res) {
        try {
            const { format } = req.params;
            const data = await this.api.configManager.exportControllers(format);
            
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="controllers.csv"');
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="controllers.json"');
            }
            
            res.send(data);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // POST /api/controllers/import - Import controllers
    async importControllers(req, res) {
        try {
            const { data, merge = false } = req.body;
            
            if (!data) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing data parameter',
                    timestamp: new Date().toISOString()
                });
            }
            
            const controllers = await this.api.configManager.importControllers(data, merge);
            
            res.json({
                success: true,
                message: `Imported ${controllers.length} controller(s)`,
                controllers,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Error handling middleware
    errorHandler(error, req, res, next) {
        console.error('API Error:', error);
        
        if (res.headersSent) {
            return next(error);
        }
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = APIRoutes;
