/**
 * Менеджер конфигурации для фронтенда
 * Синхронизирует цены и параметры с backend
 */
class ConfigManager {
    constructor() {
        this.config = null;
        this.lastUpdate = null;
        this.updateInterval = 5 * 60 * 1000; // 5 минут
        this.init();
    }
    
    async init() {
        try {
            await this.loadConfig();
            this.startAutoUpdate();
        } catch (error) {
            console.error('Failed to initialize config manager:', error);
        }
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/api/v2/config/calculator');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                this.config = result.data;
                this.lastUpdate = Date.now();
                console.log('Configuration loaded successfully:', this.config);
                
                // Уведомляем о загрузке конфигурации
                this.notifyConfigLoaded();
                
                return this.config;
            } else {
                throw new Error(result.error || 'Failed to load configuration');
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw error;
        }
    }
    
    async reloadConfig() {
        try {
            const response = await fetch('/api/v2/config/reload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                // Перезагружаем конфигурацию
                await this.loadConfig();
                console.log('Configuration reloaded successfully');
                return true;
            } else {
                throw new Error(result.error || 'Failed to reload configuration');
            }
        } catch (error) {
            console.error('Error reloading configuration:', error);
            throw error;
        }
    }
    
    getPricing() {
        return this.config?.pricing || {};
    }
    
    getVehicles() {
        return this.config?.vehicles || [];
    }
    
    getVehicleById(id) {
        if (!this.config?.vehicles) return null;
        return this.config.vehicles.find(v => v.id === id) || null;
    }
    
    getCalculatorLimits() {
        return this.config?.calculator_limits || {};
    }
    
    getAdditionalServices() {
        return this.config?.additional_services || {};
    }
    
    getServicePrice(serviceKey) {
        const services = this.getAdditionalServices();
        return services[serviceKey]?.price || 0.0;
    }
    
    // Методы для расчета цен (синхронизированы с backend)
    calculateRoutePrice(distance, durationHours, urgentPickup = false) {
        const pricing = this.getPricing();
        if (!pricing) return null;
        
        const baseCostPerKm = pricing.base_cost_per_km || 10.0;
        const durationCostPerHour = pricing.duration_cost_per_hour || 100.0;
        const urgentMultiplier = urgentPickup ? (pricing.urgent_pickup_multiplier || 1.3) : 1.0;
        
        const distanceCost = distance * baseCostPerKm;
        const durationCost = durationHours * durationCostPerHour;
        const baseTotalCost = distanceCost + durationCost;
        const total = Math.round(baseTotalCost * urgentMultiplier);
        
        return {
            distance_cost: distanceCost,
            duration_cost: durationCost,
            base_total_cost: baseTotalCost,
            urgent_multiplier: urgentMultiplier,
            total: total
        };
    }
    
    calculateLoadersCost(loaders, durationHours) {
        const pricing = this.getPricing();
        if (!pricing) return 0;
        
        const loaderPricePerHour = pricing.loader_price_per_hour || 500.0;
        return loaders * loaderPricePerHour * durationHours;
    }
    
    calculateVehicleCost(vehicleId, durationHours) {
        const vehicle = this.getVehicleById(vehicleId);
        if (!vehicle) return 0;
        
        return vehicle.base_price + (vehicle.price_per_hour * durationHours);
    }
    
    // Проверка лимитов
    validatePassengers(passengers) {
        const limits = this.getCalculatorLimits();
        const maxPassengers = limits.max_passengers || 20;
        return passengers >= 0 && passengers <= maxPassengers;
    }
    
    validateLoaders(loaders) {
        const limits = this.getCalculatorLimits();
        const maxLoaders = limits.max_loaders || 10;
        return loaders >= 0 && loaders <= maxLoaders;
    }
    
    validateDuration(durationHours) {
        const limits = this.getCalculatorLimits();
        const minDuration = limits.min_duration_hours || 1;
        const maxDuration = limits.max_duration_hours || 24;
        return durationHours >= minDuration && durationHours <= maxDuration;
    }
    
    // Уведомления о загрузке конфигурации
    notifyConfigLoaded() {
        const event = new CustomEvent('configLoaded', {
            detail: { config: this.config }
        });
        document.dispatchEvent(event);
    }
    
    // Автообновление конфигурации
    startAutoUpdate() {
        setInterval(() => {
            this.checkForUpdates();
        }, this.updateInterval);
    }
    
    async checkForUpdates() {
        try {
            // Проверяем, нужно ли обновить конфигурацию
            if (this.shouldUpdate()) {
                await this.loadConfig();
            }
        } catch (error) {
            console.error('Error checking for config updates:', error);
        }
    }
    
    shouldUpdate() {
        // Простая логика - обновляем каждые 5 минут
        return !this.lastUpdate || (Date.now() - this.lastUpdate) > this.updateInterval;
    }
    
    // Получение актуальной конфигурации
    getConfig() {
        return this.config;
    }
    
    // Проверка готовности конфигурации
    isReady() {
        return this.config !== null;
    }
    
    // Ожидание загрузки конфигурации
    async waitForConfig() {
        if (this.isReady()) {
            return this.config;
        }
        
        return new Promise((resolve) => {
            const handler = (event) => {
                document.removeEventListener('configLoaded', handler);
                resolve(event.detail.config);
            };
            document.addEventListener('configLoaded', handler);
        });
    }
}

// Глобальный экземпляр менеджера конфигурации
const configManager = new ConfigManager();

// Экспорт для использования в других модулях
window.configManager = configManager;
