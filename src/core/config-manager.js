const fs = require('fs').promises;
const path = require('path');

/**
 * Configuration Manager for Controller Data Persistence
 * Handles saving and loading discovered controllers to/from JSON file
 */
class ConfigManager {
    constructor(configPath = 'config/controllers.json') {
        this.configPath = configPath;
        this.configDir = path.dirname(configPath);
    }

    /**
     * Ensure config directory exists
     */
    async ensureConfigDir() {
        try {
            await fs.access(this.configDir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(this.configDir, { recursive: true });
            } else {
                throw error;
            }
        }
    }

    /**
     * Load controllers from JSON file
     */
    async loadControllers() {
        try {
            await this.ensureConfigDir();
            const data = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(data);
            return config.controllers || [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, return empty array
                return [];
            }
            throw error;
        }
    }

    /**
     * Save controllers to JSON file
     */
    async saveControllers(controllers) {
        await this.ensureConfigDir();
        
        const config = {
            lastUpdated: new Date().toISOString(),
            controllers: controllers
        };
        
        const data = JSON.stringify(config, null, 2);
        await fs.writeFile(this.configPath, data, 'utf8');
    }

    /**
     * Add or update a controller
     */
    async addController(controller) {
        const controllers = await this.loadControllers();
        
        // Check if controller already exists (by serial number)
        const existingIndex = controllers.findIndex(
            c => c.serialNumber === controller.serialNumber
        );
        
        if (existingIndex >= 0) {
            // Update existing controller
            controllers[existingIndex] = {
                ...controllers[existingIndex],
                ...controller,
                lastSeen: new Date().toISOString()
            };
        } else {
            // Add new controller
            controllers.push({
                ...controller,
                discoveredAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            });
        }
        
        await this.saveControllers(controllers);
        return controllers;
    }

    /**
     * Remove a controller by serial number
     */
    async removeController(serialNumber) {
        const controllers = await this.loadControllers();
        const filteredControllers = controllers.filter(
            c => c.serialNumber !== serialNumber
        );
        
        if (filteredControllers.length !== controllers.length) {
            await this.saveControllers(filteredControllers);
            return true;
        }
        
        return false; // Controller not found
    }

    /**
     * Get controller by serial number
     */
    async getController(serialNumber) {
        const controllers = await this.loadControllers();
        return controllers.find(c => c.serialNumber === serialNumber);
    }

    /**
     * Update controller's last seen timestamp
     */
    async updateLastSeen(serialNumber) {
        const controllers = await this.loadControllers();
        const controller = controllers.find(c => c.serialNumber === serialNumber);
        
        if (controller) {
            controller.lastSeen = new Date().toISOString();
            await this.saveControllers(controllers);
            return true;
        }
        
        return false;
    }

    /**
     * Clear all controllers
     */
    async clearControllers() {
        await this.saveControllers([]);
    }

    /**
     * Get controllers count
     */
    async getControllersCount() {
        const controllers = await this.loadControllers();
        return controllers.length;
    }

    /**
     * Get controllers with pagination
     */
    async getControllersPaginated(page = 1, limit = 10) {
        const controllers = await this.loadControllers();
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        return {
            controllers: controllers.slice(startIndex, endIndex),
            totalCount: controllers.length,
            page,
            limit,
            totalPages: Math.ceil(controllers.length / limit)
        };
    }

    /**
     * Search controllers by various criteria
     */
    async searchControllers(criteria) {
        const controllers = await this.loadControllers();
        
        return controllers.filter(controller => {
            if (criteria.serialNumber && controller.serialNumber !== criteria.serialNumber) {
                return false;
            }
            
            if (criteria.ip && controller.ip !== criteria.ip) {
                return false;
            }
            
            if (criteria.macAddress && controller.macAddress !== criteria.macAddress) {
                return false;
            }
            
            if (criteria.driverVersion && controller.driverVersion !== criteria.driverVersion) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Export controllers to different formats
     */
    async exportControllers(format = 'json') {
        const controllers = await this.loadControllers();
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(controllers, null, 2);
            
            case 'csv':
                if (controllers.length === 0) return '';
                
                const headers = Object.keys(controllers[0]).join(',');
                const rows = controllers.map(controller => 
                    Object.values(controller).map(value => 
                        typeof value === 'string' && value.includes(',') 
                            ? `"${value}"` 
                            : value
                    ).join(',')
                );
                
                return [headers, ...rows].join('\n');
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Import controllers from JSON data
     */
    async importControllers(data, merge = false) {
        let importedControllers;
        
        try {
            importedControllers = JSON.parse(data);
        } catch (error) {
            throw new Error('Invalid JSON data for import');
        }
        
        if (!Array.isArray(importedControllers)) {
            throw new Error('Imported data must be an array of controllers');
        }
        
        if (merge) {
            const existingControllers = await this.loadControllers();
            const mergedControllers = [...existingControllers];
            
            importedControllers.forEach(importedController => {
                const existingIndex = mergedControllers.findIndex(
                    c => c.serialNumber === importedController.serialNumber
                );
                
                if (existingIndex >= 0) {
                    mergedControllers[existingIndex] = {
                        ...mergedControllers[existingIndex],
                        ...importedController,
                        lastSeen: new Date().toISOString()
                    };
                } else {
                    mergedControllers.push({
                        ...importedController,
                        discoveredAt: new Date().toISOString(),
                        lastSeen: new Date().toISOString()
                    });
                }
            });
            
            await this.saveControllers(mergedControllers);
            return mergedControllers;
        } else {
            // Replace all controllers
            const controllersWithTimestamps = importedControllers.map(controller => ({
                ...controller,
                discoveredAt: controller.discoveredAt || new Date().toISOString(),
                lastSeen: new Date().toISOString()
            }));
            
            await this.saveControllers(controllersWithTimestamps);
            return controllersWithTimestamps;
        }
    }
}

module.exports = ConfigManager;
