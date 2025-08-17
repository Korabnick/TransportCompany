import json
import os
from typing import Dict, Any, List, Optional
from pathlib import Path

class ConfigManager:
    """Менеджер конфигурации калькулятора"""
    
    def __init__(self, config_path: str = None):
        if config_path is None:
            # Определяем путь к конфигурации относительно корня проекта
            current_dir = Path(__file__).parent
            config_path = current_dir.parent / 'config' / 'calculator_config.json'
        
        self.config_path = Path(config_path)
        self._config = None
        self._load_config()
    
    def _load_config(self):
        """Загрузка конфигурации из файла"""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(f"Config file not found: {self.config_path}")
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self._config = json.load(f)
                
        except Exception as e:
            print(f"Error loading config: {e}")
            # Загружаем дефолтную конфигурацию
            self._config = self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Возвращает дефолтную конфигурацию"""
        return {
            "pricing": {
                "base_cost_per_km": 10.0,
                "duration_cost_per_hour": 100.0,
                "urgent_pickup_multiplier": 1.3,
                "loader_price_per_hour": 500.0
            },
            "vehicles": [],
            "calculator_limits": {
                "max_passengers": 20,
                "max_loaders": 10,
                "max_duration_hours": 24,
                "min_duration_hours": 1
            },
            "additional_services": {}
        }
    
    def reload_config(self):
        """Перезагрузка конфигурации"""
        self._load_config()
    
    def get_config(self) -> Dict[str, Any]:
        """Получить всю конфигурацию"""
        return self._config.copy()
    
    def get_pricing(self) -> Dict[str, float]:
        """Получить настройки цен"""
        return self._config.get('pricing', {}).copy()
    
    def get_vehicles(self) -> List[Dict[str, Any]]:
        """Получить список транспортных средств"""
        return self._config.get('vehicles', []).copy()
    
    def get_vehicle_by_id(self, vehicle_id: int) -> Optional[Dict[str, Any]]:
        """Получить транспортное средство по ID"""
        for vehicle in self._config.get('vehicles', []):
            if vehicle.get('id') == vehicle_id:
                return vehicle.copy()
        return None
    
    def get_calculator_limits(self) -> Dict[str, int]:
        """Получить лимиты калькулятора"""
        return self._config.get('calculator_limits', {}).copy()
    
    def get_additional_services(self) -> Dict[str, Dict[str, Any]]:
        """Получить дополнительные услуги"""
        return self._config.get('additional_services', {}).copy()
    
    def get_service_price(self, service_key: str) -> float:
        """Получить цену дополнительной услуги"""
        services = self.get_additional_services()
        return services.get(service_key, {}).get('price', 0.0)
    
    def validate_config(self) -> bool:
        """Валидация конфигурации"""
        try:
            required_sections = ['pricing', 'vehicles', 'calculator_limits']
            
            for section in required_sections:
                if section not in self._config:
                    print(f"Missing required section: {section}")
                    return False
            
            # Проверяем цены
            pricing = self._config['pricing']
            required_prices = ['base_cost_per_km', 'duration_cost_per_hour', 'urgent_pickup_multiplier', 'loader_price_per_hour']
            
            for price_key in required_prices:
                if price_key not in pricing or not isinstance(pricing[price_key], (int, float)):
                    print(f"Invalid or missing price: {price_key}")
                    return False
            
            # Проверяем транспорт
            vehicles = self._config['vehicles']
            if not isinstance(vehicles, list) or len(vehicles) == 0:
                print("Vehicles must be a non-empty list")
                return False
            
            required_vehicle_fields = ['id', 'name', 'price_per_hour', 'price_per_km', 'base_price']
            for vehicle in vehicles:
                for field in required_vehicle_fields:
                    if field not in vehicle:
                        print(f"Vehicle missing required field: {field}")
                        return False
            
            return True
            
        except Exception as e:
            print(f"Config validation error: {e}")
            return False
    
    def export_config_for_frontend(self) -> Dict[str, Any]:
        """Экспорт конфигурации для фронтенда"""
        return {
            'pricing': self.get_pricing(),
            'vehicles': self.get_vehicles(),
            'calculator_limits': self.get_calculator_limits(),
            'additional_services': self.get_additional_services()
        }

# Глобальный экземпляр менеджера конфигурации
config_manager = ConfigManager()
