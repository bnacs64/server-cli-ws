const WebSocket = require('ws');
const ControllerAPI = require('../core/controller-api');

/**
 * WebSocket Handler for Real-time Controller Management
 * Provides WebSocket functionality for live updates and command passthrough
 */
class WebSocketHandler {
    constructor(server) {
        this.api = new ControllerAPI();
        this.wss = new WebSocket.Server({ server });
        this.clients = new Set();
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
            
            this.clients.add(ws);
            
            // Send welcome message
            this.sendToClient(ws, {
                type: 'welcome',
                message: 'Connected to Controller Management WebSocket',
                timestamp: new Date().toISOString()
            });

            // Handle incoming messages
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(ws, message);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                    this.sendError(ws, 'Invalid message format', error.message);
                }
            });

            // Handle client disconnect
            ws.on('close', () => {
                console.log('WebSocket client disconnected');
                this.clients.delete(ws);
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });

        console.log('WebSocket server initialized');
    }

    async handleMessage(ws, message) {
        const { type, command, data, requestId } = message;

        try {
            switch (type) {
                case 'discover':
                    await this.handleDiscover(ws, data, requestId);
                    break;

                case 'command':
                    await this.handleCommand(ws, command, data, requestId);
                    break;

                case 'subscribe':
                    await this.handleSubscribe(ws, data, requestId);
                    break;

                case 'ping':
                    this.sendToClient(ws, {
                        type: 'pong',
                        requestId,
                        timestamp: new Date().toISOString()
                    });
                    break;

                default:
                    this.sendError(ws, 'Unknown message type', `Type '${type}' is not supported`, requestId);
            }
        } catch (error) {
            console.error('Message handling error:', error);
            this.sendError(ws, 'Command failed', error.message, requestId);
        }
    }

    async handleDiscover(ws, data, requestId) {
        const { timeout = 5000 } = data || {};
        
        // Notify all clients that discovery is starting
        this.broadcast({
            type: 'discovery_started',
            timeout,
            timestamp: new Date().toISOString()
        });

        try {
            const controllers = await this.api.discoverControllers(timeout);
            
            const response = {
                type: 'discovery_complete',
                success: true,
                controllers,
                count: controllers.length,
                requestId,
                timestamp: new Date().toISOString()
            };

            // Send response to requesting client
            this.sendToClient(ws, response);
            
            // Broadcast to all other clients
            this.broadcast(response, ws);

        } catch (error) {
            const errorResponse = {
                type: 'discovery_error',
                success: false,
                error: error.message,
                requestId,
                timestamp: new Date().toISOString()
            };

            this.sendToClient(ws, errorResponse);
            this.broadcast(errorResponse, ws);
        }
    }

    async handleCommand(ws, command, data, requestId) {
        const { controllerId } = data;

        if (!controllerId) {
            return this.sendError(ws, 'Missing controller ID', 'controllerId is required', requestId);
        }

        const controller = await this.api.getControllerBySerial(parseInt(controllerId));
        if (!controller) {
            return this.sendError(ws, 'Controller not found', `Controller ${controllerId} not found`, requestId);
        }

        let result;

        switch (command) {
            case 'getTime':
                result = await this.api.getControllerTime(controller);
                break;

            case 'setTime':
                const { time } = data;
                const newTime = time ? new Date(time) : new Date();
                if (isNaN(newTime.getTime())) {
                    return this.sendError(ws, 'Invalid time', 'Invalid time format', requestId);
                }
                result = await this.api.setControllerTime(controller, newTime);
                break;

            case 'getServer':
                result = await this.api.getReceivingServer(controller);
                break;

            case 'setServer':
                const { serverIp, port, uploadInterval = 0 } = data;
                if (!serverIp || !port) {
                    return this.sendError(ws, 'Missing parameters', 'serverIp and port are required', requestId);
                }
                result = await this.api.setReceivingServer(controller, { serverIp, port, uploadInterval });
                break;

            case 'setNetwork':
                const { ip, subnetMask, gateway } = data;
                if (!ip || !subnetMask || !gateway) {
                    return this.sendError(ws, 'Missing parameters', 'ip, subnetMask, and gateway are required', requestId);
                }
                result = await this.api.setControllerNetworkConfig(controller, { ip, subnetMask, gateway });
                break;

            case 'getControllers':
                result = { controllers: await this.api.getSavedControllers() };
                break;

            default:
                return this.sendError(ws, 'Unknown command', `Command '${command}' is not supported`, requestId);
        }

        this.sendToClient(ws, {
            type: 'command_response',
            command,
            success: true,
            result,
            requestId,
            timestamp: new Date().toISOString()
        });

        // Broadcast command execution to other clients (excluding the sender)
        this.broadcast({
            type: 'command_executed',
            command,
            controllerId,
            result,
            timestamp: new Date().toISOString()
        }, ws);
    }

    async handleSubscribe(ws, data, requestId) {
        const { events = [] } = data;
        
        // Store subscription preferences on the WebSocket object
        ws.subscriptions = new Set(events);
        
        this.sendToClient(ws, {
            type: 'subscription_confirmed',
            events,
            requestId,
            timestamp: new Date().toISOString()
        });
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    sendError(ws, error, details, requestId) {
        this.sendToClient(ws, {
            type: 'error',
            error,
            details,
            requestId,
            timestamp: new Date().toISOString()
        });
    }

    broadcast(message, excludeClient = null) {
        const messageStr = JSON.stringify(message);
        
        this.clients.forEach(client => {
            if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
                // Check if client is subscribed to this event type
                if (!client.subscriptions || client.subscriptions.has(message.type) || client.subscriptions.has('all')) {
                    client.send(messageStr);
                }
            }
        });
    }

    // Method to send notifications from external sources
    notifyClients(type, data) {
        this.broadcast({
            type,
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Get connected clients count
    getClientCount() {
        return this.clients.size;
    }

    // Get WebSocket server stats
    getStats() {
        return {
            connectedClients: this.clients.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    // Graceful shutdown
    close() {
        console.log('Closing WebSocket server...');
        
        // Notify all clients about shutdown
        this.broadcast({
            type: 'server_shutdown',
            message: 'Server is shutting down',
            timestamp: new Date().toISOString()
        });

        // Close all client connections
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close(1001, 'Server shutdown');
            }
        });

        // Close the WebSocket server
        this.wss.close(() => {
            console.log('WebSocket server closed');
        });
    }
}

module.exports = WebSocketHandler;
